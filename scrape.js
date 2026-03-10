const fs = require('fs');
const { chromium } = require('playwright');

const SOLR_USER = process.env.SOLR_USER;
const SOLR_PASSWD = process.env.SOLR_PASSWD;
const AUTH = `${SOLR_USER}:${SOLR_PASSWD}`;

const EXPIRED_PHRASES = [
  'Anunțul nu mai este activ',
  'Anunțul a expirat',
  'Anunțul a fost șters',
  'Acest anunț nu mai este disponibil',
  'Anunțul nu a fost găsit',
  'Pagina nu a fost găsită',
  '404'
];

const DELAY_MS = 12000;

async function fetchOlxUrls() {
  const url = `https://solr.peviitor.ro/solr/job/select?q=url:*.olx.ro*&rows=3000&wt=json`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(AUTH).toString('base64')
    }
  });
  
  const data = await response.json();
  return data.response.docs.map(doc => doc.url);
}

async function validateUrl(page, url) {
  const result = {
    url: url,
    status: 'UNKNOWN',
    salary: null,
    workmode: null,
    tags: [],
    company: null,
    reason: '',
    evidence: []
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);

    for (const phrase of EXPIRED_PHRASES) {
      if (text.includes(phrase)) {
        result.status = 'EXPIRED';
        result.reason = `Found: "${phrase}"`;
        result.evidence.push(phrase);
        return result;
      }
    }

    const hasSuggestions = text.includes('Anunțuri similare') || text.includes('anunțuri similare');
    const hasMainContent = text.includes('Descriere') || text.includes('Detalii') || text.includes('Companie');
    
    if (hasSuggestions && !hasMainContent) {
      result.status = 'EXPIRED';
      result.reason = 'Similar ads shown, no main content';
      return result;
    }

    const salaryMatch = text.match(/(\d{3,6})\s*-\s*(\d{3,6})\s*(RON|EUR|lei|l|e)/i);
    if (salaryMatch) {
      const currency = salaryMatch[3].toUpperCase().replace('LEI', 'RON').replace('L', 'RON').replace('E', 'EUR');
      result.salary = `${salaryMatch[1]}-${salaryMatch[2]} ${currency}`;
      result.evidence.push(`Salary: ${result.salary}`);
    }

    const workmodePatterns = {
      'remote': /remote|muncă de la distanță|la distanță|telework/i,
      'hybrid': /hibrid|hybrid|part-time office/i,
      'on-site': /la sediu|on-site|la birou|prezență fizică/i
    };

    for (const [mode, pattern] of Object.entries(workmodePatterns)) {
      if (pattern.test(text)) {
        result.workmode = mode;
        result.evidence.push(`Workmode: ${mode}`);
        break;
      }
    }

    const title = await page.$eval('h1', el => el.textContent).catch(() => null);
    if (title) {
      result.evidence.push(`Title: ${title.substring(0, 50)}`);
    }

    result.status = 'ACTIVE';
    result.reason = 'Job page is active';

  } catch (error) {
    result.status = 'UNKNOWN';
    result.reason = `Error: ${error.message}`;
  }

  return result;
}

async function deleteFromSolr(url) {
  const response = await fetch(`https://solr.peviitor.ro/solr/job/update?commit=true`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(AUTH).toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ delete: [url] })
  });
  return response.ok;
}

async function updateJobInSolr(url, data) {
  const doc = { url: { set: url } };
  
  if (data.salary) doc.salary = { set: data.salary };
  if (data.workmode) doc.workmode = { set: data.workmode };
  if (data.tags && data.tags.length > 0) doc.tags = { set: data.tags };
  if (data.company) doc.company = { set: data.company };
  
  doc.status = { set: 'tested' };
  doc.vdate = { set: new Date().toISOString() };

  const response = await fetch(`https://solr.peviitor.ro/solr/job/update?commit=true`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(AUTH).toString('base64'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ add: { doc } })
  });
  return response.ok;
}

async function main() {
  console.log('Fetching OLX URLs from Solr...');
  const urls = await fetchOlxUrls();
  console.log(`Found ${urls.length} URLs`);

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    processed: 0,
    active: 0,
    expired: 0,
    unknown: 0,
    errors: []
  };

  for (const url of urls) {
    console.log(`\n[${results.processed + 1}/${urls.length}] Checking: ${url.substring(0, 60)}...`);
    
    const result = await validateUrl(page, url);
    
    if (result.status === 'EXPIRED') {
      console.log(`  → EXPIRED: ${result.reason}`);
      await deleteFromSolr(url);
      results.expired++;
    } else if (result.status === 'ACTIVE') {
      console.log(`  → ACTIVE: ${result.salary || 'no salary'}, ${result.workmode || 'no workmode'}`);
      await updateJobInSolr(url, result);
      results.active++;
    } else {
      console.log(`  → UNKNOWN: ${result.reason}`);
      results.unknown++;
    }

    results.processed++;
    
    if (results.processed < urls.length) {
      console.log(`  Waiting ${DELAY_MS/1000}s before next request...`);
      await page.waitForTimeout(DELAY_MS);
    }
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`Processed: ${results.processed}`);
  console.log(`Active: ${results.active}`);
  console.log(`Expired: ${results.expired}`);
  console.log(`Unknown: ${results.unknown}`);
}

main().catch(console.error);

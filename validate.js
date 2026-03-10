const fs = require('fs');
const { chromium } = require('playwright');

const SOLR_USER = process.env.SOLR_USER;
const SOLR_PASSWD = process.env.SOLR_PASSWD;

if (!SOLR_USER || !SOLR_PASSWD) {
  console.error('Please set SOLR_USER and SOLR_PASSWD environment variables');
  process.exit(1);
}

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

async function validateUrl(url) {
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

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const text = await page.evaluate(() => document.body.innerText);

    for (const phrase of EXPIRED_PHRASES) {
      if (text.includes(phrase)) {
        result.status = 'EXPIRED';
        result.reason = `Found: "${phrase}"`;
        result.evidence.push(phrase);
        await browser.close();
        return result;
      }
    }

    const hasSuggestions = text.includes('Anunțuri similare');
    const hasMainContent = text.includes('Descriere') || text.includes('Detalii') || text.includes('Companie');
    
    if (hasSuggestions && !hasMainContent) {
      result.status = 'EXPIRED';
      result.reason = 'Similar ads shown, no main content';
      await browser.close();
      return result;
    }

    const salaryMatch = text.match(/(\d{3,6})\s*-\s*(\d{3,6})\s*(RON|EUR|lei|l|e)/i);
    if (salaryMatch) {
      let currency = salaryMatch[3].toUpperCase();
      currency = currency.replace('LEI', 'RON').replace(/^L$/, 'RON').replace(/^E$/, 'EUR');
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
    
    await browser.close();
    return result;

  } catch (error) {
    if (browser) await browser.close();
    result.status = 'UNKNOWN';
    result.reason = `Error: ${error.message}`;
    return result;
  }
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
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node validate.js <olx-url>');
    console.error('Example: node validate.js "https://www.olx.ro/oferta/loc-de-munca/..."');
    process.exit(1);
  }

  console.log(`Validating: ${url}\n`);
  
  const result = await validateUrl(url);
  
  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.status === 'EXPIRED') {
    console.log('\nDeleting from Solr...');
    await deleteFromSolr(url);
    console.log('Done.');
  } else if (result.status === 'ACTIVE') {
    console.log('\nUpdating Solr...');
    await updateJobInSolr(url, result);
    console.log('Done.');
  }
}

main().catch(console.error);

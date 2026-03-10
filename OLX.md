# OLX Website Handling

## CAPTCHA Handling
- **IMPORTANT**: NEVER try to bypass CAPTCHA
- Use Chrome DevTools MCP for real browser
- Wait 10-15 seconds between requests to mimic human behavior
- If CAPTCHA encountered:
  1. Close the browser
  2. Wait 5 seconds
  3. Retry with a different user-agent in a new fresh profile (like a guest user in Chrome)
  4. If still CAPTCHA → wait a bit longer, then retry again
  5. Maximum 3 retry attempts, then give up - log and skip, continue with next URL

## Important Rules
1. Always use Chrome DevTools (not HTTP) for OLX pages
2. Never reveal credentials in output (use placeholders)
3. Company name = Legal name (from Trade Register), not brand
4. CIF is unique identifier - same company name in different counties = different CIF
5. Tags: lowercase, no diacritics, max 10
6. Salary format: "MIN-MAX CURRENCY" (e.g., "3300RON - 4500RON")
7. Always verify Solr updates by querying the job after updating

## Session Notes (March 10, 2026)
- Chrome must be running with:
  ```cmd
  chrome --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug-profile"
  ```
- Solr credentials: solr:SolrRocks
- Playwright installed for browser automation
- Scripts:
  - validate.js - Test single URL
  - scrape.js - Batch process all URLs (12s delay between requests)

## Session Notes (March 10, 2026)
1. Set credentials and test with one URL
2. Run batch scrape to validate all 2746 URLs
3. Extract salary, workmode, tags from active jobs
4. Find CIF for companies (search: "COMPANY NAME CIF Romania")
5. Update company core in Solr

const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const credentials = require('../credentials.json');

const companies = [
  'GitLab', 'Slack', 'Qualtrics', 'Amplitude', 'PagerDuty',
  'Miro', 'Snowflake', 'Zscaler', 'Datadog', 'Instacart'
];

async function scrapeNews() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const allResults = [];

  for (const company of companies) {
    const query = encodeURIComponent(`${company} news this week`);
    const url = `https://www.google.com/search?q=${query}&tbm=nws&tbs=qdr:w`;

    console.log(`🔍 Scraping: ${company}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('div.lSfe4c', { timeout: 8000 });

    const results = await page.evaluate((company) => {
      const cards = Array.from(document.querySelectorAll('div.lSfe4c'));

      return cards.map(card => {
        const linkEl = card.closest('a');
        const headline = card.querySelector('.n0jPhd')?.innerText || '';
        const snippet = card.querySelector('.GI74Re')?.innerText || '';
        const source = card.querySelector('.NUnG9d')?.innerText || '';
        const published = card.querySelector('.OSrXXb span')?.innerText || '';
        const link = linkEl?.href || '';

        return {
          company,
          headline,
          link,
          snippet,
          source,
          published
        };
      }).filter(a => a.headline && a.link);
    }, company);

    allResults.push(...results);
  }

  await browser.close();
  return allResults;
}

async function uploadToGoogleSheets(data) {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1_nGXdEWrM6CbUV_aEbGKKjz93D5ALebUx1sRUWrTTZk'; // from your Google Sheet URL

  const values = [
    ['Company', 'Headline', 'Link', 'Snippet', 'Source', 'Published'],
    ...data.map(d => [d.company, d.headline, d.link, d.snippet, d.source, d.published])
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'News!A1',
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  console.log('✅ Data uploaded to Google Sheets.');
}

(async () => {
  const scrapedData = await scrapeNews();
  console.log(`✅ Scraped ${scrapedData.length} articles.`);
  await uploadToGoogleSheets(scrapedData);
})();
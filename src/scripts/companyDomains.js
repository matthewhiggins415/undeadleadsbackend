require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const puppeteer = require('puppeteer');

// Google Sheets setup
const SHEET_ID = '1_nGXdEWrM6CbUV_aEbGKKjz93D5ALebUx1sRUWrTTZk';
const SHEET_NAME = 'Leads';

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function findDomain(company) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const query = `site:${company} official website`;
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.result__url', { timeout: 5000 });

    const domain = await page.$eval('.result__url', el => {
      const raw = el.textContent.trim();
      const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
      return match ? match[1] : '';
    });

    await browser.close();
    return domain;
  } catch (err) {
    console.warn(`⚠️ Could not find domain for "${company}": ${err.message}`);
    await browser.close();
    return 'NO_DOMAIN';
  }
}

async function enrichMissingDomains() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Read columns G and H
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!G2:H`,
  });

  const rows = readRes.data.values || [];

  const updates = [];

  for (let i = 0; i < rows.length; i++) {
    const [company, domain] = rows[i];

    // Skip rows that already have a domain
    if (domain && domain !== 'NO_DOMAIN') continue;
    if (!company || company === 'NO_COMPANY') continue;

    console.log(`🔍 Finding domain for "${company}" (row ${i + 2})`);
    const newDomain = await findDomain(company);

    // Store row index (starting from 2) and the domain
    updates.push({ row: i + 2, domain: newDomain });
  }

  // Write updates back to the sheet
  for (const { row, domain } of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!H${row}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[domain]] }
    });
    console.log(`✅ Row ${row}: Set domain to "${domain}"`);
  }

  console.log(`🎉 Finished updating ${updates.length} domains.`);
}

enrichMissingDomains();
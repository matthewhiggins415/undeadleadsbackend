require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const credentials = require('../credentials.json');
const { OpenAI } = require('openai');

puppeteer.use(StealthPlugin());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const spreadsheetId = '1_nGXdEWrM6CbUV_aEbGKKjz93D5ALebUx1sRUWrTTZk';
const COOKIE_PATH = './cookies.json';

if (!fs.existsSync('./screenshots')) fs.mkdirSync('./screenshots');

function randomDelay(min = 3000, max = 7000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`⏳ Waiting for ${delay} ms...`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Leads!A2:H',
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.warn('⚠️ No leads found in the sheet.');
    return [];
  }

  return rows.map((row, i) => ({
    rowIndex: i + 2,
    linkedinLink: row[0] || '',
    fullName: row[2] || '',
    firstName: row[3] || '',
    lastName: row[4] || '',
    title: row[5] || '',
    company: row[6] || '',
    companyDomain: row[7] || '',
  })).filter(r => r.linkedinLink && (!r.companyDomain || r.companyDomain === 'NO_DOMAIN'));
}

async function updateSheetRow(rowIndex, newTitle, newCompany, newDomain) {
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const values = [[newTitle, newCompany, newDomain]];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Leads!F${rowIndex}:H${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log(`✅ Row ${rowIndex} updated`);
}

async function waitForEnterKey() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('🔐 Please log into LinkedIn in the opened browser, then press ENTER to continue...\n', () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  const leads = await getSheetData();
  if (leads.length === 0) {
    console.log('No leads require domain enrichment. Exiting.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Load cookies if available
  if (fs.existsSync(COOKIE_PATH)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
      await page.setCookie(...cookies);
      console.log('🍪 Loaded cookies from file');
    } catch (err) {
      console.warn('⚠️ Failed to load cookies:', err.message);
    }
  }

  await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded' });

  // Check login status
  if (page.url().includes('/login')) {
    console.log('🔐 Cookies invalid or missing — please log in manually');
    await waitForEnterKey();

    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log('💾 Cookies saved for future sessions');
  } else {
    console.log('✅ Already logged in using saved cookies');
  }

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  ];

  for (const [i, lead] of leads.entries()) {
    if (i % 3 === 0) {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(ua);
      console.log(`🧑‍💻 Switched user agent to: ${ua}`);
    }

    const { linkedinLink, rowIndex } = lead;
    console.log(`📸 (${i + 1}/${leads.length}) Visiting: ${linkedinLink}`);

    try {
      await randomDelay(2000, 5000);
      await page.goto(linkedinLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(1500, 4000);
      await randomDelay(2000, 5000);
    } catch (err) {
      console.warn(`❌ Error with ${linkedinLink}: ${err.message}`);
      await randomDelay(3000, 6000);
    }
  }

  await browser.close();
})();
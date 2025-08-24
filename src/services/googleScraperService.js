const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
require('dotenv').config({ quiet: true });
const { OpenAI } = require('openai');

puppeteer.use(StealthPlugin());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let io; // socket.io instance
let captchaResolve = null; // promise resolver for captcha

// --- Socket.io injection from server.js ---
function setSocketIO(newIO) {
  io = newIO;
}

// --- Allow server.js to resume scraper when user solves captcha ---
function continueScraping() {
  if (captchaResolve) {
    captchaResolve();
    captchaResolve = null;
  }
}

// --- Google Sheets append ---
const appendToGoogleSheets = async (data, spreadsheetId, sheetName, oauth2Client) => {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const values = data.map(d => [
    d.linkedinLink || '',
    d.fullName || '',
    d.firstName || '',
    d.lastName || '',
    d.title || '',
    d.company || '',
    d.companyDomain || ''
  ]);

  if (!values.length) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `Sheet1!A:H`, // ⚠️ TODO: replace with actual sheetName if needed
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });

  console.log(`✅ Appended ${data.length} rows to Google Sheets.`);
};

// --- OpenAI parsing ---
const getChatGPTData = async (snippetBatch) => {
  const systemPrompt = `Extract and return as JSON an array of people in the following format:

[
  {
      "linkedinLink": "",
      "fullName": "",
      "firstName": "",
      "lastName": "",
      "title": "",
      "company": "",
      "companyDomain": ""
  }
]

Make your best effort to return the official domain of the company based on the person's title and company name. For example:
- Netflix → netflix.com
- Amazon Studios → amazon.com
- Paramount Pictures → paramount.com

If unsure, return "NO_DOMAIN". Use all fields.`;

  const userPrompt = snippetBatch.map((s, i) =>
    `${i + 1}. ${s.text} LINK: ${s.link}`
  ).join('\n\n');

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    });

    const raw = chat.choices[0].message.content;
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']');
    const jsonString = raw.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    console.error(`❌ Failed to parse OpenAI response:\n${err.message}`);
    return [];
  }
};

// --- Scraper core ---
const scrapeLeads = async (body, spreadsheetId, oauth2Client) => {
  console.log("req.body: ", body, "Spreadsheet ID:", spreadsheetId);

  const {
    query,
    sheetName,
    titleString,
    keywordString,
    locationString,
    numPages
  } = body;

  // 1️⃣ Build the search query
  let SEARCH_QUERY;
  if (query && query.trim() !== "") {
    SEARCH_QUERY = query;
  } else {
    const safeTitle = titleString || '("VP" OR "CTO" OR "Director" OR "Head of" OR "Executive Producer")';
    const safeKeyword = keywordString || '("video streaming" OR "streaming video" OR "streaming platform" OR "FAST channel" OR "FAST channels" OR "OTT platform")';
    const safeLocation = locationString || '("US")';

    SEARCH_QUERY = `site:linkedin.com/in/ ${safeTitle} ${safeKeyword} ${safeLocation}`;
  }

  console.log(`🔍 Using Google search query: ${SEARCH_QUERY}`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  const page = await browser.newPage();

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
  ];

  // 2️⃣ Paginate
  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const start = pageNum * 10;
    const encodedQuery = encodeURIComponent(SEARCH_QUERY);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&start=${start}`;

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(randomUserAgent);

    console.log(`🔍 Google Page ${pageNum + 1}: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // 3️⃣ CAPTCHA check
    const isCaptcha = await page.evaluate(() => {
      return !!document.querySelector('form#captcha-form') ||
        document.body.innerText.includes('unusual traffic');
    });

    if (isCaptcha) {
      console.warn('⚠️ CAPTCHA detected! Waiting for user via socket...');

      if (io) {
        console.log(' io emitting captchaRequired');
        io.emit("captchaRequired");
      }

      // wait until user clicks "Continue"
      await new Promise((res) => {
        captchaResolve = res;
      });
    }

    // 4️⃣ Scrape snippets
    const snippets = await page.evaluate(() => {
      const clean = txt => txt?.replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('div.N54PNb')).map(block => {
        const linkEl = block.querySelector('a.zReHs');
        const snippetEl = block.querySelector('div.VwiC3b');
        const link = linkEl?.href || '';
        const text = clean(snippetEl?.innerText || '');
        return { link, text };
      }).filter(r => r.link.includes('linkedin.com/in/'));
    });

    console.log(`📄 Collected ${snippets.length} snippets`);

    // 5️⃣ Send to OpenAI in batches
    const batchSize = 10;
    for (let i = 0; i < snippets.length; i += batchSize) {
      const batch = snippets.slice(i, i + batchSize);
      const parsed = await getChatGPTData(batch);
      console.log('🧠 Processed batch', i / batchSize + 1);
      await appendToGoogleSheets(parsed, spreadsheetId, sheetName, oauth2Client);
    }

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
  }

  await browser.close();
};

// --- Exports ---
module.exports = {
  setSocketIO,
  scrapeLeads,
  continueScraping
};
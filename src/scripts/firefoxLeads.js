require('dotenv').config({ quiet: true });
const { firefox } = require('playwright');
const { google } = require('googleapis');
const readline = require('readline');
const credentials = require('../credentials.json');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SEARCH_QUERY = `site:linkedin.com/in/ ("VP" OR "CTO" OR "Director" OR "Head of" OR "Executive Producer") ("video streaming" OR "streaming video" OR "streaming platform") ("Los Angeles")`;
const spreadsheetId = '1_nGXdEWrM6CbUV_aEbGKKjz93D5ALebUx1sRUWrTTZk';

function waitForUserInput(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function appendToGoogleSheets(data) {
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const values = data.map(d => [
    d.linkedinLink || '',
    d.location || '',
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
    range: 'Leads!A:H',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });

  console.log(`✅ Appended ${data.length} rows to Google Sheets.`);
}

async function getChatGPTData(snippetBatch) {
  const systemPrompt = `Extract and return as JSON an array of people in the following format:

[
  {
      "linkedinLink": "",
      "location": "",
      "fullName": "",
      "firstName": "",
      "lastName": "",
      "title": "",
      "company": "",
      "companyDomain": ""
  }
]

Make your best effort to return the official domain of the company based on the person's title and company name. If unsure, return "NO_DOMAIN".`;

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
}

(async () => {
  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (let pageNum = 0; pageNum < 11; pageNum++) {
    const start = pageNum * 10;
    const query = encodeURIComponent(SEARCH_QUERY);
    const searchUrl = `https://www.google.com/search?q=${query}&start=${start}`;

    console.log(`🔍 Google Page ${pageNum + 1}: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const isCaptcha = await page.evaluate(() => {
      return !!document.querySelector('form#captcha-form') ||
             document.body.innerText.includes('unusual traffic');
    });

    if (isCaptcha) {
      console.warn('⚠️ CAPTCHA detected! Please solve it manually in the browser.');
      await waitForUserInput('🛑 Once done, press Enter to continue...');
    }

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

    const batchSize = 10;
    for (let i = 0; i < snippets.length; i += batchSize) {
      const batch = snippets.slice(i, i + batchSize);
      const parsed = await getChatGPTData(batch);
      console.log('🧠 Processed batch', i / batchSize + 1);
      await appendToGoogleSheets(parsed);
    }

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
  }

  await browser.close();
})();
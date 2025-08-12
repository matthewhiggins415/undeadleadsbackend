require('dotenv').config({ quiet: true });
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

puppeteer.use(StealthPlugin());

async function loginToLinkedIn() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

  console.log('🔐 Logging in to LinkedIn...');

  await page.type('#username', process.env.LINKEDIN_EMAIL, { delay: 50 });
  await page.type('#password', process.env.LINKEDIN_PASSWORD, { delay: 50 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
  ]);

  console.log('✅ Logged in!');
  return { browser, page };
}

async function getLeads() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // Make sure this file is in your project root
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Leads',
  });
  
  const rows = res.data.values;

  if (!rows || rows.length === 0) {
    console.log('❌ No leads found.');
    return [];
  }
  
  // Get header and data rows
  const header = rows[0];
  const data = rows.slice(1);
  
  return data;
}

async function extractFromScreenshotBuffer(buffer) {
  const base64Image = buffer.toString('base64');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant that extracts structured professional data from LinkedIn profile screenshots.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `From this LinkedIn screenshot, extract the following fields from the person's most recent job experience:
            - location
            - job title
            - company name
            - company domain (guess if not visible)
            
            Return the result as a JSON object with keys: location, title, company, domain.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 200,
  });
  
  const rawContent = response.choices[0].message.content;

  let extractedInfo;
  try {
    extractedInfo = JSON.parse(rawContent);
  } catch (e) {
    console.warn('⚠️ Failed to parse JSON, returning raw response instead');
    extractedInfo = { raw: rawContent };
  }

  return extractedInfo;
}

async function searchLeads(page, leads) {
  const searchSelector = 'input[placeholder="Search"]';
  
  for (const lead of leads) {
    console.log(`\n==============================`);
    console.log(`lead before enrichment:`)
    console.log(`Lead Name: ${lead[3]} ${lead[4]}`);
    console.log(`LinkedIn: ${lead[0]}`);
    console.log(`Location: ${lead[1]}`);
    console.log(`Title: ${lead[5]}`);
    console.log(`Company: ${lead[6]}`);
    console.log(`Domain: ${lead[7]}`);
    console.log(`==============================\n`);

    try {
      await page.waitForSelector(searchSelector, { timeout: 10000 });
      await page.click(searchSelector, { clickCount: 3 });
      const searchUrl = lead[0];
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 3000));

      // Step 1: Scroll to Experience section
    //   await page.evaluate(() => {
    //     const spans = Array.from(document.querySelectorAll('span[aria-hidden="true"]'));
    //     const experienceSpan = spans.find(span => span.textContent.trim() === 'Experience');
    //     if (experienceSpan) {
    //       const section = experienceSpan.closest('section');
    //       if (section) {
    //         section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    //       }
    //     }
    //   });
  
      // Step 2: Wait for scroll to complete
    //   await new Promise(resolve => setTimeout(resolve, 1000)); 
    // wait for smooth scroll
  
      // Step 3: Scroll up 150px
    //   await page.evaluate(() => {
    //     window.scrollBy(0, -150);
    //   });
  
      // Final pause for stability
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Pause before screenshot
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create file name from first and last name
    //   const fileName = `${lead.row[3] || 'NoFirst'}_${lead.row[4] || 'NoLast'}`.replace(/\s+/g, '_');
    //   const screenshotPath = `screenshots/${fileName}.png`;

      // Take screenshot
      const screenshotBuffer = await page.screenshot({ 
        type: 'png', 
        fullPage: 'true'
      });

      // send screenshot to chatgpt to get information 
      const result = await extractFromScreenshotBuffer(screenshotBuffer);

      console.log(`after enrichment: ${JSON.stringify(result)}`)

      // ask if correct person
      // direct data back into sheet

      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    } catch (err) {
      console.error(`⚠️ Failed search for ${lead[0]}:`, err.message);
    }
  }
}

async function main() {
  const { browser, page } = await loginToLinkedIn();

  const delay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
  console.log(`⏳ Waiting ${delay}ms before clicking search...`);
  await new Promise(resolve => setTimeout(resolve, delay));

  // Select search bar using the exact class and attributes
  const searchSelector = 'input[placeholder="Search"]';

  await page.waitForSelector(searchSelector, { timeout: 10000 });
  await page.click(searchSelector);
  console.log('🔍 Clicked on the search bar');

  const leads = await getLeads();

  console.log(`NUM OF LEADS: ${leads.length}`)

  await searchLeads(page, leads);

  // Optional: Type a search term
  // const query = 'CFO automation software';
  // await page.keyboard.type(query, { delay: 50 });
  // console.log(`⌨️ Typed: "${query}"`);

  // Optional: Press Enter
  // await page.keyboard.press('Enter');
  // console.log('🔎 Submitted search');

  // Optional: Keep browser open for debugging
  // await browser.close();
}

main();
require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const axios = require('axios');

// Load Google credentials
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = '1_nGXdEWrM6CbUV_aEbGKKjz93D5ALebUx1sRUWrTTZk';
const SHEET_NAME = 'Leads';
const HUNTER_API_KEY = process.env.HUNTER_KEY;

async function findEmail(firstName, lastName, domain) {
  const url = `https://api.hunter.io/v2/email-finder`;
  const params = {
    domain,
    first_name: firstName,
    last_name: lastName,
    api_key: HUNTER_API_KEY
  };

  try {
    const res = await axios.get(url, { params });
    const data = res.data;

    if (data.data && data.data.email) {
      return {
        email: data.data.email,
        score: data.data.score,
        verified: data.data.verification?.status || ''
      };
    } else {
      return { email: '', score: '', verified: '' };
    }
  } catch (err) {
    console.error(`❌ Hunter API error for ${firstName} ${lastName}:`, err.response?.data || err.message);
    return { email: '', score: '', verified: '' };
  }
}

async function processLeads() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Read rows
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!D2:H6` // firstName (D) to domain (H), rows 2–6
  });

  const rows = readRes.data.values;
  if (!rows || rows.length === 0) {
    console.log('No leads found.');
    return;
  }

  const updates = [];

  for (let i = 0; i < rows.length; i++) {
    const [firstName, lastName, , domain] = rows[i];
    console.log(`🔍 Looking up: ${firstName} ${lastName} @ ${domain}`);

    const { email, verified, score } = await findEmail(firstName, lastName, domain);
    updates.push([email, verified, score]);
  }

  // Write results to columns I (email), J (verified), K (score)
  const updateRange = `${SHEET_NAME}!I2:K6`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: updateRange,
    valueInputOption: 'RAW',
    requestBody: { values: updates }
  });

  console.log(`✅ Updated ${updates.length} rows.`);
}

processLeads();
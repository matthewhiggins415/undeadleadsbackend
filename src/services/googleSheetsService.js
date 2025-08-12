const { google } = require('googleapis');

const createSheet = async (oauth2Client, title) => {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const response = await sheets.spreadsheets.create({
    resource: {
      properties: { title },
    },
  });

  return response.data; // contains spreadsheetId, spreadsheetUrl, etc.
}

const fetchSheetData = async (sheetUrl, oauth2Client) => {
  // Extract spreadsheetId from URL
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Invalid Google Sheet URL');

  const spreadsheetId = match[1];

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A:Z',
  });

  return {
    spreadsheetId,
    rows: response.data.values || [],
  };
};


module.exports = {
  createSheet,
  fetchSheetData
};
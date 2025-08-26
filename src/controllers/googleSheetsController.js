const { createSheet, fetchSheetData } = require('../services/googleSheetsService');
const { getOAuth2Client } = require('../services/googleAuthService');
const { getSheetInfo, setMasterSheet, addSheet } = require('../services/storedSheetsService');

// Helper: get an authenticated client or respond with 401
const ensureAuthClient = async (res) => {
  const oauth2Client = await getOAuth2Client();
  if (!oauth2Client) {
    res.status(401).json({
      error: 'NOT_AUTHENTICATED',
      message: 'Google authentication required. Please re-authenticate via /google/auth'
    });
    return null;
  }
  return oauth2Client;
};

// Create a new Google Sheet
const createSheetHandler = async (req, res) => {
  try {
    const oauth2Client = await ensureAuthClient(res);
    if (!oauth2Client) return; // stop if not authenticated

    const data = await createSheet(oauth2Client, req.body.sheetName);

    res.json({
      success: true,
      message: 'Sheet created successfully',
      url: data.spreadsheetUrl,
    });
  } catch (error) {
    console.error('[GoogleSheets] Error creating sheet:', error);
    res.status(401).json({
      error: 'NOT_AUTHENTICATED',
      message: 'Google authentication required. Please re-authenticate via /google/auth'
    });
  }
};

// Upload or fetch data from an existing Google Sheet
const uploadSheet = async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Missing Google Sheet URL' });
    }

    // Extract Google Sheet ID from URL
    const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL' });
    }
    const sheetId = match[1];

    const oauth2Client = await ensureAuthClient(res);
    if (!oauth2Client) return; // stop if not authenticated

    const data = await fetchSheetData(sheetUrl, oauth2Client);
    const sheetTitle = await getSheetInfo(oauth2Client, sheetId);

    console.log("sheet title", sheetTitle);

    console.log("data", data);

    // Store the sheet locally & set as master
    const sheet = addSheet(sheetId, sheetUrl, sheetTitle);
    setMasterSheet(sheetId);

    res.status(200).json({
      success: true,
      message: 'Sheet uploaded and set as master successfully',
      sheetUrl,
      sheetTitle,
      data
    });
  } catch (error) {
    console.error('[GoogleSheets] Error uploading sheet:', error);
    res.status(401).json({
      error: 'NOT_AUTHENTICATED',
      message: 'Google authentication required. Please re-authenticate via /google/auth'
    });
  }
};

module.exports = {
  createSheetHandler,
  uploadSheet
};
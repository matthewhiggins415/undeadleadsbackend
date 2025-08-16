const { createSheet, fetchSheetData } = require('../services/googleSheetsService');
const { getOAuth2Client } = require('../services/googleAuthService');

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
    res.status(500).send('Error creating sheet');
  }
};

// Upload or fetch data from an existing Google Sheet
const uploadSheet = async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Missing Google Sheet URL' });
    }

    const oauth2Client = await ensureAuthClient(res);
    if (!oauth2Client) return; // stop if not authenticated

    const data = await fetchSheetData(sheetUrl, oauth2Client);

    res.status(200).json({
      success: true,
      message: 'Sheet data fetched successfully',
      sheetUrl,
      data
    });
  } catch (error) {
    console.error('[GoogleSheets] Error uploading sheet:', error);
    res.status(500).json({ error: 'Failed to fetch Google Sheet data' });
  }
};

module.exports = {
  createSheetHandler,
  uploadSheet
};
const open = require('open').default;
const { SCOPES, loadCredentials, getOAuth2Client, saveToken } = require('../config/googleAuth');
const { createSheet } = require('../services/googleSheetsService');
const { fetchSheetData } = require('../services/googleSheetsService');

const google = require('googleapis').google;

const createSheetHandler = async (req, res) => {
  try {
    let oauth2Client = await getOAuth2Client();

    if (!oauth2Client) {
      const { client_id, client_secret, redirect_uris } = loadCredentials();

      oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      await open(authUrl);

      return res.send(
        'Authentication required. Please check your browser to authorize the app. After authorization, call /oauth2callback?code=YOUR_CODE to complete.'
      );
    }

    const data = await createSheet(oauth2Client, req.body.sheetName);

    res.json({
      success: true,
      message: 'Sheet created successfully',
      url: data.spreadsheetUrl,
    });
  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).send('Error creating sheet');
  }
}

// refactor to authcontroller file 
const oauth2CallbackHandler = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code parameter');

  try {
    const { client_id, client_secret, redirect_uris } = loadCredentials();
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    saveToken(tokens);

    res.send(
      '✅ Authentication successful! You can now go back and call /create-sheet to create a sheet.'
    );
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    res.status(500).send('Failed to exchange code for token');
  }
}

const uploadSheet = async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Missing Google Sheet URL' });
    }

    // Get OAuth2 client or trigger auth flow if not authenticated
    let oauth2Client = await getOAuth2Client();

    if (!oauth2Client) {
      const { client_id, client_secret, redirect_uris } = loadCredentials();

      oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      await open(authUrl);

      return res.status(401).json({
        error: 'Authentication required. Please authorize the app via the browser and then call /oauth2callback with your code.'
      });
    }

    // Pass oauth2Client to your service
    const data = await fetchSheetData(sheetUrl, oauth2Client);

    res.status(200).json({
      success: true,
      message: 'Sheet data fetched successfully',
      sheetUrl,
      data
    });

  } catch (error) {
    console.error('Error in uploadSheet controller:', error);
    res.status(500).json({ error: 'Failed to fetch Google Sheet data' });
  }
};

module.exports = {
  createSheetHandler,
  oauth2CallbackHandler,
  uploadSheet
};
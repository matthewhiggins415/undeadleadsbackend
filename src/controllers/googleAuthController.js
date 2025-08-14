const { google } = require('googleapis');
const {
  SCOPES,
  loadCredentials,
  getOAuth2Client,
  saveToken
} = require('../services/googleAuthService');

// Start OAuth flow
const authorize = async (req, res) => {
  try {
    const { client_id, client_secret, redirect_uris } = loadCredentials();
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    res.redirect(authUrl);
  } catch (err) {
    console.error('Error starting Google OAuth flow:', err);
    res.status(500).send('Failed to initiate OAuth flow');
  }
}

// Handle OAuth2 callback
const oauth2Callback = async (req, res) => {
  try {
    const code = req.query.code;
    const { client_id, client_secret, redirect_uris } = loadCredentials();

    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const { tokens } = await oauth2Client.getToken(code);
    saveToken(tokens);

    res.send('Google OAuth successful! Token saved.');
  } catch (err) {
    console.error('Error handling OAuth2 callback:', err);
    res.status(500).send('Failed to complete OAuth flow');
  }
}

// Get authenticated OAuth client
const getAuthClient = async (req, res) => {
  try {
    const client = await getOAuth2Client();
    if (!client) {
      return res.status(401).send('Not authenticated with Google.');
    }
    res.send('OAuth client is authenticated and ready.');
  } catch (err) {
    console.error('Error getting OAuth client:', err);
    res.status(500).send('Failed to get OAuth client');
  }
}

module.exports = {
  authorize,
  oauth2Callback,
  getAuthClient
};
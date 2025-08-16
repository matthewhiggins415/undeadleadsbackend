const {
  generateAuthUrl,
  handleOAuth2Callback,
  getOAuth2Client
} = require('../services/googleAuthService');

// Start OAuth flow
const authorize = async (req, res) => {
  try {
    const authUrl = generateAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    console.error('Error starting Google OAuth flow:', err);
    res.status(500).send('Failed to initiate OAuth flow');
  }
};

// Handle OAuth2 callback
const oauth2Callback = async (req, res) => {
  try {
    const code = req.query.code;
    await handleOAuth2Callback(code);
    res.send('Google OAuth successful! Token saved.');
  } catch (err) {
    console.error('Error handling OAuth2 callback:', err);
    res.status(500).send('Failed to complete OAuth flow');
  }
};

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
};

module.exports = {
  authorize,
  oauth2Callback,
  getAuthClient
};
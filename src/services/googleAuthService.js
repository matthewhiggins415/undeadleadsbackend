const { google } = require('googleapis');
const fs = require('fs');
const {
  CREDENTIALS_PATH,
  TOKEN_PATH,
  SCOPES
} = require('../config/googleAuth');

// Load OAuth2 client credentials from file
const loadCredentials = () => {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const { client_id, client_secret, redirect_uris } = credentials.web;
  return { client_id, client_secret, redirect_uris };
}

// Create new OAuth2 client
const createOAuth2Client = () => {
  const { client_id, client_secret, redirect_uris } = loadCredentials();
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

// Generate Google Auth URL
const generateAuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
};

// Handle OAuth2 callback (exchange code for tokens)
const handleOAuth2Callback = async (code) => {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  saveToken(tokens);
  return tokens;
};

// Get OAuth2 client (with token if exists)
const getOAuth2Client = async () => {
  const oauth2Client = createOAuth2Client();

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, 'utf8');
    oauth2Client.setCredentials(JSON.parse(token));
    return oauth2Client;
  }

  return null;
};


// Save token to disk
const saveToken = (token) => {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

module.exports = {
  SCOPES,
  generateAuthUrl,
  handleOAuth2Callback,
  getOAuth2Client
};
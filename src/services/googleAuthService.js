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

// Get OAuth2 client (with token if exists)
const getOAuth2Client = async () => {
  const { client_id, client_secret, redirect_uris } = loadCredentials();
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, 'utf8');
    oauth2Client.setCredentials(JSON.parse(token));
    return oauth2Client;
  }

  return null;
}

// Save token
const saveToken = (token) => {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  } catch (error) {
    console.error('Error saving token:', error);
    throw error; // Re-throw if needed
  }
};

module.exports = {
  SCOPES,
  loadCredentials,
  getOAuth2Client,
  saveToken
};
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

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

// Save token to disk
const saveToken = (token) => {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
}

module.exports = {
  SCOPES,
  loadCredentials,
  getOAuth2Client,
  saveToken,
};
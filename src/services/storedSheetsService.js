// src/services/storedSheetsService.js
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SHEETS_FILE = path.join(__dirname, '../../storedSheets.json');

// Ensure file exists
const initFile = () => {
  if (!fs.existsSync(SHEETS_FILE)) {
    fs.writeFileSync(SHEETS_FILE, JSON.stringify([], null, 2));
  }
}

// Read all sheets
const readSheets = () => {
  initFile();
  return JSON.parse(fs.readFileSync(SHEETS_FILE, 'utf-8'));
}

// Return sheet title using sheet ID 
async function getSheetInfo(auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title',
  });
  
  return response.data.properties.title; 
}

// Write sheets back
const writeSheets = (sheets) => {
  fs.writeFileSync(SHEETS_FILE, JSON.stringify(sheets, null, 2));
}

// Create (add new sheet)
const addSheet = (sheetId, sheetUrl, sheetName) => {
  const sheets = readSheets();
  const newSheet = { 
    id: sheetId, 
    url: sheetUrl, 
    name: sheetName, 
    createdAt: new Date().toISOString(),
    isMaster: false // default
  };
  sheets.push(newSheet);
  writeSheets(sheets);
  return newSheet;
}

// Read (get one sheet by id)
const getSheet = (sheetId) => {
  const sheets = readSheets();
  return sheets.find((s) => s.id === sheetId) || null;
}

// See if there is a masterSheet
const getMasterSheet = async () => {
  try {
    const data = await fs.readFile(storedSheetsPath, "utf-8");
    const sheets = JSON.parse(data);
    return sheets.find(s => s.isMaster) || null;
  } catch (error) {
    console.error("[StoredSheets] Error reading master sheet:", error);
    return null;
  }
}

// Read all
const getAllSheets = () => {
  return readSheets();
}

// Update sheet url
const updateSheet = (sheetId, newUrl) => {
  const sheets = readSheets();
  const index = sheets.findIndex((s) => s.id === sheetId);
  if (index === -1) return null;
  sheets[index].url = newUrl;
  sheets[index].updatedAt = new Date().toISOString();
  writeSheets(sheets);
  return sheets[index];
}

// Mark one sheet as the master
const setMasterSheet = (sheetId) => {
  const sheets = readSheets();
  let found = false;
  sheets.forEach((sheet) => {
    if (sheet.id === sheetId) {
      sheet.isMaster = true;
      found = true;
    } else {
      sheet.isMaster = false;
    }
  });
  writeSheets(sheets);
  return found ? sheets.find((s) => s.id === sheetId) : null;
}

// Delete
const deleteSheet = (sheetId) => {
  const sheets = readSheets();
  const filtered = sheets.filter((s) => s.id !== sheetId);
  if (filtered.length === sheets.length) return false; // nothing deleted
  writeSheets(filtered);
  return true;
}

module.exports = {
  addSheet,
  getSheet,
  getSheetInfo,
  getAllSheets,
  updateSheet,
  setMasterSheet,
  getMasterSheet,
  deleteSheet,
};
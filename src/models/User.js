const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  query: { type: String, required: true }, // the search term or parameters
  sheetId: { type: String, required: true }, // Google Sheets spreadsheetId
  sheetUrl: { type: String, required: true }, // Full URL to the sheet
  rowCount: { type: Number, default: 0 }, // Optional: how many rows were created
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true }, // From Google OAuth
  email: { type: String, required: true },
  name: { type: String },
  avatar: { type: String }, // profile picture
  mainSheetId: { type: String, default: null }, // spreadsheetId is better for API calls
  mainSheetUrl: { type: String, default: null }, // optional convenience
  searches: [searchSchema] // Array of searches they've run
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
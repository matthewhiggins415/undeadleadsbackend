// src/routes/storedSheetsRoutes.js
const express = require('express');
const router = express.Router();
const {
  addSheet,
  getSheet,
  getAllSheets,
  updateSheet,
  deleteSheet,
} = require('../services/storedSheetsService');

// ✅ Create a new sheet entry
router.post('/', (req, res) => {
  const { id, url } = req.body;
  if (!id || !url) {
    return res.status(400).json({ error: 'id and url are required' });
  }

  const newSheet = addSheet(id, url);
  res.status(201).json(newSheet);
});

// ✅ Get all sheets
router.get('/', (req, res) => {
  const sheets = getAllSheets();
  res.json(sheets);
});

// ✅ Get single sheet by id
router.get('/:id', (req, res) => {
  const sheet = getSheet(req.params.id);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }
  res.json(sheet);
});

// ✅ Update sheet url
router.put('/:id', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const updated = updateSheet(req.params.id, url);
  if (!updated) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  res.json(updated);
});

// ✅ Delete sheet
router.delete('/:id', (req, res) => {
  const deleted = deleteSheet(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  res.json({ success: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  createSheetHandler,
} = require('../controllers/googleSheetsController');
const { uploadSheet } = require('../controllers/googleSheetsController');

router.post('/create-sheet', createSheetHandler);
router.post('/upload-sheet', uploadSheet);

module.exports = router;
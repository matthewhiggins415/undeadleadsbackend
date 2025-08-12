// src/routes/googleScraperRoutes.js
const express = require('express');
const router = express.Router();
const { startScrape } = require('../controllers/googleScraperController');

router.post('/scrape-leads', startScrape);

module.exports = router;
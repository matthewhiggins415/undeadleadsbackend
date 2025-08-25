const { scrapeLeads } = require('../services/googleScraperService');
const { createSheet } = require('../services/googleSheetsService');
const { getOAuth2Client } = require('../services/googleAuthService');
const { addSheet } = require('../services/storedSheetsService');

const startScrape = async (req, res) => {
  try {
    const oauth2Client = await getOAuth2Client();
    const sheet = await createSheet(oauth2Client, req.body.sheetName);

    console.log("✅ Created sheet:", sheet.spreadsheetId);

    // await scraper before sending response
    await scrapeLeads(req.body, sheet.spreadsheetId, oauth2Client);

    console.log("🎉 Scraping finished successfully");

    // add sheet to our json file for tracking. 
    addSheet(sheet.spreadsheetId, sheet.spreadsheetUrl, req.body.sheetName);

    // respond once after scraping completes
    res.status(200).json({
      success: true,
      message: 'Scraping complete!',
      spreadsheetId: sheet.spreadsheetId,
      url: sheet.spreadsheetUrl,
    });
  } catch (err) {
    console.error('Error in scraping controller:', err);
    res.status(500).json({ error: 'Scraping failed to start' });
  }
};

module.exports = { startScrape };
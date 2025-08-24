const { scrapeLeads } = require('../services/googleScraperService');
const { createSheet } = require('../services/googleSheetsService');
const { getOAuth2Client } = require('../services/googleAuthService');

const startScrape = async (req, res) => {
  try {
    const oauth2Client = await getOAuth2Client();
    const sheet = await createSheet(oauth2Client, req.body.sheetName);

    console.log("✅ Created sheet:", sheet.spreadsheetId);

    // kick off scraper async (don’t block HTTP response)
    scrapeLeads(req.body, sheet.spreadsheetId, oauth2Client)
      .then(() => {
        console.log("🎉 Scraping finished successfully");
      })
      .catch((err) => {
        console.error("❌ Scraping failed inside controller:", err);
      });

    // respond immediately with sheet info
    res.status(200).json({
      success: true,
      message: 'Scraping started. Watch Socket.IO for captcha and progress events.',
      spreadsheetId: sheet.spreadsheetId,
      url: sheet.spreadsheetUrl
    });
  } catch (err) {
    console.error('Error in scraping controller:', err);
    res.status(500).json({ error: 'Scraping failed to start' });
  }
};

module.exports = { startScrape };
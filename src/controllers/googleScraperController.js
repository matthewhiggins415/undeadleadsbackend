const { scrapeLeads } = require('../services/googleScraperService');
const { createSheet } = require('../services/googleSheetsService');
const { getOAuth2Client } = require('../services/googleAuthService');

const startScrape = async (req, res) => {
  // need to solve captcha automatically.. 
  // then needs to do scrape headlessly.. 
  // then open tab to new complete sheet.. 
  // save sheet url to user 
  try {
    const oauth2Client = await getOAuth2Client();
    const sheet = await createSheet(oauth2Client, req.body.sheetName);

    console.log("✅ Created sheet:", sheet.spreadsheetId);

    await scrapeLeads(req.body, sheet.spreadsheetId, oauth2Client);

    res.status(200).json({
      success: true,
      message: 'Scraping completed successfully',
      spreadsheetId: sheet.spreadsheetId,
      url: sheet.spreadsheetUrl
    });
  } catch (err) {
    console.error('Error in scraping controller:', err);
    res.status(500).json({ error: 'Scraping failed' });
  }
};
module.exports = { startScrape };
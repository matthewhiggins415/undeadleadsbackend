// routes/googleAuthRoutes.js
const express = require('express');
const router = express.Router();
const { authorize, oauth2Callback, getAuthClient } = require('../controllers/googleAuthController');

// Step 1: Start Google OAuth flow
router.get('/auth/google', authorize);

// Step 2: OAuth2 callback from Google
router.get('/auth/google/callback', oauth2Callback);

// Step 3: Check if authenticated
router.get('/auth/google/status', getAuthClient);

module.exports = router;
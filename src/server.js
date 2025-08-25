const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const storedSheetsRoutes = require('./routes/storedSheetsRoutes');
const googleSheetsRoutes = require('./routes/googleSheetsRoutes');
const googleScraperRoutes = require('./routes/googleScraperRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const { setSocketIO, continueScraping } = require('./services/googleScraperService');

const app = express();
const PORT = 5000;

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Routes ---
app.use('/api/google/', googleAuthRoutes);
app.use('/api', googleSheetsRoutes);
app.use('/api/google', googleScraperRoutes);
app.use('/api/sheets', storedSheetsRoutes);

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// --- Create HTTP server & attach socket.io ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // your React frontend
    methods: ["GET", "POST"],
  },
});

// make io available to services
setSocketIO(io);

// handle socket connections
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("captchaSolved", () => {
    console.log("✅ Captcha solved, resuming scraper");
    continueScraping();
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
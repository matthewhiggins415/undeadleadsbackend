const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const googleSheetsRoutes = require('./routes/googleSheetsRoutes');
const googleScraperRoutes = require('./routes/googleScraperRoutes');

const app = express();
const PORT = 5000;

// Connect to db 
// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(`${process.env.MONGO_URI}`);
    
//     console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
//   } catch(error) {
//     console.error(`Error: ${error.message}`.red.underline.bold);
//     process.exit(1);
//   }
// }
  
// connectDB();

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api', googleSheetsRoutes);
app.use('/api/google', googleScraperRoutes);

// Error handling middleware (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});

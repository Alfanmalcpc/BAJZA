const express = require('express');
const cors = require('cors');
const path = require('path');
const cryptoRoutes = require('./routes/crypto.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check — dipakai oleh frontend untuk "membangunkan" server Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Routes API
app.use('/api/crypto', cryptoRoutes);

// Redirect root to public/index.html
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

module.exports = app;

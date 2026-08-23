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

// Routes API
app.use('/api/crypto', cryptoRoutes);

// Redirect root to public/index.html
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

module.exports = app;

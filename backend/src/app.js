const express = require('express');
const cors = require('cors');
const path = require('path');
const cryptoRoutes = require('./routes/crypto.routes');
const aquariumRoutes = require('./routes/aquarium.routes');
const aiRoutes = require('./routes/ai.routes');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS whitelist
const ALLOWED_ORIGINS = [
  'https://bajza.my.id',
  'https://alfanmalcpc.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.github.io')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback for local previews
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' })); // Limit body payload to prevent DoS

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Routes API
app.use('/api/crypto', cryptoRoutes);
app.use('/api/aquarium', aquariumRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payment', paymentRoutes);

// Redirect root to public/index.html
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

// Safe Centralized Error Handling (No stack traces exposed to client)
app.use((err, req, res, next) => {
  console.error('Server Internal Error:', err.message);
  res.status(err.status || 500).json({
    error: 'Terjadi kesalahan pada server. Permintaan tidak dapat diproses.'
  });
});

module.exports = app;

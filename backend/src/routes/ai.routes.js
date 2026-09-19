const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const createRateLimiter = require('../middleware/rateLimit.middleware');

// Rate limit AI chat: max 15 requests per minute per IP/user
const aiLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 15,
  message: 'Bazz sedang sibuk menjawab banyak pertanyaan. Silakan tunggu 1 menit sebelum bertanya lagi ya!'
});

router.post('/chat', aiLimiter, aiController.chatWithBazz);

module.exports = router;

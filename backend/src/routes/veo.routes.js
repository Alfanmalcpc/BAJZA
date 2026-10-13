const express = require('express');
const router = express.Router();
const veoController = require('../controllers/veo.controller');
const createRateLimiter = require('../middleware/rateLimit.middleware');

// Rate limit: max 10 requests per minute per IP
const veoLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
  message: 'Batas request render video per menit tercapai. Mohon tunggu sebentar.'
});

router.post('/generate', veoLimiter, veoController.generateVideo);
router.get('/status/:operationId', veoController.checkStatus);
router.get('/pool', veoController.getPoolStatus);
router.post('/pool/add', veoController.addTokenToPool);

module.exports = router;

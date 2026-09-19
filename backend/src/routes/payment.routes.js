const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const verifyFirebaseToken = require('../middleware/auth.middleware');
const createRateLimiter = require('../middleware/rateLimit.middleware');

const paymentLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 10, message: 'Terlalu banyak permintaan pembayaran.' });

router.post('/create', verifyFirebaseToken, paymentLimiter, paymentController.createTransaction);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;

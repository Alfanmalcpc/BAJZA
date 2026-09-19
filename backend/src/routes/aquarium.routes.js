const express = require('express');
const router = express.Router();
const aquariumController = require('../controllers/aquarium.controller');
const verifyFirebaseToken = require('../middleware/auth.middleware');
const createRateLimiter = require('../middleware/rateLimit.middleware');

const aquariumLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 60, message: 'Terlalu banyak permintaan aquarium.' });
const adClaimLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 6, message: 'Klaim iklan mencapai batas limit menit ini.' });

router.get('/state', aquariumLimiter, aquariumController.getState);
router.get('/leaderboard', aquariumLimiter, aquariumController.getLeaderboard);

// Protected routes (require verified Firebase authentication & rate limiting)
router.post('/sync', verifyFirebaseToken, aquariumLimiter, aquariumController.syncState);
router.post('/claim-ad', verifyFirebaseToken, adClaimLimiter, aquariumController.claimAdReward);
router.post('/buy-food', verifyFirebaseToken, aquariumLimiter, aquariumController.buyFood);
router.post('/sell-fish', verifyFirebaseToken, aquariumLimiter, aquariumController.sellFish);

module.exports = router;

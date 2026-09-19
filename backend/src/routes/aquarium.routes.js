const express = require('express');
const router = express.Router();
const aquariumController = require('../controllers/aquarium.controller');
const verifyFirebaseToken = require('../middleware/auth.middleware');

router.get('/state', aquariumController.getState);
router.get('/leaderboard', aquariumController.getLeaderboard);

// Protected routes (require valid Firebase authentication)
router.post('/sync', verifyFirebaseToken, aquariumController.syncState);
router.post('/claim-ad', verifyFirebaseToken, aquariumController.claimAdReward);
router.post('/buy-food', verifyFirebaseToken, aquariumController.buyFood);
router.post('/sell-fish', verifyFirebaseToken, aquariumController.sellFish);

module.exports = router;

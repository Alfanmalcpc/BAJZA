const express = require('express');
const router = express.Router();
const aquariumController = require('../controllers/aquarium.controller');

router.get('/state', aquariumController.getState);
router.post('/sync', aquariumController.syncState);
router.post('/claim-ad', aquariumController.claimAdReward);
router.post('/buy-food', aquariumController.buyFood);
router.post('/sell-fish', aquariumController.sellFish);

module.exports = router;

const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/crypto.controller');

router.get('/prices', cryptoController.getPrices);

module.exports = router;

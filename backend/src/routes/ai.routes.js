const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

router.post('/chat', aiController.chatWithBazz);

module.exports = router;

const express = require('express');
const router = express.Router();
const downloaderController = require('../controllers/downloader.controller');

// GET /api/downloader?url=...&platform=...
router.get('/', downloaderController.extractMedia);

// POST /api/downloader { url, platform }
router.post('/', downloaderController.extractMedia);

// GET /api/downloader/stream?url=...&filename=...
router.get('/stream', downloaderController.streamMedia);

module.exports = router;

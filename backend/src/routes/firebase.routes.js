const express = require('express');
const router = express.Router();
const firebaseController = require('../controllers/firebase.controller');

// ── Auth Endpoints ──────────────────────────────
router.post('/auth/signup', firebaseController.signUp);
router.post('/auth/signin', firebaseController.signIn);
router.post('/auth/lookup', firebaseController.lookup);

// ── Database Gateway Endpoints ──────────────────
router.get('/db/:project', firebaseController.dbGet);
router.post('/db/:project', firebaseController.dbSet);
router.post('/db/:project/transaction', firebaseController.dbTransaction);

module.exports = router;

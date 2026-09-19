const axios = require('axios');
require('dotenv').config();

const PET_DB_URL = process.env.PET_DB_URL || "https://baja-pet-default-rtdb.asia-southeast1.firebasedatabase.app";

// In-memory cooldown / anti-spam validation
const adClaimCooldowns = new Map();

// Helper untuk fetch data user dari Firebase RTDB via REST API
async function getUserAquariumData(uid) {
  try {
    const res = await axios.get(`${PET_DB_URL}/aquarium/${encodeURIComponent(uid)}.json`);
    return res.data || null;
  } catch (err) {
    console.error('Error fetching RTDB user data:', err.message);
    return null;
  }
}

// Helper untuk simpan data user ke Firebase RTDB via REST API
async function saveUserAquariumData(uid, data) {
  try {
    await axios.put(`${PET_DB_URL}/aquarium/${encodeURIComponent(uid)}.json`, data);
    return true;
  } catch (err) {
    console.error('Error saving RTDB user data:', err.message);
    return false;
  }
}

// Server-authoritative food pricing and count catalog
const SERVER_FOOD_CATALOG = {
  'pellet': { price: 2, count: 5 },
  'cacing': { price: 5, count: 5 },
  'udang': { price: 10, count: 5 },
  'ikan-kecil': { price: 25, count: 5 },
  'vitamin': { price: 50, count: 5 }
};

// 1. Get State (Protected by authenticated user UID)
exports.getState = async (req, res) => {
  const uid = req.user?.uid || req.query.uid;
  if (!uid || typeof uid !== 'string' || uid.length > 128) {
    return res.status(400).json({ error: 'UID tidak valid' });
  }

  const data = await getUserAquariumData(uid);
  if (!data) {
    return res.json({
      tokens: 30,
      totalSoldTokens: 0,
      inventoryFood: { pellet: 5, cacing: 0, udang: 0, 'ikan-kecil': 0, vitamin: 0 },
      unlockedThemes: ['deep-ocean'],
      activeThemeId: 'deep-ocean',
      fishes: [],
      decorations: []
    });
  }
  res.json(data);
};

// 2. Sync / Save State (Server-Authoritative Mass-Assignment Sanitization)
exports.syncState = async (req, res) => {
  const uid = req.user?.uid;
  const { state } = req.body;
  if (!uid || !state || typeof state !== 'object') {
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  const existingData = (await getUserAquariumData(uid)) || {};

  // Mass assignment protection: Allowlist strictly valid fields and bounds
  const sanitizedState = {
    tokens: typeof state.tokens === 'number' && !isNaN(state.tokens) && isFinite(state.tokens) && state.tokens >= 0
      ? parseFloat(state.tokens.toFixed(2))
      : (existingData.tokens || 30),
    totalSoldTokens: typeof state.totalSoldTokens === 'number' && state.totalSoldTokens >= 0
      ? parseFloat(state.totalSoldTokens.toFixed(2))
      : (existingData.totalSoldTokens || 0),
    inventoryFood: typeof state.inventoryFood === 'object' && state.inventoryFood ? state.inventoryFood : {},
    unlockedThemes: Array.isArray(state.unlockedThemes) ? state.unlockedThemes.slice(0, 20) : ['deep-ocean'],
    activeThemeId: typeof state.activeThemeId === 'string' ? state.activeThemeId.substring(0, 50) : 'deep-ocean',
    fishes: Array.isArray(state.fishes) ? state.fishes.slice(0, 100) : [],
    decorations: Array.isArray(state.decorations) ? state.decorations.slice(0, 50) : [],
    displayName: typeof state.displayName === 'string' ? state.displayName.substring(0, 50) : (existingData.displayName || 'Pemain'),
    lastWeightBoostCheck: typeof state.lastWeightBoostCheck === 'number' ? state.lastWeightBoostCheck : Date.now(),
    lastFoodDropCheck: typeof state.lastFoodDropCheck === 'number' ? state.lastFoodDropCheck : Date.now(),
    updatedAt: Date.now()
  };

  const success = await saveUserAquariumData(uid, sanitizedState);
  if (!success) return res.status(500).json({ error: 'Gagal menyinkronkan data ke database' });

  res.json({ success: true, timestamp: sanitizedState.updatedAt });
};

// 3. Claim Ad Reward (+5 Tokens with server rate-limiting)
exports.claimAdReward = async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Autentikasi diperlukan' });

  const now = Date.now();
  const lastClaim = adClaimCooldowns.get(uid) || 0;
  if (now - lastClaim < 10000) { // 10 seconds minimum cooldown
    return res.status(429).json({ error: 'Klaim reward terlalu sering. Tunggu 10 detik.' });
  }
  adClaimCooldowns.set(uid, now);

  let data = await getUserAquariumData(uid) || {
    tokens: 30,
    totalSoldTokens: 0,
    inventoryFood: { pellet: 5, cacing: 0, udang: 0, 'ikan-kecil': 0, vitamin: 0 },
    unlockedThemes: ['deep-ocean'],
    activeThemeId: 'deep-ocean',
    fishes: [],
    decorations: []
  };

  data.tokens = parseFloat(((data.tokens || 0) + 5).toFixed(2));
  data.updatedAt = now;

  await saveUserAquariumData(uid, data);
  res.json({ success: true, tokens: data.tokens, added: 5 });
};

// 4. Buy Food Item (Server-Authoritative Pricing Calculation)
exports.buyFood = async (req, res) => {
  const uid = req.user?.uid;
  const { foodId } = req.body;
  if (!uid || !foodId) return res.status(400).json({ error: 'Parameter pembelian tidak lengkap' });

  const catalogItem = SERVER_FOOD_CATALOG[foodId];
  if (!catalogItem) {
    return res.status(400).json({ error: 'Jenis pakan tidak terdaftar di server' });
  }

  const requiredTokens = catalogItem.price;
  const countToAdd = catalogItem.count;

  let data = await getUserAquariumData(uid);
  if (!data || (data.tokens || 0) < requiredTokens) {
    return res.status(400).json({ error: 'Token tidak mencukupi!' });
  }

  data.tokens = parseFloat(((data.tokens || 0) - requiredTokens).toFixed(2));
  if (!data.inventoryFood) data.inventoryFood = {};
  data.inventoryFood[foodId] = (data.inventoryFood[foodId] || 0) + countToAdd;
  data.updatedAt = Date.now();

  await saveUserAquariumData(uid, data);
  res.json({ success: true, tokens: data.tokens, inventoryFood: data.inventoryFood });
};

// 5. Sell Fish (Server-Authoritative Valuation)
exports.sellFish = async (req, res) => {
  const uid = req.user?.uid;
  const { fishId } = req.body;
  if (!uid || !fishId) return res.status(400).json({ error: 'Parameter penjualan tidak lengkap' });

  let data = await getUserAquariumData(uid);
  if (!data || !data.fishes) return res.status(404).json({ error: 'Data ikan tidak ditemukan' });

  const fishIndex = data.fishes.findIndex(f => f.id === fishId);
  if (fishIndex === -1) return res.status(404).json({ error: 'Ikan tidak ditemukan di aquarium' });

  const f = data.fishes[fishIndex];
  const wVal = Math.max(0.1, parseFloat(f.weight || 0.2));
  const now = Date.now();
  const createdAt = f.createdAt || now;
  const ageDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));
  const ageWeeks = Math.floor(ageDays / 7);

  let ratePerKg = 0.2;
  if (f.quality === 'Legendaris') ratePerKg = 1.0;
  else if (f.quality === 'Bagus') ratePerKg = 0.5;

  const weightValue = wVal * ratePerKg;
  const ageBonusPercent = ageWeeks >= 1 ? Math.min(10, ageWeeks * 0.1) : 0;
  const ageBonusTokens = (f.basePrice || 0) * (ageBonusPercent / 100);
  const sellPrice = parseFloat(((f.basePrice || 0) + weightValue + ageBonusTokens).toFixed(2));

  data.tokens = parseFloat(((data.tokens || 0) + sellPrice).toFixed(2));
  data.totalSoldTokens = parseFloat(((data.totalSoldTokens || 0) + sellPrice).toFixed(2));
  data.fishes.splice(fishIndex, 1);
  data.updatedAt = now;

  await saveUserAquariumData(uid, data);
  res.json({ success: true, sellPrice, tokens: data.tokens, totalSoldTokens: data.totalSoldTokens });
};

// 6. Global Leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const rtdbRes = await axios.get(`${PET_DB_URL}/aquarium.json`);
    const allAquarium = rtdbRes.data || {};
    
    const leaderboard = [];
    const now = Date.now();

    for (const [uid, userState] of Object.entries(allAquarium)) {
      if (!userState) continue;
      
      let aliveValue = 0;
      const fishList = Array.isArray(userState.fishes) ? userState.fishes : (typeof userState.fishes === 'object' ? Object.values(userState.fishes) : []);
      fishList.forEach(f => {
        if (!f) return;
        const wVal = parseFloat(f.weight || 0.2);
        const createdAt = f.createdAt || now;
        const ageDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));
        const ageWeeks = Math.floor(ageDays / 7);
        let ratePerKg = 0.2;
        if (f.quality === 'Legendaris') ratePerKg = 1.0;
        else if (f.quality === 'Bagus') ratePerKg = 0.5;
        const weightVal = wVal * ratePerKg;
        const ageBonusPercent = ageWeeks >= 1 ? (ageWeeks * 0.1) : 0;
        const ageBonusTokens = (f.basePrice || 0) * (ageBonusPercent / 100);
        aliveValue += ((f.basePrice || 0) + weightVal + ageBonusTokens);
      });

      const totalSold = parseFloat(userState.totalSoldTokens || 0);
      const totalScore = parseFloat((aliveValue + totalSold).toFixed(2));
      const rawName = userState.displayName || (uid.startsWith('guest_') ? 'Tamu' : 'Pemain ' + uid.substring(0, 5).toUpperCase());
      const displayName = String(rawName).replace(/[<>]/g, '').substring(0, 30); // XSS Sanitization

      leaderboard.push({
        uid: uid,
        name: displayName,
        aliveTokens: parseFloat(aliveValue.toFixed(2)),
        soldTokens: totalSold,
        totalTokens: totalScore,
        fishCount: fishList.length
      });
    }

    leaderboard.sort((a, b) => b.totalTokens - a.totalTokens);

    res.json({
      success: true,
      leaderboard: leaderboard.slice(0, 50)
    });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Gagal memuat leaderboard' });
  }
};

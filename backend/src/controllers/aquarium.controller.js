const axios = require('axios');

// Database URL untuk Pet/Aquarium
const PET_DB_URL = "https://baja-pet-default-rtdb.asia-southeast1.firebasedatabase.app";

// In-memory cooldown / anti-spam validation
const adClaimCooldowns = new Map();

// Helper untuk fetch data user dari Firebase RTDB via REST API
async function getUserAquariumData(uid) {
  try {
    const res = await axios.get(`${PET_DB_URL}/aquarium/${uid}.json`);
    return res.data || null;
  } catch (err) {
    console.error('Error fetching RTDB user data:', err.message);
    return null;
  }
}

// Helper untuk simpan data user ke Firebase RTDB via REST API
async function saveUserAquariumData(uid, data) {
  try {
    await axios.put(`${PET_DB_URL}/aquarium/${uid}.json`, data);
    return true;
  } catch (err) {
    console.error('Error saving RTDB user data:', err.message);
    return false;
  }
}

// 1. Get State
exports.getState = async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'UID is required' });

  const data = await getUserAquariumData(uid);
  if (!data) {
    // Default initial state
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

// 2. Sync / Save State
exports.syncState = async (req, res) => {
  const { uid, state } = req.body;
  if (!uid || !state) return res.status(400).json({ error: 'Invalid payload' });

  state.updatedAt = Date.now();
  const success = await saveUserAquariumData(uid, state);
  if (!success) return res.status(500).json({ error: 'Failed to sync to database' });

  res.json({ success: true, timestamp: state.updatedAt });
};

// 3. Claim Ad Reward (+5 Tokens with server rate-limiting)
exports.claimAdReward = async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'UID is required' });

  const now = Date.now();
  const lastClaim = adClaimCooldowns.get(uid) || 0;
  // Minimal interval 5 detik antar klaim iklan untuk mencegah spam bot
  if (now - lastClaim < 5000) {
    return res.status(429).json({ error: 'Klaim iklan terlalu cepat! Tunggu beberapa detik.' });
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

  data.tokens = (data.tokens || 0) + 5;
  data.updatedAt = now;

  await saveUserAquariumData(uid, data);
  res.json({ success: true, tokens: data.tokens, added: 5 });
};

// 4. Buy Food Item (Server-validated transaction)
exports.buyFood = async (req, res) => {
  const { uid, foodId, cost, count } = req.body;
  if (!uid || !foodId || !cost || !count) return res.status(400).json({ error: 'Invalid parameters' });

  let data = await getUserAquariumData(uid);
  if (!data || (data.tokens || 0) < cost) {
    return res.status(400).json({ error: 'Token tidak mencukupi!' });
  }

  data.tokens -= cost;
  if (!data.inventoryFood) data.inventoryFood = {};
  data.inventoryFood[foodId] = (data.inventoryFood[foodId] || 0) + count;
  data.updatedAt = Date.now();

  await saveUserAquariumData(uid, data);
  res.json({ success: true, tokens: data.tokens, inventoryFood: data.inventoryFood });
};

// 5. Sell Fish (Server-validated price calculation)
exports.sellFish = async (req, res) => {
  const { uid, fishId } = req.body;
  if (!uid || !fishId) return res.status(400).json({ error: 'Invalid parameters' });

  let data = await getUserAquariumData(uid);
  if (!data || !data.fishes) return res.status(404).json({ error: 'Data ikan tidak ditemukan' });

  const fishIndex = data.fishes.findIndex(f => f.id === fishId);
  if (fishIndex === -1) return res.status(404).json({ error: 'Ikan tidak ditemukan di aquarium' });

  const f = data.fishes[fishIndex];
  const wVal = parseFloat(f.weight || 0.2);
  const now = Date.now();
  const createdAt = f.createdAt || now;
  const ageDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));
  const ageWeeks = Math.floor(ageDays / 7);

  let ratePerKg = 0.2;
  if (f.quality === 'Legendaris') ratePerKg = 1.0;
  else if (f.quality === 'Bagus') ratePerKg = 0.5;

  const weightValue = wVal * ratePerKg;
  const ageBonusPercent = ageWeeks >= 1 ? (ageWeeks * 0.1) : 0;
  const ageBonusTokens = (f.basePrice || 0) * (ageBonusPercent / 100);
  const sellPrice = parseFloat(((f.basePrice || 0) + weightValue + ageBonusTokens).toFixed(2));

  // Update backend state
  data.tokens = parseFloat(((data.tokens || 0) + sellPrice).toFixed(2));
  data.totalSoldTokens = parseFloat(((data.totalSoldTokens || 0) + sellPrice).toFixed(2));
  data.fishes.splice(fishIndex, 1);
  data.updatedAt = now;

  await saveUserAquariumData(uid, data);
  res.json({ success: true, sellPrice, tokens: data.tokens, totalSoldTokens: data.totalSoldTokens });
};

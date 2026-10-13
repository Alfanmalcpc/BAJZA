const axios = require('axios');
require('dotenv').config();

// Account Pool Store (In-Memory + .env Fallback)
// Tokens can be Gemini/Vertex API Keys or Google Labs Session Tokens
let tokenPool = [
  {
    id: 1,
    name: "Google Labs / Flow (Akun Utama)",
    type: "gemini_veo",
    token: process.env.GEMINI_API_KEY || "",
    quota: 100,
    status: "active",
    lastUsed: null
  },
  {
    id: 2,
    name: "Google Labs / Flow (Akun Ayah)",
    type: "gemini_veo",
    token: process.env.VEO_API_KEY_2 || process.env.GEMINI_API_KEY || "",
    quota: 100,
    status: "standby",
    lastUsed: null
  },
  {
    id: 3,
    name: "Google Labs / Flow (Akun Ibu)",
    type: "gemini_veo",
    token: process.env.VEO_API_KEY_3 || "",
    quota: 100,
    status: "standby",
    lastUsed: null
  },
  {
    id: 4,
    name: "Google Labs / Flow (Cadangan 1)",
    type: "gemini_veo",
    token: process.env.VEO_API_KEY_4 || "",
    quota: 100,
    status: "standby",
    lastUsed: null
  }
];

// In-memory operation tracking
const operations = new Map();

/**
 * Get active token from pool with auto-failover
 */
function getNextAvailableAccount() {
  for (let i = 0; i < tokenPool.length; i++) {
    const acc = tokenPool[i];
    if (acc.token && acc.quota > 0 && acc.status !== 'rate_limited') {
      return acc;
    }
  }
  return null;
}

/**
 * Mark account as rate limited (HTTP 429) and failover
 */
function markAccountLimited(accountId) {
  const acc = tokenPool.find(a => a.id === accountId);
  if (acc) {
    acc.status = 'rate_limited';
    acc.quota = 0;
    console.warn(`[VEO POOL] Akun #${acc.id} (${acc.name}) menyentuh limit kuota 429. Auto-failover diaktifkan.`);
  }
}

/**
 * Controller: Get pool status for frontend
 */
exports.getPoolStatus = (req, res) => {
  const safePool = tokenPool.map(a => ({
    id: a.id,
    name: a.name,
    hasToken: Boolean(a.token),
    quota: a.quota,
    status: a.status,
    lastUsed: a.lastUsed
  }));
  const active = tokenPool.find(a => a.status === 'active') || tokenPool[0];
  res.json({
    pool: safePool,
    activeAccount: active ? {
      id: active.id,
      name: active.name,
      hasToken: Boolean(active.token),
      quota: active.quota,
      status: active.status,
      lastUsed: active.lastUsed
    } : null
  });
};

/**
 * Controller: Add or update token in pool
 */
exports.addTokenToPool = (req, res) => {
  const { name, token, type } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token/API Key wajib diisi' });
  }

  const newId = tokenPool.length + 1;
  tokenPool.push({
    id: newId,
    name: name || `Google Labs Akun #${newId}`,
    type: type || 'gemini_veo',
    token: token.trim(),
    quota: 100,
    status: 'standby',
    lastUsed: null
  });

  res.json({
    message: 'Token berhasil ditambahkan ke pool jembatan BAJA WEB!',
    accountId: newId
  });
};

/**
 * Controller: Generate video using Google Veo 3 / Google Flow
 */
exports.generateVideo = async (req, res) => {
  const { prompt, image, model, camera, aspectRatio } = req.body;

  if (!prompt && !image) {
    return res.status(400).json({ error: 'Prompt teks atau gambar referensi wajib diisi' });
  }

  // Find available account in pool
  let account = getNextAvailableAccount();
  if (!account) {
    // Reset status if all were limited to retry or report
    return res.status(429).json({
      error: 'Semua akun Google Labs / Veo dalam pool saat ini sedang mencapai limit harian.',
      status: 'ALL_EXHAUSTED',
      details: 'Silakan tambahkan token/kredit akun baru melalui menu Tambah Akun di BAJA WEB.'
    });
  }

  // Build enhanced cinematic prompt with camera motion
  let fullPrompt = prompt || "Cinematic landscape";
  if (camera) {
    fullPrompt += `, camera motion: ${camera}`;
  }

  // Call Google Veo 3.1 predictLongRunning endpoint
  const targetModel = 'veo-3.1-generate-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:predictLongRunning?key=${account.token}`;

  const payload = {
    instances: [
      {
        prompt: fullPrompt,
        ...(image ? { image: { bytesBase64Encoded: image.replace(/^data:image\/\w+;base64,/, '') } } : {})
      }
    ],
    parameters: {
      aspectRatio: aspectRatio || '16:9'
    }
  };

  try {
    console.log(`[VEO BRIDGE] Mengirim request render ke Google Veo 3 menggunakan Akun #${account.id} (${account.name})...`);
    account.lastUsed = new Date().toISOString();

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const opData = response.data;
    const opId = opData.name || `op_${Date.now()}`;

    // Store operation in memory
    operations.set(opId, {
      id: opId,
      accountId: account.id,
      prompt: fullPrompt,
      createdAt: Date.now(),
      status: 'processing',
      googleResponse: opData
    });

    return res.json({
      success: true,
      operationId: opId,
      accountId: account.id,
      accountName: account.name,
      message: `Terkoneksi ke Google Veo 3 melalui ${account.name}! Video sedang diproses oleh Google AI.`
    });

  } catch (err) {
    const status = err.response ? err.response.status : 500;
    const errorData = err.response ? err.response.data : { message: err.message };

    console.warn(`[VEO BRIDGE] Error dari Google (${status}):`, JSON.stringify(errorData));

    // Handle 429 Quota Exceeded with Auto-Failover
    if (status === 429) {
      markAccountLimited(account.id);
      
      // Try next account immediately
      const nextAcc = getNextAvailableAccount();
      if (nextAcc) {
        console.log(`[VEO BRIDGE] Auto-failover: Mencoba kembali dengan Akun #${nextAcc.id} (${nextAcc.name})...`);
        return exports.generateVideo(req, res); // Recursive retry with next account
      } else {
        return res.status(429).json({
          error: `Akun #${account.id} terkena limit kuota Google Labs, dan semua akun cadangan lain saat ini juga penuh.`,
          code: 'RATE_LIMIT_EXCEEDED',
          quotaResetInfo: 'Limit Google Labs biasanya di-reset setiap pukul 00:00 UTC.'
        });
      }
    }

    return res.status(status).json({
      error: 'Gagal menghubungkan ke Google Veo 3 / Google Labs',
      details: errorData
    });
  }
};

/**
 * Controller: Check status of running generation operation
 */
exports.checkStatus = async (req, res) => {
  const { operationId } = req.params;
  const op = operations.get(operationId);

  if (!op) {
    return res.status(404).json({ error: 'Operasi render video tidak ditemukan' });
  }

  const account = tokenPool.find(a => a.id === op.accountId) || tokenPool[0];
  const url = `https://generativelanguage.googleapis.com/v1beta/${op.id}?key=${account.token}`;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    const data = response.data;

    if (data.done) {
      const videoUri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
                       data.response?.videos?.[0]?.uri;
      op.status = 'completed';
      op.videoUrl = videoUri;

      return res.json({
        done: true,
        videoUrl: videoUri,
        message: 'Video Veo 3 berhasil dibuat!'
      });
    }

    return res.json({
      done: false,
      progress: data.metadata?.progressPercent || 50,
      message: 'Google Veo 3 sedang merender frame video...'
    });

  } catch (err) {
    return res.json({
      done: false,
      message: 'Sedang memproses antrean di Google Cloud...',
      details: err.message
    });
  }
};

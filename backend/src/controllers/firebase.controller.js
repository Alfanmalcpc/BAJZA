const axios = require('axios');
require('dotenv').config();

// Mapping project configurations from environment variables
const PROJECT_CONFIGS = {
  account: {
    apiKey: process.env.FIREBASE_ACCOUNT_API_KEY,
    dbUrl: (process.env.FIREBASE_ACCOUNT_DB_URL || 'https://baja-account-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    projectId: process.env.FIREBASE_ACCOUNT_PROJECT_ID || 'baja-account'
  },
  twibbon: {
    apiKey: process.env.FIREBASE_TWIBBON_API_KEY,
    dbUrl: (process.env.FIREBASE_TWIBBON_DB_URL || 'https://baja-twibon-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    projectId: process.env.FIREBASE_TWIBBON_PROJECT_ID || 'baja-twibon'
  },
  pet: {
    apiKey: process.env.FIREBASE_PET_API_KEY,
    dbUrl: (process.env.FIREBASE_PET_DB_URL || 'https://baja-pet-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    projectId: process.env.FIREBASE_PET_PROJECT_ID || 'baja-pet'
  },
  multiplay: {
    apiKey: process.env.FIREBASE_MULTIPLAY_API_KEY,
    dbUrl: (process.env.FIREBASE_MULTIPLAY_DB_URL || 'https://baja-multiplay-photobooth-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    projectId: process.env.FIREBASE_MULTIPLAY_PROJECT_ID || 'baja-multiplay-photobooth'
  },
  iot: {
    apiKey: process.env.FIREBASE_IOT_API_KEY,
    dbUrl: (process.env.FIREBASE_IOT_DB_URL || 'https://baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    projectId: process.env.FIREBASE_IOT_PROJECT_ID || 'baja-iot'
  }
};

function getProjectConfig(project) {
  const p = (project || 'account').toLowerCase();
  return PROJECT_CONFIGS[p] || PROJECT_CONFIGS.account;
}

// ─────────────────────────────────────────────────────────────
// AUTH CONTROLLER (Server-Side Firebase Identity Toolkit)
// ─────────────────────────────────────────────────────────────

exports.signUp = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const cfg = getProjectConfig('account');
    if (!cfg.apiKey) {
      return res.status(500).json({ error: 'Firebase Auth API Key belum dikonfigurasi di server.' });
    }

    // 1. Create user in Firebase Auth via Identity Toolkit REST
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`;
    const authResp = await axios.post(authUrl, {
      email,
      password,
      returnSecureToken: true
    });

    const { localId: uid, idToken, refreshToken } = authResp.data;

    // 2. Set display name if provided
    let finalDisplayName = displayName || email.split('@')[0];
    if (displayName) {
      try {
        const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${cfg.apiKey}`;
        await axios.post(updateUrl, {
          idToken,
          displayName,
          returnSecureToken: true
        });
      } catch (upErr) {
        console.warn('[Firebase Auth] Gagal update displayName:', upErr.message);
      }
    }

    // 3. Initialize user profile in Realtime Database server-side
    const initialProfile = {
      uid,
      email,
      displayName: finalDisplayName,
      photoURL: '',
      lang: 'id',
      buzz: 50,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    try {
      await axios.put(`${cfg.dbUrl}/users/${uid}.json`, initialProfile);
    } catch (dbErr) {
      console.warn('[Firebase RTDB] Gagal simpan initial profile:', dbErr.message);
    }

    return res.json({
      success: true,
      user: initialProfile,
      idToken,
      refreshToken
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('[Firebase Auth] signUp error:', msg);
    return res.status(400).json({ error: msg });
  }
};

exports.signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const cfg = getProjectConfig('account');
    if (!cfg.apiKey) {
      return res.status(500).json({ error: 'Firebase Auth API Key belum dikonfigurasi di server.' });
    }

    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}`;
    const authResp = await axios.post(authUrl, {
      email,
      password,
      returnSecureToken: true
    });

    const { localId: uid, idToken, refreshToken, displayName, photoUrl } = authResp.data;

    // Fetch rich user profile from Realtime Database
    let profile = null;
    try {
      const dbResp = await axios.get(`${cfg.dbUrl}/users/${uid}.json`);
      profile = dbResp.data;
    } catch (e) {
      console.warn('[Firebase RTDB] Gagal fetch profile saat signin:', e.message);
    }

    if (!profile) {
      profile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoUrl || '',
        buzz: 50
      };
    }

    // Update lastLoginAt
    try {
      await axios.patch(`${cfg.dbUrl}/users/${uid}.json`, { lastLoginAt: Date.now() });
    } catch (_) {}

    return res.json({
      success: true,
      user: profile,
      idToken,
      refreshToken
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('[Firebase Auth] signIn error:', msg);
    return res.status(400).json({ error: msg });
  }
};

exports.lookup = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Token diperlukan.' });
    }

    const cfg = getProjectConfig('account');
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${cfg.apiKey}`;
    const authResp = await axios.post(authUrl, { idToken });

    const users = authResp.data?.users;
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const u = users[0];
    const uid = u.localId;

    // Ambil profil DB
    let profile = null;
    try {
      const dbResp = await axios.get(`${cfg.dbUrl}/users/${uid}.json`);
      profile = dbResp.data;
    } catch (_) {}

    return res.json({
      success: true,
      user: {
        uid,
        email: u.email,
        displayName: profile?.displayName || u.displayName || '',
        photoURL: profile?.photoURL || u.photoUrl || '',
        ...(profile || {})
      }
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return res.status(400).json({ error: msg });
  }
};

// ─────────────────────────────────────────────────────────────
// REALTIME DATABASE GATEWAY (Server-Side Proxy)
// ─────────────────────────────────────────────────────────────

exports.dbGet = async (req, res) => {
  try {
    const project = req.params.project || 'account';
    const cleanPath = (req.query.path || '').replace(/^\/+|\/+$/g, '');
    const cfg = getProjectConfig(project);

    // Forward supported Firebase query params
    const queryParams = [];
    if (req.query.orderBy) queryParams.push(`orderBy=${encodeURIComponent(req.query.orderBy)}`);
    if (req.query.equalTo) queryParams.push(`equalTo=${encodeURIComponent(req.query.equalTo)}`);
    if (req.query.limitToFirst) queryParams.push(`limitToFirst=${encodeURIComponent(req.query.limitToFirst)}`);
    if (req.query.limitToLast) queryParams.push(`limitToLast=${encodeURIComponent(req.query.limitToLast)}`);
    if (req.query.startAt) queryParams.push(`startAt=${encodeURIComponent(req.query.startAt)}`);
    if (req.query.endAt) queryParams.push(`endAt=${encodeURIComponent(req.query.endAt)}`);

    const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
    const targetUrl = `${cfg.dbUrl}/${cleanPath}.json${queryString}`;

    const dbResp = await axios.get(targetUrl);
    return res.json(dbResp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    console.error(`[Firebase RTDB Get] ${req.params.project} error:`, msg);
    return res.status(status).json({ error: msg });
  }
};

exports.dbSet = async (req, res) => {
  try {
    const project = req.params.project || 'account';
    const { path, data, method } = req.body;
    const cleanPath = (path || '').replace(/^\/+|\/+$/g, '');
    const cfg = getProjectConfig(project);

    const targetUrl = `${cfg.dbUrl}/${cleanPath}.json`;

    let dbResp;
    if (method === 'update' || method === 'patch') {
      dbResp = await axios.patch(targetUrl, data);
    } else if (method === 'push' || method === 'post') {
      dbResp = await axios.post(targetUrl, data);
    } else if (method === 'delete') {
      dbResp = await axios.delete(targetUrl);
    } else {
      // Default: PUT (set)
      dbResp = await axios.put(targetUrl, data);
    }

    return res.json({ success: true, data: dbResp.data });
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    console.error(`[Firebase RTDB Set] ${req.params.project} error:`, msg);
    return res.status(status).json({ error: msg });
  }
};

exports.dbTransaction = async (req, res) => {
  try {
    const project = req.params.project || 'account';
    const { path, delta } = req.body;
    const cleanPath = (path || '').replace(/^\/+|\/+$/g, '');
    const cfg = getProjectConfig(project);

    const targetUrl = `${cfg.dbUrl}/${cleanPath}.json`;

    // 1. Read current value
    const curResp = await axios.get(targetUrl);
    const curVal = curResp.data || 0;
    const newVal = Number(curVal) + Number(delta);

    if (newVal < 0) {
      return res.status(400).json({ error: 'Nilai tidak mencukupi untuk transaksi ini.' });
    }

    // 2. Write new value
    await axios.put(targetUrl, newVal);
    return res.json({ success: true, value: newVal });
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    return res.status(status).json({ error: msg });
  }
};

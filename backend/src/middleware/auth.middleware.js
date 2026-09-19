const axios = require('axios');

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Izinkan guest jika UID bertipe guest
      const requestedUid = req.body?.uid || req.query?.uid;
      if (requestedUid && requestedUid.startsWith('guest_')) {
        req.user = { uid: requestedUid, isGuest: true };
        return next();
      }
      return res.status(401).json({ error: 'Akses ditolak: Token autentikasi Firebase tidak ditemukan' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      return res.status(401).json({ error: 'Token autentikasi kosong' });
    }

    // Validasi token langsung ke server Google Identity / Firebase
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const tokenInfo = googleRes.data;

    if (!tokenInfo || !tokenInfo.user_id && !tokenInfo.sub) {
      return res.status(403).json({ error: 'Token autentikasi tidak valid atau kadaluarsa' });
    }

    const verifiedUid = tokenInfo.user_id || tokenInfo.sub;
    req.user = {
      uid: verifiedUid,
      email: tokenInfo.email,
      isGuest: false
    };

    // Pastikan UID yang diminta sesuai persis dengan akun yang memiliki token
    const requestedUid = req.body?.uid || req.query?.uid;
    if (requestedUid && requestedUid !== verifiedUid && !requestedUid.startsWith('guest_')) {
      return res.status(403).json({ error: 'Pelanggaran keamanan: UID tidak cocok dengan token yang aktif!' });
    }

    next();
  } catch (err) {
    console.error('Auth verification error:', err.response?.data || err.message);
    return res.status(403).json({ error: 'Token autentikasi tidak valid atau kadaluarsa' });
  }
};

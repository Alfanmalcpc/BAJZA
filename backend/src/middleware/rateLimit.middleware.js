// In-memory lightweight rate limiter (No external dependencies required)
const rateLimits = new Map();

module.exports = function createRateLimiter({ windowMs = 60000, maxRequests = 30, message = 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.' }) {
  return (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const identifier = `${req.user?.uid || clientIp}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = rateLimits.get(identifier);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      rateLimits.set(identifier, record);
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: message });
    }

    next();
  };
};

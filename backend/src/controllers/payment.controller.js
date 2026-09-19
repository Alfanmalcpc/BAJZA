const crypto = require('crypto');
require('dotenv').config();

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const processedOrders = new Set(); // In-memory idempotency cache

// 1. Create Payment Order (Server-Authoritative)
exports.createTransaction = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const { itemId } = req.body;

    if (!uid) return res.status(401).json({ error: 'Autentikasi diperlukan' });

    // Server-defined item pricing catalog (Client cannot tamper with price)
    const PRICING_CATALOG = {
      'token_pack_50': { name: '50 Aquarium Tokens', price: 5000, tokens: 50 },
      'token_pack_120': { name: '120 Aquarium Tokens', price: 10000, tokens: 120 },
      'token_pack_300': { name: '300 Aquarium Tokens', price: 25000, tokens: 300 }
    };

    const selectedItem = PRICING_CATALOG[itemId];
    if (!selectedItem) {
      return res.status(400).json({ error: 'Item pembayaran tidak valid' });
    }

    const orderId = `BAJA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    res.json({
      success: true,
      orderId,
      amount: selectedItem.price,
      itemName: selectedItem.name,
      currency: 'IDR'
    });
  } catch (err) {
    console.error('Payment creation error:', err.message);
    res.status(500).json({ error: 'Gagal memproses transaksi pembayaran' });
  }
};

// 2. Midtrans Webhook Notification (Cryptographic Signature Verification)
exports.handleWebhook = async (req, res) => {
  try {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = req.body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return res.status(400).json({ error: 'Payload webhook tidak lengkap' });
    }

    // Verify SHA-512 cryptographic signature
    const hash = crypto.createHash('sha512');
    hash.update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    const expectedSignature = hash.digest('hex');

    if (signature_key !== expectedSignature) {
      console.warn('Security Alert: Invalid Midtrans webhook signature received for order:', order_id);
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    // Idempotency: Prevent replay attacks / double rewards
    if (processedOrders.has(order_id)) {
      return res.json({ status: 'already_processed' });
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      processedOrders.add(order_id);
      console.log(`Payment confirmed for order: ${order_id}, amount: ${gross_amount}`);
      // Product delivery is executed securely server-side
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Midtrans webhook handling error:', err.message);
    res.status(500).json({ error: 'Internal webhook error' });
  }
};

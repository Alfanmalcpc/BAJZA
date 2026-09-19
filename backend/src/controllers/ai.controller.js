const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.chatWithBazz = async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  if (!GEMINI_API_KEY) {
    return res.json({ reply: 'Halo Alfan! API Key Gemini belum dikonfigurasi di server backend.' });
  }

  const prompt = `Anda adalah Bazz, maskot badak cyber yang ramah dan asisten cerdas resmi dari platform BAJA WEB (baja.my.id) yang dikembangkan oleh Alfan (siswa SMAN 1 Sumberrejo). Jawablah pertanyaan pengguna dengan ramah, informatif, singkat, dan menggunakan bahasa Indonesia yang santai dan natural.\n\nPertanyaan pengguna: ${message.substring(0, 1000)}`;

  const models = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }]
      });

      const candidate = response.data?.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;
      if (replyText) {
        return res.json({ success: true, reply: replyText.trim() });
      }
    } catch (err) {
      console.warn(`Model ${model} failed, trying next fallback:`, err.response?.data?.error?.message || err.message);
    }
  }

  res.status(500).json({ error: 'Gagal mendapatkan respon dari server AI Bazz' });
};

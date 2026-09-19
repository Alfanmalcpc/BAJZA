const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.chatWithBazz = async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  if (!GEMINI_API_KEY) {
    return res.json({ reply: 'Halo Alfan! API Key Gemini belum dikonfigurasi di server backend.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `Anda adalah Bazz, maskot badak cyber yang ramah dan asisten cerdas resmi dari platform BAJA WEB (baja.my.id) yang dikembangkan oleh Alfan (siswa SMAN 1 Sumberrejo). Jawablah pertanyaan pengguna dengan ramah, akurat, dan menggunakan bahasa Indonesia yang santai dan natural.\n\nPertanyaan pengguna: ${message}`;

    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    });

    const candidate = response.data?.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || 'Maaf, Bazz sedang berpikir keras. Coba tanyakan lagi ya!';

    res.json({ success: true, reply: replyText.trim() });
  } catch (err) {
    console.error('Gemini API Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Gagal terhubung ke server AI Bazz' });
  }
};

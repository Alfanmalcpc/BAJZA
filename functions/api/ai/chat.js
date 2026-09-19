export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Pesan tidak boleh kosong' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY belum dikonfigurasi di Cloudflare Environment Variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Kamu adalah Bazz, asisten cerdas resmi BAJA WEB. Jawab pertanyaan pengguna secara langsung, to-the-point, akurat, dan fokus ke inti pertanyaan. Jangan bertele-tele dan jangan menyebutkan nama pembuat web kecuali jika ditanyakan secara spesifik. Pertanyaan: ${message.substring(0, 1000)}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return new Response(JSON.stringify({ error: 'Gemini API Error', details: errData }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || 'Maaf, Bazz sedang berpikir keras.';

    return new Response(JSON.stringify({ success: true, reply: replyText.trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal terhubung ke server AI Bazz', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

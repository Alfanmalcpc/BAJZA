export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Pesan tidak boleh kosong' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API key HANYA diambil dari Environment Variable Cloudflare Pages — tidak pernah hardcoded
    const apiKey = env?.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Layanan AI sedang tidak tersedia.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Kamu adalah Bazz, asisten cerdas resmi BAJA WEB. Jawab pertanyaan pengguna secara langsung, to-the-point, akurat, dan fokus ke inti pertanyaan. Jangan bertele-tele dan jangan menyebutkan nama pembuat web kecuali jika ditanyakan secara spesifik. Pertanyaan: ${message.substring(0, 1000)}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Gagal menghubungi server AI.' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, Bazz sedang berpikir keras.';

    return new Response(JSON.stringify({ success: true, reply: replyText.trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal terhubung ke server AI Bazz.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

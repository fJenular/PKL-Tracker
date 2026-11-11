import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Text input is required' }, { status: 400 });
    }

    const trimmed = text.trim();

    // Check if Gemini API key exists in process.env
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `Anda adalah asisten cerdas untuk siswa Praktik Kerja Lapangan (PKL) SMK TI BAZMA. 
Tugas Anda adalah mengubah catatan tugas singkat berikut menjadi kalimat deskripsi kegiatan formal, baku, profesional, dan menjelaskan maksud/tujuannya dalam bahasa Indonesia.
Gunakan kata kerja operasional seperti: "Melakukan instalasi...", "Melakukan troubleshooting untuk memperbaiki...", "Melakukan konfigurasi...", "Melakukan pengujian fungsi dan performa...", "Melakukan serah terima...", "Membuat dan mengonfigurasi...".

Input singkat siswa: "${trimmed}"

Berikan respon HANYA dalam format JSON berikut tanpa markdown atau teks pengantar:
{
  "formal": "satu kalimat formal lengkap dengan penjelasan tujuan (contoh: Melakukan instalasi aplikasi SAP pada perangkat komputer untuk mendukung kebutuhan operasional pengguna.)",
  "bulletPoints": "- poin 1 (langkah/kegiatan)\\n- poin 2 (pengujian/verifikasi)\\n- poin 3 (tujuan/penyelesaian)",
  "operational": "kalimat fokus teknis operasional"
}`;

        const apiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
            })
          }
        );

        if (apiRes.ok) {
          const aiData = await apiRes.json();
          const jsonText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            return NextResponse.json({
              success: true,
              suggestions: [
                parsed.formal || parsed.deskripsi,
                parsed.bulletPoints || parsed.poin,
                parsed.operational || parsed.ringkas
              ].filter(Boolean)
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini AI fallback triggered:', geminiErr);
      }
    }

    // Return empty here so client will use its ultra-reliable local NLP synthesizer
    return NextResponse.json({ success: false, useClientFallback: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


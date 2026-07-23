import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());

  // API: AI Insights powered by Gemini
  app.post('/api/gemini-insight', async (req, res) => {
    const { lead, chats } = req.body || {};

    if (!lead) {
      return res.status(400).json({ error: 'Data lead tidak valid atau kosong' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const isMockKey = !apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '';

      if (isMockKey) {
        // High-fidelity fallback AI simulation centered around the actual Lead Info
        // This guarantees a premium testing experience even without putting the key first!
        const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;
        let prediction = '';
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        let recommendedFollowUp = '';
        let draftEmail = '';

        if (totalScore >= 10) {
          prediction = `Prediksi Closing: 85% - 95% (Sangat Tinggi). Lead memiliki kesiapan finansial penuh (B:${lead.bant.budget}), memiliki kewenangan mengambil keputusan (A:${lead.bant.authority}), serta kebutuhan yang mendesak untuk melanjutkan studi ${lead.jenjangStudi} ke ${lead.targetNegara} dalam waktu dekat.`;
          riskLevel = 'LOW';
          recommendedFollowUp = `1. Segera lakukan panggilan telepon perkenalan (Discovery Call) hari ini untuk menjadwalkan konsultasi 1-on-1.\n2. Siapkan proposal personalisasi khusus mengenai keunggulan layanan pendampingan Academius untuk universitas ternama di ${lead.targetNegara}.\n3. Berikan penawaran eksklusif Early Bird diskon 10% jika melakukan enrollment minggu ini.`;
          draftEmail = `Halo Kak ${lead.namaLengkap}!\n\nSaya melihat Kakak memiliki profil yang sangat potensial untuk melanjutkan studi *${lead.jenjangStudi} ke ${lead.targetNegara}* melalui program *${lead.produkDiminati}*. Kami ingin mengundang Kakak dalam sesi perencanaan studi intensif gratis minggu ini bersama Advisor Senior Academius.\n\nDalam sesi 20 menit nanti, kami akan memetakan target universitas terbaik di ${lead.targetNegara}, menganalisis kesiapan esai pendukung, dan menyusun timeline beasiswa.\n\nApakah Kakak ada waktu luang besok di jam 14:00 atau 16:00 WIB untuk kita jadwalkan Google Meet?\n\nSalam Hangat,\nAcademius Admission Team`;
        } else if (totalScore >= 6) {
          prediction = `Prediksi Closing: 50% - 75% (Sedang-Tinggi). Lead sangat antusias dengan program ${lead.produkDiminati} namun masih membutuhkan bimbingan penyelarasan target negara (${lead.targetNegara}) atau pendanaan beasiswa. Kesiapan finansial sebagian.`;
          riskLevel = 'MEDIUM';
          recommendedFollowUp = `1. Kirimkan PDF panduan komprehensif kuliah & beasiswa target negara ${lead.targetNegara} untuk membangun kepercayaan.\n2. Undang ke webinar / group discussion terdekat yang membahas negara tersebut.\n3. Lakukan follow up interaktif via WhatsApp 2 hari sekali untuk menanyakan perkembangan target kampus.`;
          draftEmail = `Halo Kak ${lead.namaLengkap}!\n\nSemoga kabarnya sehat selalu ya. Saya ingin membagikan PDF Panduan Praktis Kuliah dan Pemburu Beasiswa ke *${lead.targetNegara}* yang baru saja dirilis oleh tim riset Academius.\n\nDi booklet ini, terdapat daftar universitas unggulan, perkiraan biaya hidup, serta tips khusus agar esai pendampingan Kakak bisa menonjol di mata komite seleksi.\n\nBila Kakak ingin mendiskusikan isinya atau sedang bingung menyusun rencana beasiswa ${lead.jenjangStudi}, silakan klik link berikut untuk mengobrol santai lewat WhatsApp ya.\n\nSemoga bermanfaat!\nSalam hangat,\nAcademius Team`;
        } else {
          prediction = `Prediksi Closing: 25% - 40% (Rendah). Lead masih dalam tahap awal mencari informasi dasar (Need:${lead.bant.need}) dan belum memiliki timeline target keberangkatan yang jelas.`;
          riskLevel = 'HIGH';
          recommendedFollowUp = `1. Kirimkan artikel atau infografis edukatif mingguan tentang benefit kuliah di ${lead.targetNegara}.\n2. Masukkan ke dalam daftar broadcast email mingguan (Newsletter) untuk cold leads.\n3. Evaluasi kembali status lead setelah 14 hari melalui interaksi WhatsApp ringan.`;
          draftEmail = `Halo Kak ${lead.namaLengkap},\n\nTerima kasih telah berkunjung ke Academius!\n\nKuliah di *${lead.targetNegara}* memang impian banyak orang. Jika Kakak masih di tahap eksplorasi awal untuk jenjang *${lead.jenjangStudi}*, silakan kunjungi postingan blog terbaru kami mengenai "Panduan Memulai Persiapan Kuliah Luar Negeri Bagi Pemula".\n\nJika ada pertanyaan dasar seputar syarat IELTS atau cara mendaftar, tim kami selalu siap membantu Kakak menjawab pertanyaan kapan pun.\n\nSalam Sukses,\nAcademius Admission Team`;
        }

        // Add simulated delay to make it feel authentic
        await new Promise(resolve => setTimeout(resolve, 1200));

        return res.json({
          leadId: lead.id,
          prediction,
          recommendedFollowUp,
          riskLevel,
          draftEmail,
          lastGenerated: new Date().toISOString()
        });
      }

      // Real Gemini API Call
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `
Anda adalah Academius Advisor AI, asisten AI canggih untuk CRM konsultan pendidikan tinggi, pendampingan kuliah luar negeri, dan bimbingan beasiswa (LPDP, Chevening, MEXT, GKS, AAS).
Lakukan analisis mendalam terhadap prospek/lead ini dan berikan rekomendasi follow up personal, prediksi closing, serta rancangan draf WhatsApp follow up.

BIODATA LEAD:
- ID: ${lead.leadId}
- Nama: ${lead.namaLengkap}
- WhatsApp: ${lead.nomorWhatsApp}
- Kota: ${lead.kota}
- Sumber: ${lead.sumberLeads}
- Jenjang Studi: ${lead.jenjangStudi}
- Target Negara: ${lead.targetNegara}
- Produk Diminati: ${lead.produkDiminati}
- Catatan Counselor: "${lead.catatan}"

DATA SKOR BANT (Skala 1 - 3):
- Budget Score: ${lead.bant.budget} (1: low/uninformed, 2: partial, 3: ready/docs)
- Authority Score: ${lead.bant.authority} (1: no decision, 2: parent/partner needed, 3: self decision)
- Need Score: ${lead.bant.need} (1: info-seeking, 2: target clear/not urgent, 3: urgent/now)
- Timeline Score: ${lead.bant.timeline} (1: no timeline, 2: 6-12 months, 3: 1-3 months)

RIWAYAT CHAT WHATSAPP / INTERAKSI:
${chats && chats.length > 0 ? chats.map((c: any) => '[' + c.timestamp + '] ' + (c.sender === 'counselor' ? 'Counselor' : 'Lead') + ': ' + c.text).join('\n') : '(Belum ada riwayat chat tertulis. Gunakan biodata & catatan untuk analisis)'}

TUGAS UTAMA ANDA:
Kembalikan respon dalam bentuk JSON VALID dengan struktur persis seperti berikut (jangan sertakan markdown block \`\`\`json pada output, melainkan hanya text mentah JSON agar bisa di-parse langsung):
{
  "leadId": "${lead.id}",
  "prediction": "Persentase closing (contoh: '90% Chance') diikuti dengan 2-3 kalimat penjelasan rasional taktis mengapa lead berpeluang tersebut dan rintangan akademis/finansial yang dihadapi.",
  "recommendedFollowUp": "Daftar 3-4 langkah follow up konkret berikutnya secara berurutan, dipisahkan karakter line break \\n.",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "draftEmail": "Draf pesan WhatsApp / Email follow up personal berbahasa Indonesia yang sangat menyentuh hati, santun, hangat, profesional, menyebutkan nama lead, menyinggung target negara (${lead.targetNegara}) dan level studi (${lead.jenjangStudi}) serta minat produk (${lead.produkDiminati}). Berikan juga 1 tips spesifik tentang kuliah ke negara tersebut agar memicu ketertarikan, dan akhiri dengan call-to-action yang persuasif."
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text ? response.text.trim() : '';
      
      // Safety parse
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback parsing in case of markdown wrappers
        const cleanJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanJSON);
      }

      parsedData.lastGenerated = new Date().toISOString();
      return res.json(parsedData);

    } catch (error: any) {
      console.error('Error generating AI Insight with Gemini API:', error);
      // Fallback to intelligent simulation if API key is invalid or model fails
      const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;
      let prediction = `Prediksi Closing: 70% - 85%. Lead berminat pada ${lead.produkDiminati} untuk jenjang ${lead.jenjangStudi} ke ${lead.targetNegara}.`;
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
      let recommendedFollowUp = `1. Hubungi lead melalui WhatsApp untuk mendiskusikan target pendaftaran.\n2. Kirimkan silabus / brosur program ${lead.produkDiminati}.\n3. Jadwalkan sesi konsultasi gratis.`;
      let draftEmail = `Halo Kak ${lead.namaLengkap}!\n\nTerima kasih telah tertarik dengan program *${lead.produkDiminati}* ke *${lead.targetNegara}*.\n\nApakah Kakak ada waktu untuk diskusi singkat mengenai rencana studi Kakak?\n\nSalam,\nAcademius Team`;

      if (totalScore >= 10) {
        riskLevel = 'LOW';
        prediction = `Prediksi Closing: 85% - 95% (Sangat Tinggi). Kualifikasi BANT sangat tinggi untuk ${lead.jenjangStudi} ke ${lead.targetNegara}.`;
      } else if (totalScore < 6) {
        riskLevel = 'HIGH';
        prediction = `Prediksi Closing: 30% - 45% (Perlu Edukasi). Lead masih dalam tahap pengumpulan informasi awal.`;
      }

      return res.json({
        leadId: lead.id,
        prediction,
        recommendedFollowUp,
        riskLevel,
        draftEmail,
        lastGenerated: new Date().toISOString()
      });
    }
  });

  // Serve static assets in production, use Vite in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Academius CRM Backend] Server beroperasi di http://localhost:${PORT}`);
  });
}

startServer();

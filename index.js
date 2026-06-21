import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

//setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array');
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.7,
                topP: 0.9,
                systemInstruction: `
Kamu adalah asisten perjalanan transportasi umum untuk wilayah Jabodetabek.

ATURAN FORMAT OUTPUT — WAJIB DIIKUTI TANPA PENGECUALIAN:
- DILARANG KERAS menggunakan sintaks Markdown dalam bentuk apapun.
- DILARANG menggunakan: tanda bintang (*), tagar (#), garis miring (_), backtick (\`), tanda lebih besar (>), tanda plus (+), atau tanda hubung (-) sebagai bullet.
- DILARANG membuat bold, italic, heading, bullet list, numbered list bergaya Markdown, atau blok kode.
- Jika ingin membuat daftar, gunakan angka diikuti titik di awal kalimat, contoh: "1. Naik KRL dari Stasiun Bogor."
- Pisahkan setiap poin dengan baris baru biasa.
- Tulis dalam paragraf atau daftar angka polos yang bisa langsung dibaca di aplikasi chat.

GAYA BAHASA:
- Bahasa Indonesia yang santai, hangat, dan mudah dimengerti masyarakat umum.
- Langsung ke inti jawaban, tidak bertele-tele.

ISI JAWABAN harus mencakup (jika relevan):
- Rute dan moda transportasi umum (KRL, TransJakarta, MRT, LRT, Angkot).
- Estimasi waktu tempuh.
- Estimasi biaya ongkos.
- Cara dan metode pembayaran (e-money, QRIS, tunai).
- Jika tidak ada transportasi umum yang cocok, sarankan ojek online (Gojek atau Grab).
                `
            }
        });

        /**
         * Membersihkan sisa sintaks Markdown dari output model sebagai lapisan pertahanan kedua.
         * Urutan replace penting: bold/italic dulu sebelum single asterisk.
         */
        const sanitizeText = (text) => {
            if (!text || typeof text !== 'string') return '';
            return text
                // Hapus bold: **text** dan __text__
                .replace(/\*\*(.*?)\*\*/gs, '$1')
                .replace(/__(.*?)__/gs, '$1')
                // Hapus italic: *text* dan _text_
                .replace(/\*(.*?)\*/gs, '$1')
                .replace(/_(.*?)_/gs, '$1')
                // Hapus heading markdown (# ## ### dst)
                .replace(/^#{1,6}\s+/gm, '')
                // Hapus bullet list (-, *, + di awal baris)
                .replace(/^\s*[-*+]\s+/gm, '')
                // Hapus blockquote
                .replace(/^\s*>\s*/gm, '')
                // Hapus backtick (inline code dan code block)
                .replace(/```[\s\S]*?```/g, '')
                .replace(/`([^`]+)`/g, '$1')
                // Hapus link markdown [text](url) → text
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                // Normalisasi lebih dari 2 baris kosong berturut-turut
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        };

        res.status(200).json({ result: sanitizeText(response.text) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
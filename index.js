
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const GEMINI_MODEL = 'gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Warn if API key is missing
if (!apiKey) {
    console.error(
        'Configuration error: GEMINI_API_KEY is missing from .env'
    );
}

// Sanitize Markdown from model output
function sanitizeText(text) {
    if (typeof text !== 'string' || !text.trim()) {
        return '';
    }

    return text
        // Remove bold and italic markers
        .replace(/\*\*(.*?)\*\*/gs, '$1')
        .replace(/__(.*?)__/gs, '$1')
        .replace(/\*(.*?)\*/gs, '$1')
        .replace(/_(.*?)_/gs, '$1')

        // Remove Markdown headings
        .replace(/^#{1,6}[ \t]+/gm, '')

        // Remove Markdown bullet markers
        .replace(/^[ \t]*[-*+][ \t]+/gm, '')

        // Remove blockquote markers
        .replace(/^[ \t]*>[ \t]?/gm, '')

        // Remove fenced code block markers
        .replace(/```[^\n]*\n?/g, '')

        // Remove inline code markers
        .replace(/`([^`]+)`/g, '$1')

        // Convert Markdown links to their text labels
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

        // Normalize excessive blank lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    return res.status(200).json({
        status: 'ok',
        service: 'gemini-chatbot-api',
        model: GEMINI_MODEL,
        apiKeyConfigured: Boolean(apiKey)
    });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        // Check API configuration
        if (!ai) {
            return res.status(503).json({
                error: 'Layanan AI belum dikonfigurasi. Silakan hubungi administrator.'
            });
        }

        // Validate request body
        const { conversation } = req.body ?? {};

        if (!Array.isArray(conversation) || conversation.length === 0) {
            return res.status(400).json({
                error: 'Percakapan tidak boleh kosong.'
            });
        }

        // Validate conversation messages
        const validMessages = conversation.every((message) => {
            if (!message || typeof message !== 'object') {
                return false;
            }

            const { role, text } = message;

            return (
                ['user', 'model'].includes(role) &&
                typeof text === 'string' &&
                text.trim().length > 0
            );
        });

        if (!validMessages) {
            return res.status(400).json({
                error: 'Format pesan tidak valid.'
            });
        }

        // Convert conversation to Gemini format
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        // Generate response using Gemini
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.7,
                topP: 0.9,

                systemInstruction: `
Kamu adalah asisten perjalanan transportasi umum untuk wilayah Jabodetabek.

ATURAN FORMAT OUTPUT:
1. Hindari sintaks Markdown. Jangan gunakan bold, italic, heading, bullet Markdown, atau blok kode.
2. Jika membuat daftar, gunakan angka diikuti titik, lalu tulis setiap poin pada baris baru.
3. Gunakan paragraf atau daftar angka polos yang mudah dibaca di aplikasi chat.

GAYA BAHASA:
1. Gunakan Bahasa Indonesia yang santai, hangat, dan mudah dimengerti.
2. Jawab langsung ke inti pertanyaan dan hindari penjelasan bertele-tele.

CAKUPAN JAWABAN:
1. Fokus pada transportasi umum di wilayah Jabodetabek.
2. Jelaskan rute dan moda transportasi yang relevan, seperti KRL, TransJakarta, MRT, LRT, dan angkot.
3. Berikan estimasi waktu tempuh dan tarif jika relevan.
4. Jelaskan metode pembayaran jika informasinya tersedia.
5. Jika tidak ada pilihan transportasi umum yang cocok, kamu boleh menyarankan ojek online seperti Gojek atau Grab.
6. Jangan mengklaim memiliki data jadwal, tarif, kondisi lalu lintas, atau informasi real-time jika tidak tersedia.
7. Jika tidak yakin terhadap detail rute atau tarif, jelaskan bahwa informasi tersebut perlu diverifikasi.
8. Jika pertanyaan di luar cakupan transportasi Jabodetabek, jelaskan dengan sopan bahwa pertanyaan tersebut di luar cakupan layanan.
                `.trim()
            }
        });

        // Extract and sanitize response
        const result = sanitizeText(response.text);

        if (!result) {
            console.error('Gemini returned an empty or unusable response.');

            return res.status(502).json({
                error: 'AI belum dapat memberikan jawaban. Silakan coba lagi.'
            });
        }

        // Return successful response
        return res.status(200).json({ result });

    } catch (error) {
        // Log diagnostic information on the server only
        const upstreamStatus = Number(error?.status);

        console.error('Chat API error:', {
            message: error?.message || 'Unknown error',
            status: Number.isFinite(upstreamStatus)
                ? upstreamStatus
                : undefined,
            code: error?.code
        });

        // Handle invalid or unauthorized Gemini credentials
        if (upstreamStatus === 401 || upstreamStatus === 403) {
            return res.status(502).json({
                error: 'Layanan AI sedang mengalami masalah konfigurasi.'
            });
        }

        // Handle rate limits or quota errors
        if (upstreamStatus === 429) {
            return res.status(503).json({
                error: 'Layanan AI sedang mencapai batas penggunaan. Silakan coba lagi nanti.'
            });
        }

        // Handle requests rejected by the upstream API
        if (upstreamStatus === 400) {
            return res.status(502).json({
                error: 'Layanan AI tidak dapat memproses permintaan saat ini.'
            });
        }

        // Handle upstream service failures
        if (upstreamStatus >= 500 && upstreamStatus <= 599) {
            return res.status(502).json({
                error: 'Layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.'
            });
        }

        // Handle unexpected server errors
        return res.status(500).json({
            error: 'Terjadi kesalahan pada server. Silakan coba lagi.'
        });
    }
});

// Handle malformed JSON request bodies
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Format JSON tidak valid.'
        });
    }

    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Ukuran pesan terlalu besar.'
        });
    }

    return next(err);
});

// Generic Express error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', {
        message: err?.message || 'Unknown error'
    });

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        error: 'Terjadi kesalahan pada server.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server ready on http://localhost:${PORT}`);
});

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
                    Anda adalah asisten travelling yang membantu dalam pemilihan transportasi umum di area Jabodetabek
                    Jawab hanya pertanyaan terkait bepergian dan perjalanan pulang dengan transportasi umum,
                    Tanyakan jenis transportasi umum, stasiun keberangkatan-kedatangan, waktu keberangkatan-ketibaan,
                    Tanyakan juga apakah sudah mempunyai sistem pemabyaran seperti QrisTap atau menggunakan e-money,
                    Berikan juga estimasi waktu perjalanan, biaya , dan moda transpotasi yang sesuai dengan tujuan,
                    Jika tidak memungkinkan dengan transportasi umum boleh menyarankan untuk melanjutkan perjalanan dengan ojek online.
                `
            }
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
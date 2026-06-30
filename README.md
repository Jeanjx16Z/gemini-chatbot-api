# Sambung Rute Chatbot 🚌

Chatbot asisten transportasi umum Jabodetabek yang ditenagai oleh Google Gemini AI. Pengguna dapat bertanya tentang rute, estimasi waktu, biaya, dan cara pembayaran transportasi umum seperti KRL, TransJakarta, MRT, LRT, dan Angkot.

---

## 📁 Struktur Folder

```
gemini-chatbot-api/
├── public/
│   ├── index.html      # Tampilan antarmuka chatbot
│   ├── script.js       # Logika chat di sisi klien (fetch API, render pesan)
│   └── style.css       # Styling UI dengan tema dark blue
├── .env                # Menyimpan API key (tidak di-commit)
├── .gitignore
├── index.js            # Entry point server Express + handler API Gemini
├── package.json
└── package-lock.json
```

---

## 🚀 Cara Menjalankan Project

### 1. Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- npm (sudah termasuk bersama Node.js)

### 2. Clone & Install Dependensi

```bash
git clone <url-repository>
cd gemini-chatbot-api
npm install
```

### 3. Konfigurasi API Key

Buat file `.env` di root project, lalu isi dengan API key dari [Google AI Studio](https://aistudio.google.com/app/apikey):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Jalankan Server

```bash
node index.js
```

Server akan berjalan di:

```
http://localhost:3000
```

Buka URL tersebut di browser untuk mulai menggunakan chatbot.

---

## 🔌 API Endpoint

### `POST /api/chat`

Mengirim percakapan ke Gemini AI dan mengembalikan respons teks yang sudah dibersihkan dari sintaks Markdown.

**Request Body:**

```json
{
  "conversation": [
    { "role": "user", "text": "Bagaimana cara ke Monas dari Bogor?" },
    { "role": "model", "text": "Kamu bisa naik KRL dari Stasiun Bogor..." },
    { "role": "user", "text": "Berapa biayanya?" }
  ]
}
```

| Field          | Tipe    | Keterangan                                                        |
|----------------|---------|-------------------------------------------------------------------|
| `conversation` | `Array` | Array riwayat chat. Setiap item berisi `role` dan `text`.         |
| `role`         | `String`| Nilai: `"user"` untuk pengguna, `"model"` untuk respons AI.       |
| `text`         | `String`| Isi pesan dari role yang bersangkutan.                            |

**Response Sukses (`200`):**

```json
{
  "result": "Untuk ke Monas dari Bogor, kamu bisa naik KRL Commuter Line jurusan Jakarta Kota..."
}
```

**Response Error (`500`):**

```json
{
  "error": "Pesan error dari server"
}
```

---

## 🛠️ Tech Stack

### 🎨 Frontend

| Teknologi | Keterangan |
|-----------|------------|
| HTML5 | Struktur halaman chatbot |
| CSS3 | Styling dengan tema dark glassmorphism, CSS Variables, Flexbox, Grid |
| Vanilla JavaScript (ES6+) | Logika UI: event listener, fetch API, manipulasi DOM |

### ⚙️ Backend

| Teknologi | Keterangan |
|-----------|------------|
| Node.js | Runtime JavaScript sisi server |
| Express.js v5 | Framework web untuk routing dan serving static files |
| ES Modules (`type: "module"`) | Sintaks `import/export` modern di Node.js |
| dotenv | Manajemen environment variable dari file `.env` |
| cors | Middleware untuk mengizinkan Cross-Origin Request |

### 🔗 API

| Teknologi | Keterangan |
|-----------|------------|
| Google GenAI SDK (`@google/genai`) | SDK resmi untuk mengakses Google Gemini API |
| REST API (`POST /api/chat`) | Endpoint internal yang menjembatani frontend dengan Gemini |

### 🤖 LLM (Large Language Model)

| Teknologi | Keterangan |
|-----------|------------|
| Google Gemini 2.5 Flash | Model LLM yang digunakan (`gemini-2.5-flash`) |
| System Instruction | Prompt khusus untuk membatasi domain jawaban pada transportasi umum Jabodetabek |
| Multi-turn Conversation | Riwayat percakapan dikirim setiap request untuk menjaga konteks |

---

## ⚙️ Konfigurasi Model

Model dikonfigurasi dengan parameter berikut di `index.js`:

| Parameter | Nilai | Keterangan |
|-----------|-------|------------|
| `model` | `gemini-2.5-flash` | Model Gemini yang dipakai |
| `temperature` | `0.7` | Keseimbangan antara kreativitas dan konsistensi jawaban |
| `topP` | `0.9` | Mengontrol keberagaman token yang dipilih model |
| `systemInstruction` | *(lihat index.js)* | Membatasi chatbot hanya menjawab topik transportasi Jabodetabek |

---

## 📝 Catatan

- File `.env` tidak boleh di-commit ke repository. Pastikan sudah masuk ke `.gitignore`.
- Output dari Gemini diproses melalui fungsi `sanitizeText()` untuk menghapus sisa sintaks Markdown agar tampil rapi di UI chat.
- Chatbot hanya dirancang untuk menjawab pertanyaan seputar transportasi umum Jabodetabek (KRL, TransJakarta, MRT, LRT, Angkot, dan ojek online sebagai alternatif).

# Dashboard Analisis Sentimen Dakwah Digital — Versi JavaScript/Vercel

Aplikasi ini adalah konversi dari dashboard Python Streamlit menjadi aplikasi **React + Vite** berbasis JavaScript agar mudah di-host di **Vercel**.

## Fitur

- Memuat data default dari `public/data/tweets.csv`
- Upload CSV dari browser
- Preprocessing teks: hapus URL, mention, hashtag, normalisasi slang
- Analisis sentimen lexicon-based Bahasa Indonesia
- Penanganan negasi, intensifier, dan emoji
- KPI card, grafik distribusi sentimen, tren waktu, engagement, heatmap aktivitas, kata kunci, top user, top tweet
- Export hasil analisis ke CSV

## Struktur Proyek

```text
dakwah_dashboard_js/
├── public/
│   └── data/
│       └── tweets.csv
├── src/
│   ├── lib/
│   │   ├── aggregations.js
│   │   ├── analysis.js
│   │   └── lexicon.js
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vercel.json
└── README.md
```

## Menjalankan di Lokal

```bash
npm install
npm run dev
```

Buka alamat yang muncul, biasanya `http://localhost:5173`.

## Build Production

```bash
npm run build
npm run preview
```

## Deploy ke Vercel

1. Upload folder ini ke GitHub.
2. Buka Vercel dan pilih **Add New Project**.
3. Import repository GitHub.
4. Vercel biasanya otomatis membaca framework **Vite**.
5. Pastikan konfigurasi berikut:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Klik **Deploy**.

## Format CSV

CSV harus memiliki kolom berikut:

```text
id,tanggal,username,teks,likes,retweet
```

Contoh:

```csv
tw_001,2025-04-05 08:15:00,dakwah_indo,Ada kajian online hari ini,62,4
```

## Catatan Konversi

Versi ini tidak lagi membutuhkan Python, Streamlit, Pandas, atau Plotly. Seluruh proses preprocessing dan analisis sentimen berjalan di browser menggunakan JavaScript.

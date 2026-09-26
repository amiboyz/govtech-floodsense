# FloodSense Investment Resilience

MVP web untuk pemetaan paparan banjir terhadap lokasi investasi Jakarta, monitoring NowCast/Forecast, evidence, dan due diligence.

**Fokus aktif: Historical Lab.** Halaman utama kini menampilkan kajian hujan → prediksi TMA +6 jam → observasi pembanding dari snapshot database lokal. Prediksi area genangan dan persentase ketepatan banjir belum tersedia. Skenario postcast manual lama tidak digunakan sebagai bukti.

Lihat [review historis, temuan audit, hasil model, dan cara reproduksi](docs/HISTORICAL_REVIEW.md). Untuk membuka build lokal: `npm run build`, lalu `npm start`, kunjungi `http://localhost:8787`. Jangan menimpa `.env` yang sudah berisi konfigurasi Anda. Instruksi `cp` di bawah hanya untuk instalasi baru.

```bash
cp .env.example .env
npm install
npm run dev
```

Dashboard: `http://localhost:5173`  
API: `http://localhost:8787/api/v1/health`

Panduan database, model, dan deployment ada di [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

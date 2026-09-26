# FloodSense Investment Resilience - panduan implementasi

## Arsitektur MVP

Aplikasi memakai React untuk dashboard dan Express untuk API. MySQL menjadi serving store untuk development dan production. Kredensial tidak disimpan di repository. Semua keluaran model memiliki versi, input cutoff, status release, confidence, dan keterbatasan.

Alur data:

`sumber historis -> audit skema -> staging/curated -> model_training_rows -> training/backtest -> model_versions -> predictions -> API -> dashboard`

Model yang disiapkan:

- `nowcast_classifier`: regresi logistik dengan feature hujan 1/3/6/24 jam, TMA, dan delta TMA 1 jam. Split 80/20 dilakukan berdasarkan waktu, bukan acak.
- `forecast_regressor`: baseline tren linear untuk horizon pendek. Baseline ini harus dibandingkan dengan persistence dan kandidat model lain sebelum status operational.

Model baru selalu berstatus `experiment`. Perubahan ke `candidate` atau `operational` harus melewati rolling-origin backtest, review hidrologi, UAT threshold, model card, serta fallback/rollback.

## Menjalankan aplikasi

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`. Default memakai `DEMO_MODE=true`. Banner pada aplikasi menjelaskan bahwa sinyal hidrologi dan skor risiko merupakan skenario demo.

## Database development

Database yang digunakan: `local_govtech_floodsense`.

Opsi MySQL yang sudah terpasang:

```bash
mysql.server start
npm run db:migrate
npm run db:import-investments
```

Opsi Docker:

```bash
docker compose up -d mysql
```

Lalu ubah `.env` lokal:

```text
DB_PASSWORD=floodsense_local_only
```

Jalankan migrasi dan importer. Importer membaca 526 POI bersih serta 19 peluang dari `docs/data invest` dan menggunakan upsert sehingga aman dijalankan ulang.

## Audit database historis

Dokumentasi menyebut database historis `floodsense_2026_08_30`. Verifikasi ulang sebelum membuat query transformasi:

```bash
SOURCE_DB_DATABASE=floodsense_2026_08_30 npm run db:audit-source
```

Audit memeriksa keberadaan tabel dan kolom penting pada `jakarta_tma`, `jakarta_ch`, dan `pu_sitaba_disaster_report`. Jangan menjalankan training sebelum tabel feature memiliki timestamp, unit, koordinat, quality flag, serta lineage yang benar.

## Training dengan time series aktual

1. Normalisasi data historis ke `observations` dan `flood_events`.
2. Materialisasi feature ke `model_training_rows`. Setiap baris wajib menyimpan `source_lineage_json`.
3. Pastikan label `flood_within_horizon` hanya memakai kejadian setelah `feature_time`. Feature tidak boleh membaca masa depan.
4. Jalankan:

```bash
npm run model:train
```

Perintah gagal dengan `INSUFFICIENT_DATA` bila baris layak kurang dari 100. Hasil training tersimpan di `model_versions` dengan status `experiment` dan metrik precision, recall, F1, false alarm, missed event, serta Brier score.

## Production

Set environment variable berikut dari secret manager server:

```text
APP_ENV=production
DEMO_MODE=false
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
DB_SSL=true
WEB_ORIGIN=https://domain-resmi.example
```

Gunakan database user terpisah dengan least privilege. Aktifkan TLS, backup, restore test, centralized log, dan monitoring stale feed. Database production tidak boleh memakai kredensial development.

## API MVP

- `GET /api/v1/health`
- `GET /api/v1/dashboard`
- `GET /api/v1/locations?category=&q=&limit=`
- `GET /api/v1/nowcast`
- `GET /api/v1/forecasts`
- `GET /api/v1/models`

Semua response memakai envelope `data` dan `meta`, termasuk `generated_at`, `data_mode`, timezone, serta limitation.

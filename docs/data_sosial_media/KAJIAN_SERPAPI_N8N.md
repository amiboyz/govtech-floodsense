# Kajian Integrasi SerpApi dan n8n untuk Sinyal Banjir Masyarakat

## Ringkasan keputusan

SerpApi layak digunakan sebagai **sumber penemuan konten eksternal** untuk MVP FloodSense. SerpApi tidak boleh diperlakukan sebagai sumber kejadian banjir resmi maupun sebagai representasi lengkap percakapan media sosial.

Posisi yang disarankan:

```text
SerpApi/Google Search
        |
        v
Kandidat konten banjir publik
        |
        v
Normalisasi, deduplikasi, lokasi indikatif
        |
        v
social_flood_reports
        |
        v
Korelasi laporan + hujan + TMA
        |
        v
community_flood_signals
        |
        v
Verifikasi operator
        |
        v
flood_events (kejadian resmi)
```

Label antarmuka yang tepat adalah **"Sinyal eksternal — belum terverifikasi"**, bukan "Laporan banjir resmi".

## Tujuan

1. Menemukan unggahan atau berita publik mengenai banjir, genangan, jalan terendam, luapan sungai, dan rob di Jabodetabek.
2. Menyediakan antrean verifikasi lebih awal bagi operator.
3. Menghubungkan indikasi masyarakat dengan hujan, TMA, sungai, dan laporan resmi yang sudah dimiliki FloodSense.
4. Menjaga pemisahan tegas antara data resmi, sinyal eksternal, dan hasil analisis.

## Kelebihan SerpApi

- Integrasi sederhana melalui HTTP Request di n8n.
- Satu antarmuka dapat menemukan hasil web, berita, video, dan halaman sosial yang sudah diindeks mesin pencari.
- Hasil berupa JSON terstruktur, sehingga tidak perlu mengelola proxy, CAPTCHA, dan parser Google sendiri.
- Mendukung kueri lanjutan seperti `site:`, frasa, pengecualian, bahasa, dan lokasi pencarian.
- Baik untuk validasi silang lintas portal berita dan platform.

## Kekurangan dan batas interpretasi

- Bukan aliran data realtime dari X, TikTok, Instagram, atau YouTube.
- Konten baru dapat terlambat atau tidak pernah terindeks Google.
- Tidak memberikan metrik viralitas asli yang lengkap seperti laju repost, share, komentar, atau view per menit.
- Posisi hasil Google adalah relevansi pencarian, bukan tingkat kebenaran atau viralitas.
- Hasil yang sama dapat berubah antarwaktu dan antarlokasi pencarian.
- Snippet dapat terpotong, salah konteks, atau mengacu pada kejadian lama.
- Temuan SerpApi tidak boleh otomatis dipromosikan menjadi `flood_events`.

## Desain workflow n8n

Workflow impor yang sudah dikonfigurasi menggunakan node resmi komunitas SerpApi tersedia di `FloodSense - SerpApi Social Flood Discovery rev1.json`. File `floodsense-serpapi-monitoring.n8n.json` dipertahankan sebagai rancangan awal berbasis HTTP Request generik.

```text
Manual Trigger / Schedule 15 menit
              |
              v
Build Search Queries
              |
              v
SerpApi Google Search
              |
              v
Normalize and Score
              |
              v
MySQL Upsert
```

Workflow membuat empat kelompok pencarian:

1. X.
2. TikTok dan Instagram.
3. YouTube.
4. Web dan media lokal.

Jadwal awal yang disarankan adalah 15 menit. Saat hujan normal, jadwal dapat diturunkan menjadi 30 menit. Ketika hujan atau TMA melewati ambang, workflow dapat dipercepat menjadi 5–10 menit melalui workflow terpisah.

## Konfigurasi sebelum aktivasi

### 1. Credential SerpApi

Buat credential n8n dengan tipe **HTTP Query Auth**:

```text
Name  : api_key
Value : API key SerpApi
```

Pasangkan credential tersebut ke node `SerpApi Google Search`.

Jangan menulis API key langsung di JSON workflow atau source code.

### 2. Credential MySQL

Buat credential MySQL n8n yang mengarah ke database FloodSense. Gunakan user khusus dengan hak minimum:

```text
SELECT, INSERT, UPDATE
```

Jangan menggunakan akun `root` untuk workflow produksi.

Pasangkan credential ke node `MySQL Upsert Social Report`.

### 3. Timezone

Atur timezone workflow dan instance:

```text
Asia/Jakarta
```

Schedule Trigger bergantung pada timezone workflow/instance dan workflow harus dipublikasikan agar jadwal berjalan.

## Skema database

Jalankan migrasi berikut sebelum mengaktifkan workflow:

```sql
CREATE TABLE IF NOT EXISTS social_flood_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(30) NOT NULL,
  external_id VARCHAR(700) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  title VARCHAR(500) NULL,
  text_content TEXT NULL,
  source_published_text VARCHAR(120) NULL,
  published_at DATETIME NULL,
  collected_at DATETIME NOT NULL,

  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  location_name VARCHAR(200) NULL,
  location_method ENUM(
    'platform_gps',
    'text_alias',
    'manual',
    'unknown'
  ) NOT NULL DEFAULT 'unknown',
  location_confidence DECIMAL(4,3) NOT NULL DEFAULT 0,

  search_position INT UNSIGNED NULL,
  relevance_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  discovery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  viral_score DECIMAL(5,2) NULL,
  credibility_score DECIMAL(5,2) NULL,

  collection_method VARCHAR(60) NOT NULL,
  verification_status ENUM(
    'unreviewed',
    'needs_review',
    'verified',
    'rejected'
  ) NOT NULL DEFAULT 'unreviewed',

  raw_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY social_platform_external_unique (platform, external_id),
  KEY social_time_idx (published_at),
  KEY social_collected_idx (collected_at),
  KEY social_status_idx (verification_status),
  KEY social_platform_idx (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`external_id` dalam workflow berisi URL yang telah dinormalisasi. Query string dan fragment URL dibuang untuk mengurangi duplikasi.

## Kueri pencarian

Contoh kueri dasar:

```text
(banjir OR kebanjiran OR genangan OR "air naik" OR
 "jalan terendam" OR "sungai meluap" OR rob)
(Jakarta OR Bekasi OR Depok OR Tangerang)
(site:x.com OR site:tiktok.com OR site:instagram.com)
```

Istilah negatif yang disaring:

```text
banjir diskon
banjir order
banjir hadiah
banjir dukungan
game
film
```

Kueri perlu dievaluasi berkala menggunakan sampel false positive dan false negative. Nama kelurahan rawan dapat ditambahkan ke kamus lokasi pada node `Normalize and Score`.

## Penilaian awal

Workflow menghasilkan dua angka awal:

### Relevance score

Mengukur kesesuaian isi dengan topik banjir dan wilayah Jabodetabek. Skor dipengaruhi oleh:

- Kata banjir/genangan/terendam.
- Istilah dampak seperti jalan, rumah, kendaraan, sungai, dan drainase.
- Nama wilayah yang dikenali.
- Penalti untuk istilah metaforis atau promosi.

### Discovery score

Mengukur kekuatan temuan dalam konteks mesin pencari, bukan viralitas platform. Skor dipengaruhi oleh:

- Posisi hasil pencarian.
- Ketersediaan thumbnail atau bukti visual.
- Lokasi yang dapat dikenali.
- Kesesuaian topik.

`viral_score` dan `credibility_score` sengaja dibiarkan `NULL`. Keduanya baru boleh dihitung setelah tersedia metrik platform, laporan independen, bukti media, serta korelasi sensor.

## Aturan promosi menjadi sinyal

Temuan dapat masuk antrean `needs_review` jika salah satu kondisi terpenuhi:

1. Sedikitnya tiga sumber independen menyebut lokasi yang sama dalam 30 menit.
2. Sedikitnya dua sumber bermedia ditemukan dan hujan/TMA mendukung.
3. Satu konten ditemukan lintas platform dan lokasi dapat dikenali.
4. Operator menandai konten sebagai relevan.

Temuan tidak boleh menjadi kejadian resmi hanya karena berada di peringkat atas Google.

## Estimasi pemakaian SerpApi

Empat kelompok query setiap 15 menit menghasilkan sekitar 11.520 pencarian per 30 hari. Empat kelompok query setiap 30 menit menghasilkan sekitar 5.760 pencarian per 30 hari.

Optimasi biaya:

- Gunakan interval 30 menit pada kondisi normal.
- Aktifkan interval cepat hanya ketika hujan/TMA melewati ambang.
- Gabungkan sinonim dalam satu kueri.
- Hentikan polling wilayah yang tidak relevan.
- Pantau sisa kredit melalui Account API SerpApi.

Harga dan kuota dapat berubah; periksa halaman resmi sebelum menentukan anggaran.

## Keamanan, privasi, dan audit

- Gunakan n8n versi terbaru dan MySQL node v2 dengan query parameters.
- Jangan memasukkan data dari hasil pencarian langsung ke string SQL.
- Gunakan akun database khusus dengan least privilege.
- Simpan hanya data publik yang diperlukan untuk verifikasi kejadian.
- Jangan menyimpan nomor telepon, alamat rumah, wajah, atau data profil yang tidak diperlukan.
- Pertimbangkan retensi `raw_payload` 30–90 hari.
- Simpan URL sumber dan waktu pengambilan agar keputusan dapat diaudit.
- Jangan mengunduh ulang media tanpa dasar penggunaan yang jelas; simpan URL/thumbnail jika cukup.
- Sediakan mekanisme penghapusan atau penyamaran bila konten sumber telah dihapus.
- Tinjau ketentuan platform, SerpApi, serta kebijakan perlindungan data organisasi sebelum produksi.

## Monitoring workflow

Metrik minimum:

- Jumlah pencarian per jam/hari.
- Jumlah hasil mentah dan hasil relevan.
- Rasio false positive hasil verifikasi.
- Jumlah URL duplikat.
- Latensi sejak publikasi hingga ditemukan.
- Error API, HTTP 429, dan sisa kredit.
- Jumlah sinyal yang dipromosikan atau ditolak operator.

Tambahkan Error Workflow n8n untuk memberi notifikasi jika SerpApi atau MySQL gagal. Jangan mengaktifkan `Never Error` tanpa mencatat status HTTP karena kegagalan dapat terlihat seperti hasil kosong.

## Tahapan implementasi

### Tahap 1 — MVP

- Import workflow.
- Terapkan skema tabel.
- Hubungkan credential.
- Jalankan Manual Trigger.
- Tinjau 50–100 hasil dan sesuaikan kamus.
- Aktifkan jadwal 30 menit.

### Tahap 2 — Korelasi

- Cluster berdasarkan lokasi dan jendela waktu.
- Korelasikan dengan `jakarta_ch`, `jakarta_tma`, dan laporan resmi.
- Tambahkan antrean verifikasi operator.

### Tahap 3 — Produksi

- Integrasikan API platform resmi bila tersedia.
- Tambahkan kebijakan retensi dan penghapusan.
- Tambahkan dashboard kualitas data.
- Buat audit trail promosi sinyal menjadi `flood_events`.

## Referensi

- SerpApi Google Search API: https://serpapi.com/search-api
- SerpApi Google News: https://serpapi.com/news-results
- SerpApi pricing: https://serpapi.com/pricing
- n8n Schedule Trigger: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
- n8n HTTP Request: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- n8n MySQL node dan query parameters: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/

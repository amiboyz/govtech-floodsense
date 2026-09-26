# Review mendalam pembuktian historis FloodSense

Tanggal review: 21 September 2026. Fokus: hujan → TMA enam jam → genangan → observasi independen.

## Kesimpulan

Aplikasi lama **belum membuktikan ketepatan lokasi/area banjir**. Beberapa angka pada halaman postcast berasal dari parameter skenario manual, bukan evaluasi model. Prediksi TMA dan laporan banjir nyata memang tersedia sebagai bahan kajian, tetapi keduanya tidak otomatis menjadi model genangan atau label area.

Halaman utama kini memakai **Historical Lab**, sebuah replay eksploratif dari ekstrak MySQL asli. Kode tampilan Phoenix lama dan artefaknya tetap disimpan; tidak dijadikan halaman pembuktian. Endpoint `/api/v1/evidence/case-study` sekarang mengembalikan HTTP 409 `ILLUSTRATIVE_NOT_EVIDENCE`, bukan menyajikan skenario manual sebagai hasil verifikasi.

Database sumber tidak diubah. Pekerjaan ini tidak melakukan deployment production atau membangun model genangan operasional.

## Temuan menurut prioritas

| Prioritas | Bukti kode | Masalah dan dampak |
|---|---|---|
| P0 | `analysis/generate_postcast_case.py`, daftar `focal` sekitar baris 96–115 | Probabilitas per kelurahan, kedalaman, dan `verified` ditetapkan manual. Tidak boleh digunakan untuk klaim akurasi. |
| P0 | File sama, sekitar baris 128, 236–238, 279 | Jumlah POI dapat ditambah acak; angka 99,1/99,7/98,8% ditulis langsung; jumlah laporan “terverifikasi dalam DAS” disamakan dengan jumlah seluruh laporan. Penyebut/pembilang bukan hasil uji independen. |
| P0 | Kontrak model/artefak | Belum ada output prediksi polygon/grid genangan yang dihasilkan tanpa memakai kejadian yang hendak dibuktikan. Tanpa output tersebut, IoU/precision/recall area tidak dapat dihitung. |
| P1 | `analysis/train_das_study.py:239` dan `:359` | Split kode 1 Mei, metadata menyebut 1 Juli. Ini mengubah interpretasi periode uji. |
| P1 | File sama, pencocokan laporan sekitar baris 274–294 | Memilih waktu input sebelum kejadian tidak memastikan target forecast mendahului/sesuai waktu kejadian. Target setelah kejadian tidak dapat disebut peringatan enam jam sebelumnya untuk kejadian itu. |
| P1 | File sama, sekitar baris 327–330 | Kesimpulan manfaat hujan bersifat tetap, meskipun metrik suatu pos mungkin lebih buruk dari baseline. |
| P1 | Ekstraksi/agregasi sumber | Rata-rata `KETINGGIAN_TERAKHIR` tidak otomatis sama dengan hujan mm/jam atau akumulasi hujan enam jam. Semantik sensor harus dikonfirmasi. |
| P1 | Ekstrak TMA | Terdapat nilai −60.475 sampai 24.034,5 dalam satuan sumber. Jangan mengubahnya menjadi cm atau menghapus nilai negatif tanpa pengetahuan datum. Audit sensor/outlier wajib sebelum rilis. |
| P1 | Pemetaan hidrologi | Pos di dalam polygon DAS yang sama tidak otomatis berada di hulu pos TMA. Model lama juga belum membuktikan keunggulan pemetaan DAS terhadap baseline dengan protokol yang sama. |
| P1 | Ketersediaan waktu | Tidak tersedia timestamp kedatangan/ingesti. Snapshot historis tidak membuktikan bahwa nilai benar-benar sudah dapat diakses pada saat prediksi diterbitkan. |
| P1 | Skrip analisis lama | Kredensial DB tertulis langsung pada skrip. Pindahkan ke environment dan rotasi sebelum berbagi repository; jangan memasukkan `.env` ke Git/deck. Review ini tidak menyalin nilai rahasianya. |
| P2 | Referensi akademik postcast | Nama jurnal/tahun/judul generik bukan dukungan ilmiah yang dapat ditelusuri. Jangan menjadikan klaim R² atau keberhasilan aplikasi sebagai konsekuensi dari kutipan umum tersebut. |
| P2 | Status UI/API lama | “MySQL Connected” tertulis statis, sedangkan beberapa endpoint masih memakai demo fallback. Halaman baru menggunakan label snapshot, tidak mengklaim koneksi live. Endpoint demo lama tidak digunakan dalam replay. |

## Data yang benar-benar diperiksa

Ekstraksi baca-saja memakai `.env` melalui konfigurasi server, sumber `jakarta_ch`, `jakarta_tma`, dan laporan `Banjir` pada `pu_sitaba_disaster_report`. Tidak mengambil nama pelapor atau informasi kontak.

- Rentang: 21 Oktober 2025 hingga sebelum 2 September 2026.
- Hujan: 1.640.789 baris pada rentang ekstraksi; 93 pos; 409.362 agregat jam-pos.
- TMA: 878.997 baris pada rentang ekstraksi; 51 pos; 219.478 agregat jam-pos. Terdapat 244 baris duplikat waktu-pos, tanpa konflik nilai pada ekstrak ini.
- Banjir: 75 laporan pada kotak wilayah latitude −6,6…−5,8, longitude 106,5…107,2. Sebanyak 18 laporan terjadi pada periode sejak Maret; seluruh 18 muncul sebagai konteks pada replay. Batas kotak ini bukan batas administratif Jabodetabek.
- Tidak adanya duplikat waktu-pos pada hujan bukan bukti seluruh datanya bebas masalah; nama, lokasi, satuan, kuantitas, atau makna snapshot masih perlu audit.
- Tanggal sentinel TMA tahun 2001 berada di luar rentang kajian dan tidak dilatih.

Ekstraksi besar dengan `GROUP BY` sebelumnya gagal karena server melaporkan `ER_DISK_FULL`. Jalur yang berhasil memakai query per pos dan agregasi di client, batas 100.000 baris/pos, batas tulisan 160 MiB, serta cadangan ruang disk 1 GiB. Skrip menolak truncation, bukan diam-diam menerima sampel parsial. Tidak perlu menjalankan ulang ekstraksi hanya untuk melihat aplikasi.

## Eksperimen yang dapat direproduksi

Artefak: `analysis/results/historical-replay.json`.

1. Dedup berdasarkan pos+waktu; buang timestamp dengan nilai konflik. Buang hujan negatif; jam hilang tidak diisi nol. Rata-rata dibentuk per jam.
2. Pasangkan TMA dengan satu pos hujan terdekat ≤10 km. **Ini baseline eksploratif**, bukan pengganti model DAS terverifikasi. Pemilihan pasangan memakai metadata snapshot, bukan riwayat metadata berversi.
3. Masukan: enam sinyal hujan per jam, TMA jam terakhir, selisih TMA satu jam. Tidak menggunakan laporan masa depan.
4. Definisikan waktu terbit sebagai akhir bin input. Target adalah **rata-rata bin TMA yang berakhir pada waktu terbit +6 jam**, bukan tinggi sesaat, tinggi puncak, atau genangan dalam seluruh jendela.
5. Ridge α=1; mean/scale dihitung dari data latih saja. Training memakai target yang akhir binnya sebelum 1 Maret 2026. Test issue time sejak 1 Maret sampai akhir data. Ini satu holdout eksploratif, bukan validasi rolling-origin lengkap.
6. Minimum 180 pasangan total, 120 latih, 30 uji. Semua model pembanding per pos memakai baris uji yang sama. Artefak memuat koefisien, skala, hash input/script, metrik, dan batas waktu.
7. Pembanding: hujan saja, TMA saja, hujan+TMA, serta persistence (TMA tetap sama seperti saat terbit).

### Hasil sementara, bukan akurasi banjir

| Periode holdout | Pos dengan model +6 jam | RMSE lebih rendah daripada persistence | RMSE lebih rendah daripada model TMA saja | Laporan banjir pada periode |
|---|---:|---:|---:|---:|
| Sejak 1 Maret 2026 | 33 | 26 | 21 | 18 |
| Sejak 1 Juli 2026, eksperimen awal | 30 | 6 | 23 | 0 |

Hasil sangat bergantung periode. Jangan memilih hanya periode/pos yang terlihat baik atau menyatakan proporsi pos di atas sebagai “akurasi lokasi banjir”. Belum dihitung interval kepercayaan, signifikansi perbedaan, ketahanan lintas musim, pengaruh nilai ekstrem, atau validasi lokasi yang tidak ikut pelatihan.

Replay berisi 64 frame berpusat pada kejadian dan 1.996 pasangan prediksi TMA–observasi. Frame dipilih untuk inspeksi; **metrik utama dihitung pada seluruh pasangan holdout yang memenuhi syarat**, bukan hanya frame yang dipilih. Satu laporan dapat masuk beberapa jendela waktu; jumlah laporan antar-frame tidak boleh dijumlahkan.

Observasi sensor TMA bukan pengukuran kedalaman genangan lapangan. “18 laporan di periode uji” juga tidak berarti 18 hit: belum ada model area yang bisa menentukan hit/miss tersebut.

## Tampilan baru: awam dan expert

- **Replay historis:** waktu terbit dan target +6 jam selalu terlihat; slider/select waktu dan autoplay. Frame tidak selalu berjarak satu jam.
- **Peta:** cyan = pos hujan dengan angka sinyal; biru = prediksi pos TMA; ungu = laporan sesudah terbit, hanya muncul saat observasi dibuka. Garis putus-putus = pasangan pos, bukan jaringan sungai atau arah aliran.
- **Telusuri satu pos:** sumber hujan → prediksi TMA → hasil sensor dan galat absolut. Tidak menyebut probabilitas/siaga yang belum dikalibrasi.
- **Kinerja model TMA:** semua pos, metrik RMSE terhadap dua baseline, termasuk model yang gagal mengalahkan baseline.
- **Detail expert:** MAE, bias, jumlah sampel, hash sumber, kontrak target, dan JSON model.
- **Audit:** temuan P0/P1, batasan, dan syarat evaluasi genangan.
- **Genangan:** status “belum terukur”, bukan 0% atau area yang diwarnai dari laporan yang sama. Tampilan ini sengaja belum mengklaim prediksi lokasi genangan telah selesai.

Desain memakai sidebar vertikal, kartu metrik, warna biru, dan tipografi bergaya Phoenix. Komponen ditulis untuk aplikasi ini, bukan distribusi template berlisensi.

## Agar persentase area banjir menjadi sah

Tetapkan dulu unit spasial (misalnya grid tetap atau polygon), jendela kejadian, definisi basah/kering, batas cakupan survei, dan threshold yang dibekukan sebelum test. Model area dapat dikembangkan terpisah menggunakan topografi/DEM, drainase, konektivitas sungai, pompa/pintu/pasang, dan label kejadian. Ketidakpastian jalur fluvial dan pluvial perlu dibedakan.

Simpan `issued_at`, `input_cutoff`, `valid_from/to`, geometri prediksi, probabilitas bila terkalibrasi, versi model, dan kualitas input. Observasi independen perlu geometri/cakupan, waktu, kedalaman bila ada, sumber, serta bukti area kering. Laporan titik positif boleh menjadi bukti keberadaan banjir, tetapi tidak menyelesaikan cakupan area atau false alarm.

Pada **area yang benar-benar disurvei**, hitung luas (atau jumlah grid dengan definisi konsisten):

- TP: diprediksi basah dan teramati basah.
- FP: diprediksi basah tetapi teramati kering.
- FN: diprediksi kering tetapi teramati basah.
- TN: diprediksi kering dan teramati kering.
- Precision = TP/(TP+FP): berapa bagian prediksi banjir yang benar.
- Recall/POD = TP/(TP+FN): berapa bagian banjir aktual yang tertangkap.
- IoU/CSI = TP/(TP+FP+FN): kesesuaian area banjir, menghukum alarm palsu dan kejadian terlewat.

Penyebut nol → tidak tersedia. Area tanpa survei → unknown/excluded, bukan TN. Laporkan cakupan survei, missed events, false alarms, lead time, serta hasil per lokasi/kejadian/musim. Jangan hanya memakai accuracy total karena dominasi area kering dapat menyesatkan. Calibration/Brier memerlukan probabilitas model dan label yang tepat; kedekatan geografis tidak cukup.

## Menjalankan dan memverifikasi

Prasyarat: Node/dependensi yang sudah tersedia, Python dengan NumPy, MySQL lokal terisi, `.env` tidak dibagikan. Aplikasi membaca artefak; tidak perlu koneksi database setiap refresh.

```sh
# Hanya bila perlu memperbarui ekstrak. Jangan gunakan ekstraksi GROUP BY lama.
node --import tsx server/cli/study-extract-stations.ts

python3 analysis/train_study.py --split 2026-03-01 --output historical-replay.json
npm run build
npm test
node --import tsx server/index.ts
```

URL lokal default: `http://localhost:8787`. Pastikan tidak menjalankan dua server pada port yang sama. Restart server setelah mengubah endpoint; build frontend sendiri tidak memuat ulang backend.

Lima pengujian lolos pada workspace review: dua tes model lama dan tiga tes kontrak replay. Tes baru memastikan target +6 jam, purge waktu latih, metrik finite, spatial score null, hash sumber, dan reproduksi seluruh 1.996 prediksi frame dari fitur historis. Tes reproduksi membutuhkan `.build/study` hasil ekstraksi lokal; tanpa ekstrak, bagian tersebut dilewati secara eksplisit. Koefisien yang cocok tidak membuktikan mutu sensor atau kebenaran hipotesis hidrologi.

Build berhasil. Warning tersisa: nama direktori mengandung `#` dan ukuran bundle sekitar 760 kB; URL gambar CSS Leaflet sudah di-inline untuk mengatasi kegagalan resolver path `#`. Peta memakai tile OpenStreetMap eksternal dan font eksternal; mode offline penuh belum disediakan.

Pemeriksaan browser desktop mencakup pemuatan halaman, peta nyata, serta frame terpilih dengan lapisan laporan dan grafik prediksi–observasi yang terbuka. Validasi seluler, uji beban, keamanan production, alarm operasional, dan validasi genangan lapangan belum dinyatakan selesai.

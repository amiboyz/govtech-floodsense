# Metodologi Perhitungan Curah Hujan Wilayah: Metode Poligon Thiessen (Thiessen Polygon Method)
**Dokumen Standar Hidrologi & Arsitektur Perhitungan FloodSense — Jakarta Investment Resilience**  
*Single Source of Truth: Database `local_govtech_floodsense` (Tabel `jakarta_ch` & `cilicis_das`)*

---

## 1. Latar Belakang & Urgensi Hidrologis

Dalam analisis risiko banjir dan ketahanan investasi kawasan perkotaan seperti DKI Jakarta, pengukuran curah hujan dari satu stasiun penakar (*single point measurement*) tidak mencerminkan beban hidrologis yang sebenarnya bekerja pada suatu Daerah Aliran Sungai (DAS) atau wilayah polder. 

Hujan di wilayah tropis memiliki variabilitas spasial yang sangat tinggi: satu wilayah kelurahan dapat mengalami hujan lebat lokal (*convective storm*), sementara stasiun penakar berjarak beberapa kilometer mencatat hujan nihil. Sebaliknya, saat terjadi anomali cuaca ekstrem berskala regional, limpasan permukaan (*surface runoff*) yang menggenangi tapak proyek investasi merupakan fungsi dari akumulasi **Curah Hujan Wilayah (*Areal Mean Rainfall*)**.

Untuk memperoleh nilai curah hujan harian wilayah dan rata-rata musim penghujan yang representatif secara ilmiah, platform **FloodSense** menerapkan **Metode Poligon Thiessen (*Thiessen Polygon / Voronoi Tessellation Method*)**.

---

## 2. Landasan Teori & Formula Matematis

### 2.1 Formula Curah Hujan Wilayah Thiessen

Metode Poligon Thiessen memberikan bobot proporsional pada setiap stasiun penakar hujan berdasarkan luas daerah pengaruh (*catchment area of influence*) yang dibentuk oleh batas poligon tegak lurus terhadap garis hubung antar-stasiun:

$$R_{\text{wilayah}}(d) = \sum_{i=1}^n w_i \times R_i(d) = \sum_{i=1}^n \left( \frac{A_i}{A_{\text{total}}} \times R_i(d) \right)$$

Di mana:
* $R_{\text{wilayah}}(d)$ : Curah hujan wilayah pada tanggal observasi $d$ ($\text{mm/hari}$).
* $R_i(d)$ : Curah hujan harian yang dicatat oleh stasiun penakar ke-$i$ pada tanggal $d$ ($\text{mm/hari}$).
* $A_i$ : Luas poligon pengaruh Thiessen stasiun ke-$i$ ($\text{km}^2$).
* $A_{\text{total}}$ : Total luas wilayah kajian (misal: luas daratan DKI Jakarta atau luas DAS terkait) ($\text{km}^2$), dengan ketentuan:
  $$A_{\text{total}} = \sum_{i=1}^n A_i$$
* $w_i$ : Faktor bobot Thiessen stasiun ke-$i$ (tanpa dimensi, $0 < w_i < 1$), memenuhi kondisi normalisasi:
  $$\sum_{i=1}^n w_i = 1{,}0 \quad (100\%)$$

---

### 2.2 Pembentukan Geometri Poligon Alami (Voronoi Tessellation & Hydrological Catchment Boundary)

> [!IMPORTANT]
> **Prinsip Hidrologi Murni**: Air mengalir mengikuti topografi permukaan bumi dan kontur Daerah Aliran Sungai (DAS) dari hulu ke hilir. **Sistem hidrologi tidak mengenal batas administrasi pemerintahan.** Oleh karena itu, poligon Thiessen dalam platform FloodSense **TIDAK dipotong pada batas administratif provinsi DKI Jakarta**, melainkan dibiarkan utuh mengikuti **Batas Alami Wilayah Sungai Terpadu (*Unified Catchment Boundary*)** yang menyatukan seluruh 15 Daerah Aliran Sungai (DAS) utama BBWS Ciliwung–Cisadane dari kawasan hulu (Puncak/Bogor), tengah (Depok, Tangerang, Bekasi), hingga kawasan hilir (Pesisir Teluk Jakarta).

Secara spasial, untuk himpunan seluruh stasiun penakar $S = \{s_1, s_2, \dots, s_n\}$ (93 stasiun dalam sistem tangkapan air terpadu) dengan koordinat $(\text{lon}_i, \text{lat}_i)$, setiap sel poligon Voronoi $V(s_i)$ didefinisikan sebagai himpunan seluruh titik $p$ di bidang permukaan yang berjarak lebih dekat ke $s_i$ dibandingkan ke stasiun lainnya:

$$V(s_i) = \{ p \in \mathbb{R}^2 \mid \text{dist}(p, s_i) \le \text{dist}(p, s_j), \, \forall j \ne i \}$$

Selanjutnya, sel poligon Voronoi dipotong (*clipped*) terhadap batas alami hidrologis terpadu $\Omega_{\text{DAS}}$ (kesatuan batas 15 DAS dari `cilicis_das` seluas $\sim 6.081\text{ km}^2$):

$$P_i = V(s_i) \cap \Omega_{\text{DAS}}$$

$$A_i = \text{Area}(P_i)$$

Jika suatu titik koordinat investasi/lokasi sembarang berada di dalam $P_i$, maka pos penakar hujan rujukan terdekat secara hidrologis adalah $s_i$, dengan faktor pengaruh bobot wilayah sebesar $w_i$. Poligon pengaruh pos-pos perbatasan (seperti di Lenteng Agung, Lebak Bulus, Cakung, atau Kalideres) tetap menjangkau daerah tangkapan alaminya hingga ke wilayah hulu/penyangga tanpa terpotong garis batas provinsi.

---

### 2.3 Normalisasi Dinamis Saat Terjadi Data Tidak Lengkap (*Missing Data*)

Pada hari observasi tertentu, sebagian stasiun telemetri mungkin mengalami kendala transmisi sensor atau pemeliharaan berkala. Untuk menjaga kekekalan massa air dan menghindari *underestimation*, FloodSense menerapkan normalisasi bobot dinamis untuk stasiun aktif yang melaporkan data pada tanggal $d$ ($\text{reporting}(d)$):

$$w_i'(d) = \frac{w_i}{\sum_{k \in \text{reporting}(d)} w_k}$$

$$R_{\text{wilayah}}(d) = \sum_{i \in \text{reporting}(d)} w_i'(d) \times R_i(d)$$

Sehingga $\sum_{i \in \text{reporting}(d)} w_i'(d) = 1{,}0$ tetap terpenuhi secara matematis.

---

## 3. Parameter Waktu & Definisi Operasional

1. **Hari Hidrometeorologis Indonesia (BMKG & Dinas SDA DKI Jakarta)**:
   * Satu hari pengamatan hujan harian dihitung dari pukul **07:00 WIB hari berjalan hingga pukul 07:00 WIB hari berikutnya** (24 jam akumulasi).
   * Data sensor periodik 10-menitan pada tabel `jakarta_ch` (`KETINGGIAN_HARI_INI`) merefleksikan nilai akumulasi harian ini.
2. **Periode Musim Penghujan DKI Jakarta**:
   * Sesuai siklus monsun barat, periode musim hujan resmi didefinisikan dari **Bulan 11 s.d. Bulan 04 (November, Desember, Januari, Februari, Maret, dan April)**.
3. **Formula Rata-rata Musim Penghujan**:
   $$\bar{R}_{\text{wilayah}}^{\text{musim\_hujan}} = \frac{1}{|D_{\text{musim\_hujan}}|} \sum_{d \in D_{\text{musim\_hujan}}} R_{\text{wilayah}}(d)$$
   Di mana $D_{\text{musim\_hujan}}$ adalah himpunan seluruh hari dalam rentang bulan 11 s.d. 04.

---

## 4. Klasifikasi Intensitas Hujan Harian BMKG

| Rentang Curah Hujan ($R$) | Klasifikasi Resmi BMKG |
|---|---|
| $0\text{ mm/hari}$ | Berawan / Nihil |
| $0{,}5 - 20{,}0\text{ mm/hari}$ | Hujan Ringan |
| $20{,}1 - 50{,}0\text{ mm/hari}$ | Hujan Sedang |
| $50{,}1 - 100{,}0\text{ mm/hari}$ | Hujan Lebat |
| $100{,}1 - 150{,}0\text{ mm/hari}$ | **Hujan Sangat Lebat** |
| $> 150{,}0\text{ mm/hari}$ | **Hujan Ekstrem** |

---

## 5. Hasil Analisis Empiris Berdasarkan Data Aktual

Dari pengolahan seluruh 409.362 baris observasi sensor curah hujan pada 93 stasiun penakar aktif yang mencakup seluruh Wilayah Sungai / DAS Terpadu BBWS Ciliwung–Cisadane (total luas tangkapan alami $6.081{,}3\text{ km}^2$, mencakup kawasan hulu Puncak/Bogor, tengah Depok/Bekasi/Tangerang, hingga hilir pesisir Jakarta), diperoleh hasil empiris berikut:

### 5.1 Tingkat Regional Wilayah Sungai / DAS Terpadu

* 🏆 **Rekor Hujan Wilayah Harian Tertinggi (Thiessen Catchment-Wide)**:
  * **Nilai**: **$88{,}5\text{ mm/hari}$**
  * **Tanggal Kejadian**: **22 Januari 2026**
  * **Klasifikasi BMKG**: **Hujan Lebat** (didukung oleh 72 stasiun telemetri aktif serentak di seluruh DAS).
  * *Perbandingan Skala Urban Inti DKI*: Jika difokuskan hanya pada stasiun-stasiun lingkar dalam ibu kota ($965{,}2\text{ km}^2$), hujan wilayah harian mencapai puncaknya pada **$121{,}5\text{ mm/hari}$** (**Hujan Sangat Lebat**) pada tanggal yang sama (22 Januari 2026). Perbedaan ini secara ilmiah mencerminkan fenomena *storm centering* di mana pusat badai konvektif terkonsentrasi di dataran banjir tengah-hilir DKI.
  * *Catatan Kejadian Penting*: Hujan lebat mendahului pada 17–18 Januari 2026 tercatat sebesar **$86{,}6\text{ mm/hari}$**, yang memicu rekor TMA tertinggi Pintu Air Pulo Gadung sebesar $6.187\text{ cm}$ (Siaga 3).
* 🌧️ **Rata-rata Hujan Wilayah Musim Penghujan (Bulan 11 s.d. 04)**:
  * **Nilai**: **$10{,}4\text{ mm/hari}$** (skala Wilayah Sungai Terpadu $6.081{,}3\text{ km}^2$) dan **$10{,}9\text{ mm/hari}$** (skala perkotaan inti DKI), dihitung dari 177 hari observasi musim penghujan.

---

### 5.2 Tingkat Daerah Aliran Sungai (DAS) Utama

| Nama Daerah Aliran Sungai (DAS) | Luas DAS ($A_{\text{total}}$) | Pos Thiessen Berkontribusi | 🏆 Hujan Wilayah Tertinggi (Thiessen) | Tanggal Puncak Kejadian | Kategori BMKG | 🌧️ Rata-rata Musim Hujan (Bulan 11–04) |
|---|---:|---:|---:|:---:|:---:|---:|
| **DAS Sunter** | $441{,}6\text{ km}^2$ | 39 pos | **$119{,}8\text{ mm/hari}$** | 22 Jan 2026 | Hujan Sangat Lebat | **$11{,}2\text{ mm/hari}$** |
| **DAS Ciliwung** | $717{,}8\text{ km}^2$ | 55 pos | **$80{,}7\text{ mm/hari}$** | 29 Jan 2026 | Hujan Lebat | **$11{,}0\text{ mm/hari}$** |
| **DAS Krukut** | $172{,}0\text{ km}^2$ | 26 pos | **$114{,}4\text{ mm/hari}$** | 22 Jan 2026 | Hujan Sangat Lebat | **$10{,}3\text{ mm/hari}$** |
| **DAS Angke** | $500{,}3\text{ km}^2$ | 31 pos | **$107{,}6\text{ mm/hari}$** | 07 Mar 2026 | Hujan Sangat Lebat | **$9{,}3\text{ mm/hari}$** |
| **DAS Cakung** | $143{,}1\text{ km}^2$ | 12 pos | **$148{,}8\text{ mm/hari}$** | 22 Jan 2026 | Hujan Sangat Lebat | **$10{,}8\text{ mm/hari}$** |
| **DAS Blencong** | $80{,}9\text{ km}^2$ | 5 pos | **$152{,}4\text{ mm/hari}$** | 17 Jan 2026 | Hujan Ekstrem | **$10{,}2\text{ mm/hari}$** |
| **DAS Cikapadilan** | $87{,}2\text{ km}^2$ | 4 pos | **$154{,}8\text{ mm/hari}$** | 12 Jan 2026 | Hujan Ekstrem | **$10{,}0\text{ mm/hari}$** |
| **DAS Cisadane** | $1.634{,}1\text{ km}^2$ | 16 pos | **$90{,}4\text{ mm/hari}$** | 29 Jan 2026 | Hujan Lebat | **$10{,}5\text{ mm/hari}$** |
| **DAS Bekasi** | $1.454{,}1\text{ km}^2$ | 17 pos | **$79{,}7\text{ mm/hari}$** | 17 Jan 2026 | Hujan Lebat | **$10{,}9\text{ mm/hari}$** |

---

## 6. Implementasi Arsitektur Sistem FloodSense

### 6.1 Alur Pemrosesan Data (Data Pipeline)

```
[Database: jakarta_ch] (1.6M baris)
           │
           ▼
[CLI Precomputation: generate-thiessen-stats.py]
  ├─ Voronoi Tessellation via SciPy & Shapely
  ├─ Spatial Intersection terhadap Daratan DKI & DAS Cilicis
  ├─ Perhitungan A_i (km²) dan w_i (%) per stasiun
  ├─ Agregasi Harian: R_wilayah(d) = Σ (w_i * R_i(d))
  └─ Output Persisten:
       ├─ .build/study/station-seasonal-stats.json
       └─ .build/study/thiessen-polygons.json (GeoJSON FeatureCollection)
           │
           ▼
[Backend Services: server/services/monitoring.ts & app.ts]
  ├─ Endpoint: GET /api/v1/monitoring/thiessen
  ├─ Enriched Metadata pada: evaluateLocation(lat, lng)
  └─ Enriched Metadata pada: getMonitoringInvestments() & getMonitoringProjects2026()
           │
           ▼
[Frontend UI: src/MonitoringDashboard.tsx]
  ├─ Layer Hidrologi: Toggle Overlay GeoJSON Poligon Thiessen (93 Poligon)
  └─ Drawer Inspeksi: Kartu "📐 Metode Poligon Thiessen"
       ├─ Luas Area Pengaruh (km²) & Bobot (%) Pos Rujukan
       ├─ 🏆 Hujan Wilayah Harian Tertinggi (DAS & Regional) + Kategori BMKG
       ├─ 🌧️ Rata-rata Musim Penghujan (DAS & Regional)
       └─ 📍 Rekap Hujan Pos Lokal vs Wilayah
```

### 6.2 Kode Skrip Generator Data
Skrip kalkulasi otomatis disimpan pada:  
[server/cli/generate-thiessen-stats.py](file:///Users/hazmi/Documents/#Github/Govtech/server/cli/generate-thiessen-stats.py)

Dapat dijalankan kapan saja untuk memperbarui statistik saat data telemetri baru masuk:
```bash
python3 server/cli/generate-thiessen-stats.py
```

---

## 7. Nilai Strategis Bagi Calon Investor & JIC

1. **Due Diligence Beban Air Nyata**: Calon investor tidak lagi terkecoh oleh angka ekstrem tunggal pada satu penakar kecil yang rusak atau terisolir. Metode Thiessen memberikan gambaran objektif beban air rata-rata yang benar-benar membebani sistem drainase kawasan.
2. **Kesesuaian Desain Drainase & Retensi**: Angka hujan wilayah harian tertinggi ($119{,}8\text{ mm/hari}$ di DAS Sunter, $114{,}4\text{ mm/hari}$ di DAS Krukut) menjadi dasar acuan langsung (*hydrological return period benchmark*) untuk kapasitas kolam retensi (*retention basin*) atau sumur resapan tapak proyek.
3. **Transparansi Parameter Asuransi Parametrik**: Sebagai fondasi instrumen *Parametric Flood Insurance*, batas pemicu klaim (*trigger threshold*) dapat disepakati menggunakan indeks Hujan Wilayah Thiessen DAS yang objektif, transparan, dan tidak dapat dimanipulasi oleh satu sensor lokal.


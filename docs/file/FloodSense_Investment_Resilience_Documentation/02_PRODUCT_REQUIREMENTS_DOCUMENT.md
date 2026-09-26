# Product Requirements Document (PRD)

## Ringkasan
Platform web berbasis peta yang menyatukan data hidrometeorologi, kejadian, aset/fasilitas, dan investasi untuk due diligence, monitoring portofolio, business continuity, serta mitigasi.

## Sasaran
- **G1:** Lokasi/proyek dapat dinilai dengan bukti yang dapat ditelusuri.
- **G2:** JIC dapat memantau portofolio yang berpotensi terdampak.
- **G3:** Due diligence memuat sumber, kualitas, uncertainty, dan disclaimer.
- **G4:** Forecast/NowCast memuat freshness, confidence, dan keterbatasan.
- **G5:** Akses, perubahan, dan publikasi dapat diaudit.

## Jobs to be done
- Analis JIC menyiapkan briefing risiko lokasi yang dapat dipertanggungjawabkan.
- Pengelola investasi menerima alert yang menjelaskan potensi dampak dan tindakan awal.
- Pimpinan melihat exposure portofolio dan prioritas mitigasi.
- Analis hidrologi memeriksa input, metode, backtest, dan uncertainty.
- Data steward memeriksa lineage, quality flag, dan freshness.

## Epic
1. **Location & Portfolio Explorer:** pencarian nama/kategori/wilayah/koordinat, point/footprint, filter kejadian dan ringkasan portofolio.
2. **Forecast & NowCast:** observasi terbaru, tren, threshold per lokasi, status live/stale/missing/estimated/forecast.
3. **PostCast & Evidence:** timeline kejadian, dampak, bukti, aset, tindakan, verifikasi.
4. **Due Diligence Brief:** identitas, periode, histori, mekanisme indikatif, akses, mitigasi, validator, disclaimer.
5. **Resilience Score:** hazard, exposure, vulnerability, access disruption, dependency, mitigation/coping capacity, data confidence.
6. **Administration:** RBAC, kamus data, source/freshness registry, threshold, model registry, audit, publication workflow.

## Acceptance criteria
1. Setiap data menampilkan `observation_time`, `retrieved_at`, sumber, dan freshness.
2. Ringkasan risiko dapat ditelusuri ke evidence.
3. Forecast mencantumkan horizon, issue time, model/version, confidence, dan limitation.
4. Sistem tidak otomatis memberi label “aman” atau “tidak layak investasi”.
5. Role publik tidak dapat melihat data/foto restricted.
6. Report memuat timestamp, sumber, data period, quality, uncertainty, dan disclaimer.
7. Perubahan threshold/model/config tercatat.
8. Kekurangan data menghasilkan `insufficient_data`, bukan nilai buatan.

## Baseline data VERIFIED
Dataset BKPM lokal: 190 pendidikan, 204 rumah sakit, 9 pelabuhan, 126 hotel, 2 kawasan; 531 record sumber dan 526 setelah lima duplikasi persis dihapus; 19 peluang investasi; 3 sektor unggulan. Status operasional dan presisi koordinat tetap perlu validasi.

## Definition of Done MVP
Alur lokasi → exposure → evidence → review → export berjalan end-to-end; NowCast diuji dengan data aktual/fixture representatif; Forecast hanya aktif setelah release gate; RBAC/audit/provenance/freshness/disclaimer lulus test; UAT disetujui JIC dan reviewer teknis.

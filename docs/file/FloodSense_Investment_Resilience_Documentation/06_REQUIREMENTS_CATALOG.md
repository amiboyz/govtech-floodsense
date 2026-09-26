# Functional and Non-Functional Requirements

## Functional
- **FR-001–005:** cari lokasi/proyek; tampilkan provenance; histori relevan; portfolio filter; jangan anggap point sebagai footprint.
- **FR-101–105:** hujan/TMA/tren; freshness status; alert idempotent; model/horizon/confidence; nonaktifkan forecast yang belum operational.
- **FR-201–204:** catat kejadian/dampak/bukti; hubungkan aset/investasi/tindakan; kontrol evidence; simpan konflik/verifikasi.
- **FR-301–305:** report versioned; provenance/uncertainty/disclaimer; score components; insufficient statuses; human approval sebelum publikasi.
- **FR-401–406:** users/roles; audit; threshold; source/freshness; model registry; export sesuai klasifikasi.

## Non-functional
- **NFR-001 Availability:** target MVP internal 99,0% bulanan, di luar maintenance.
- **NFR-002 Performance:** p95 read umum ≤2 detik; map query ≤4 detik pada beban UAT.
- **NFR-003 Freshness:** SLA per source dan status otomatis.
- **NFR-004 Security:** TLS, least privilege, MFA admin bila tersedia, secret injection.
- **NFR-005 Privacy:** minimisasi, klasifikasi, masking, approval publikasi.
- **NFR-006 Auditability:** config/model/export/publish tercatat.
- **NFR-007 Resilience:** backup dan restore test; RPO/RTO sebelum produksi.
- **NFR-008 Maintainability:** migration reversible, automated test, structured log.
- **NFR-009 Interoperability:** JSON/GeoJSON, ISO 8601, stable ID, unit/CRS terdokumentasi.
- **NFR-010 Accessibility:** keyboard, contrast, legenda tidak hanya warna.
- **NFR-011 Explainability:** score/alert/forecast memiliki reason/provenance.
- **NFR-012 Reproducibility:** input/kode/config/version cukup untuk rerun.
- **NFR-013 Observability:** ingestion lag, error, stale, latency, drift.
- **NFR-014 Localization:** UTC internal, Asia/Jakarta display, UI Indonesia.
- **NFR-015 Safe failure:** kegagalan tidak boleh tampak sebagai data live.

# Risk Register

| ID | Risiko | Mitigasi |
|---|---|---|
| R-01 | Feed stale/tidak stabil | SLA, visible freshness, fallback |
| R-02 | Koordinat/POI tidak presisi | accuracy flag, footprint validation |
| R-03 | Jarak dianggap hubungan hidrologis | DAS/polder/network mapping, expert review |
| R-04 | Data leakage model | time split, feature cutoff tests |
| R-05 | False alarm/alert fatigue | calibration, tier, dedup |
| R-06 | Missed event | recall/lead-time gate, fallback rule |
| R-07 | Score menjadi blacklist | component view, disclaimer, human review |
| R-08 | Kebocoran foto/PII | classification, RBAC, signed URL |
| R-09 | Salah atribusi kewenangan | source document, conflict workflow |
| R-10 | Future feature diklaim selesai | evidence labels, release status |
| R-11 | Terms sumber berubah | registry, review terms, alternative |
| R-12 | Dianggap produk asuransi | batas produk tegas, mitra berizin |
| R-13 | Jadwal lomba tidak konsisten | konfirmasi panitia |
| R-14 | Reporting bias | coverage analysis, triangulation |
| R-15 | Overengineering | modular monolith, phase gate, YAGNI |

# FloodSense Investment Resilience — Paket Dokumentasi

**Status:** baseline perancangan GovTechAthon 2026. **Use case utama:** DPMPTSP DKI Jakarta — UP Jakarta Investment Centre.

## Status bukti
`VERIFIED` dibuktikan dari data/file/sumber resmi; `INFERRED` hasil analisis; `ASSUMPTION` perlu validasi; `PROPOSED` belum dibangun; `BLOCKED` belum dapat dipastikan.

## Isi
| File | Fungsi |
|---|---|
| `00_MASTER_CONTEXT_FULL_DATA.md` | konteks lengkap dan inventaris data |
| `01_PRODUCT_VISION_AND_SCOPE.md` | visi, positioning, scope |
| `02_PRODUCT_REQUIREMENTS_DOCUMENT.md` | PRD dan acceptance criteria |
| `03_SYSTEM_ARCHITECTURE.md` | arsitektur dan deployment baseline |
| `04_DATA_ARCHITECTURE_AND_GOVERNANCE.md` | lifecycle, quality, metadata |
| `05_HYDROLOGY_AND_ANALYTICS_SPEC.md` | metodologi analitik/model |
| `06_REQUIREMENTS_CATALOG.md` | FR dan NFR bernomor |
| `07_USER_ROLES_AND_WORKFLOWS.md` | RBAC dan workflow |
| `08_API_AND_CANONICAL_DATA_MODEL.md` | endpoint dan entitas kanonik |
| `09_SECURITY_PRIVACY_AND_COMPLIANCE.md` | kontrol keamanan/privasi |
| `10_INSTITUTIONAL_GOVERNANCE.md` | RACI dan konflik kewenangan |
| `11_IMPLEMENTATION_ROADMAP.md` | fase implementasi |
| `12_TEST_AND_ACCEPTANCE_STRATEGY.md` | test dan UAT |
| `13_RISK_REGISTER.md` | risiko/mitigasi |
| `14_GOVTECHATHON_CONCEPT_NOTE_10_SLIDES.md` | isi maksimal 10 slide |
| `15_KPI_AND_MONITORING_FRAMEWORK.md` | KPI dan guardrails |
| `16_DECISION_LOG_AND_OPEN_QUESTIONS.md` | keputusan/pertanyaan |
| `17_GLOSSARY.md` | istilah |
| `18_TRACEABILITY_MATRIX.md` | requirement-to-test mapping |
| `19_AI_AGENT_SYSTEM_PROMPT.md` | system prompt siap pakai |

## Urutan baca
Baca 00 → 01 → 02 → 03–10. Gunakan 11–18 untuk delivery/governance. Tempel 19 ke coding/research agent pada perangkat baru.

## Baseline data investasi
Manifest sumber mencatat 531 POI, 526 setelah deduplikasi, 19 peluang investasi, dan 3 sektor unggulan. Verifikasi ulang sebelum publikasi.

## Batas keras
FloodSense adalah sistem pendukung keputusan, bukan sertifikasi aman/tidak aman, blacklist, atau produk asuransi. Jangan masukkan secret, data pribadi, atau foto restricted ke model eksternal/repository publik.

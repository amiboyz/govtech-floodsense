# Data Architecture and Governance

## Domain
Hydrometeorology; flood events; water infrastructure; investment; administration; analytics.

## Lifecycle
`source → raw → staging → curated → feature → model output → presentation → archive`. Raw immutable sejauh memungkinkan. Transformasi mencatat input, output, versi kode/config, waktu, dan quality result.

## Metadata minimum
`source_system`, `source_record_id`, `observation_time`, `retrieved_at`, `ingested_at`, timezone/unit/CRS asli, transformation version, quality flag, verification status, classification, retention.

## Quality
Completeness, validity, uniqueness, consistency, timeliness, spatial accuracy, temporal granularity, sensor continuity, representativeness, dan reporting bias. Timestamp masa depan, koordinat invalid, konflik unit, dan duplikasi masuk rule/quarantine; tidak diperbaiki diam-diam.

## Master data
ID stabil untuk stasiun, aset, investasi, organisasi, wilayah, DAS/sub-DAS/polder/catchment. Alias dan relasi lama disimpan dengan masa berlaku.

## Roles
Data Owner menetapkan tujuan/akses; Data Steward mengelola definisi/kualitas; Custodian mengoperasikan keamanan/backup; Model Owner memvalidasi metode; Publisher menyetujui keluaran eksternal.

## Klasifikasi
`PUBLIC`, `INTERNAL`, `RESTRICTED`, `SECRET`. Password/token/key tidak masuk data lake, Markdown, log, atau repository.

## Data sharing
Dokumen kerja sama harus menetapkan purpose, fields, mandate/lawful basis, owner, SLA, retention, incident handling, dan redistribusi. Kewenangan tidak disimpulkan dari lokasi saja.

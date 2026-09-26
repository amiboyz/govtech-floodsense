# Hydrology and Analytics Specification

## Dua jalur
- **A:** hujan lokal → laporan/genangan; indikasi pluvial, drainase lokal, elevasi, pompa/saluran.
- **B:** hujan hulu/lokal → TMA → laporan; indikasi fluvial/luapan/hulu–hilir.

Mekanisme dapat campuran. Kedekatan Euclidean hanya fallback eksploratif; utamakan DAS, sub-DAS, polder, jaringan sungai/drainase, topografi, arah aliran, pintu air, pompa, waduk/situ, dan pasang.

## Definisi eksperimen
Wajib menetapkan target/event definition, lokasi/unit spasial, periode, feature window, horizon, threshold+masa berlaku, exclusion, dan quality policy.

## Feature candidates
Hujan 1/3/6/12/24/72 jam, antecedent rain; TMA/delta/slope/acceleration; lagged upstream variables berbasis konektivitas; pompa/pintu/pasang; musim. Laporan masa depan dilarang menjadi feature forecast.

## Baseline dan validasi
Mulai dari persistence, climatology, threshold/rule, regresi sederhana. Gunakan time split/rolling-origin. Ukur precision, recall/POD, F1, false alarm, missed event, lead time, Brier/calibration; MAE/RMSE/bias/coverage untuk kontinu. Evaluasi per lokasi, horizon, musim, serta kejadian/nonkejadian.

## Output contract
`issued_at`, `valid_from/to`, `location_id`, target, value/probability, confidence, model/version, input cutoff, quality, limitations.

## Model release gate
Status `experiment`, `candidate`, `operational`, `retired`. Operational memerlukan data review, backtest, hydrology review, UAT threshold, model card, fallback/rollback, dan monitoring drift.

## Resilience score
Alat bantu prioritas, bukan keputusan otomatis. Komponen/bobot/sumber/periode/quality terlihat dan versioned; sensitivity test wajib; confidence rendah harus terlihat.

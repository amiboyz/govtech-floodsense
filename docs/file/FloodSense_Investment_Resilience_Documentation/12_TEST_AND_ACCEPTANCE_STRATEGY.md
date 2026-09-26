# Test and Acceptance Strategy

## Test layers
Unit; source/API contract; integration; raw-to-curated pipeline; spatial/CRS; model leakage/backtest/calibration/reproducibility; security/authz/upload; E2E/UAT.

## Critical scenarios
- Stale feed tampil stale, bukan live.
- Koordinat invalid dikarantina.
- Public tidak dapat membuka evidence restricted.
- Forecast non-operational ditolak.
- Alert identik tidak terduplikasi.
- Data kurang menghasilkan `insufficient_data`.
- Threshold/model release tercatat di audit.
- Waktu Asia/Jakarta benar tanpa mengubah timestamp sumber.

## Hydrology acceptance
Time split, baseline comparison, metrics per location/horizon, false alarm/missed-event review, event dan non-event evaluation, limitations.

## UAT
JIC analyst, hydrology reviewer, data steward, security/admin, publisher. Sign-off sesuai fungsi.

## Exit evidence
Test report, sanitized logs/commands, sample report, model card, known limitations, rollback/fallback verification.

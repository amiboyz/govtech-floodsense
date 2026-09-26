# Requirements Traceability Matrix

| Requirement | Component | Data | Verification |
|---|---|---|---|
| FR-001–005 | Explorer/portfolio | POI/project/geometry | search, spatial, UAT |
| FR-101–105 | NowCast/Forecast | rain/TMA/threshold/model | pipeline, backtest, release gate |
| FR-201–204 | PostCast/Evidence | event/files/assets | RBAC, metadata, linkage |
| FR-301–305 | Report/Score | exposure/provenance | golden report, UAT, disclaimer |
| FR-401–406 | Governance/Admin | IAM/config/registries | authz, audit, config tests |
| NFR-001–003 | Runtime/SLA | metrics/freshness | load/SLA monitoring |
| NFR-004–006 | Security/privacy/audit | IAM/classification/log | security/audit review |
| NFR-007–015 | Reliability/quality | backup/pipeline/observability | restore/E2E/failure tests |

Status: `not_started`, `in_progress`, `verified`, `accepted`, `deferred`, `blocked`. Requirement kritis tidak selesai tanpa evidence.

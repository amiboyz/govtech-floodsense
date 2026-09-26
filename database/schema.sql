CREATE TABLE IF NOT EXISTS data_sources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  source_url TEXT NULL,
  classification ENUM('PUBLIC','INTERNAL','RESTRICTED','SECRET') NOT NULL DEFAULT 'PUBLIC',
  freshness_sla_minutes INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cilici_datasungai (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feature_id VARCHAR(64) NOT NULL,
  layer_id VARCHAR(64) NOT NULL,
  layer_name VARCHAR(255) NOT NULL,
  nama_sungai VARCHAR(255) NOT NULL,
  orde SMALLINT UNSIGNED NOT NULL,
  anotasi VARCHAR(255) NULL,
  geometry_type ENUM('LineString','MultiLineString') NOT NULL,
  `geometry` GEOMETRY NOT NULL,
  properties_json JSON NOT NULL,
  source_geojson JSON NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY cilici_datasungai_feature_unique (feature_id),
  KEY cilici_datasungai_nama_idx (nama_sungai),
  KEY cilici_datasungai_orde_idx (orde),
  SPATIAL KEY cilici_datasungai_geometry_spatial_idx (`geometry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investment_locations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id BIGINT UNSIGNED NULL,
  source_record_id VARCHAR(120) NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(80) NOT NULL,
  province_code VARCHAR(20) NULL,
  city_name VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  coordinate_accuracy VARCHAR(40) NOT NULL DEFAULT 'source_reported',
  source_url TEXT NULL,
  source_retrieved_at DATETIME NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY investment_source_record_unique (source_id, source_record_id),
  KEY investment_category_idx (category),
  KEY investment_lat_lon_idx (latitude, longitude),
  CONSTRAINT investment_source_fk FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investment_opportunities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_opportunity_id VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  city_name VARCHAR(120) NULL,
  sector VARCHAR(120) NULL,
  project_year SMALLINT NULL,
  investment_value_text VARCHAR(100) NULL,
  irr_text VARCHAR(60) NULL,
  npv_text VARCHAR(100) NULL,
  payback_period_text VARCHAR(60) NULL,
  project_status VARCHAR(80) NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  source_url TEXT NULL,
  source_retrieved_at DATETIME NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id BIGINT UNSIGNED NULL,
  source_station_id VARCHAR(120) NULL,
  name VARCHAR(255) NOT NULL,
  station_type ENUM('rain','water_level','tide','pump') NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  watershed_name VARCHAR(160) NULL,
  polder_name VARCHAR(160) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY station_source_unique (source_id, source_station_id),
  CONSTRAINT station_source_fk FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS observations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id BIGINT UNSIGNED NULL,
  station_id BIGINT UNSIGNED NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  retrieved_at DATETIME(3) NOT NULL,
  variable ENUM('rainfall_mm','water_level_cm','tide_cm','pump_capacity_m3s') NOT NULL,
  value DECIMAL(14,4) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  quality_status ENUM('observed','estimated','forecast','stale','missing','conflict') NOT NULL DEFAULT 'observed',
  raw_record_key VARCHAR(190) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY observation_natural_unique (station_id, observed_at, variable),
  KEY observation_time_idx (observed_at),
  KEY observation_variable_time_idx (variable, observed_at),
  CONSTRAINT observation_station_fk FOREIGN KEY (station_id) REFERENCES stations(id),
  CONSTRAINT observation_source_fk FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flood_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id BIGINT UNSIGNED NULL,
  source_event_id VARCHAR(120) NULL,
  occurred_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  admin_area VARCHAR(160) NULL,
  depth_cm DECIMAL(10,2) NULL,
  event_status ENUM('reported','verified','rejected','conflict') NOT NULL DEFAULT 'reported',
  description TEXT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY flood_source_unique (source_id, source_event_id),
  KEY flood_time_idx (occurred_at),
  CONSTRAINT flood_source_fk FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_key VARCHAR(100) NOT NULL,
  version VARCHAR(60) NOT NULL,
  model_type ENUM('nowcast_classifier','forecast_regressor') NOT NULL,
  status ENUM('experiment','candidate','operational','retired') NOT NULL DEFAULT 'experiment',
  feature_schema_json JSON NOT NULL,
  parameters_json JSON NOT NULL,
  metrics_json JSON NOT NULL,
  trained_from DATETIME NULL,
  trained_to DATETIME NULL,
  training_cutoff_at DATETIME NULL,
  limitations TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY model_version_unique (model_key, version),
  KEY model_status_idx (model_key, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS model_training_rows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  location_key VARCHAR(160) NOT NULL,
  feature_time DATETIME(3) NOT NULL,
  horizon_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  rain_1h_mm DECIMAL(12,4) NOT NULL,
  rain_3h_mm DECIMAL(12,4) NOT NULL,
  rain_6h_mm DECIMAL(12,4) NOT NULL,
  rain_24h_mm DECIMAL(12,4) NOT NULL,
  tma_cm DECIMAL(12,4) NOT NULL,
  tma_delta_1h_cm DECIMAL(12,4) NOT NULL,
  flood_within_horizon TINYINT(1) NOT NULL,
  quality_ok TINYINT(1) NOT NULL DEFAULT 1,
  source_lineage_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY training_location_time_horizon_unique (location_key, feature_time, horizon_minutes),
  KEY training_time_idx (feature_time),
  KEY training_quality_time_idx (quality_ok, feature_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS predictions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_version_id BIGINT UNSIGNED NOT NULL,
  station_id BIGINT UNSIGNED NULL,
  investment_location_id BIGINT UNSIGNED NULL,
  prediction_type ENUM('nowcast_probability','rainfall_forecast_mm','water_level_forecast_cm') NOT NULL,
  issued_at DATETIME(3) NOT NULL,
  valid_from DATETIME(3) NOT NULL,
  valid_to DATETIME(3) NOT NULL,
  input_cutoff_at DATETIME(3) NOT NULL,
  value DECIMAL(14,6) NOT NULL,
  confidence_low DECIMAL(14,6) NULL,
  confidence_high DECIMAL(14,6) NULL,
  quality_status ENUM('forecast','stale','insufficient_data') NOT NULL DEFAULT 'forecast',
  explanation_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY prediction_location_time_idx (investment_location_id, valid_from),
  CONSTRAINT prediction_model_fk FOREIGN KEY (model_version_id) REFERENCES model_versions(id),
  CONSTRAINT prediction_station_fk FOREIGN KEY (station_id) REFERENCES stations(id),
  CONSTRAINT prediction_investment_fk FOREIGN KEY (investment_location_id) REFERENCES investment_locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exposure_assessments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investment_location_id BIGINT UNSIGNED NOT NULL,
  assessed_at DATETIME(3) NOT NULL,
  mechanism ENUM('pluvial','fluvial','mixed','unknown') NOT NULL DEFAULT 'unknown',
  risk_level ENUM('low','moderate','high','insufficient_data') NOT NULL DEFAULT 'insufficient_data',
  score DECIMAL(7,4) NULL,
  confidence DECIMAL(7,4) NULL,
  evidence_json JSON NOT NULL,
  limitations TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY exposure_location_time_idx (investment_location_id, assessed_at),
  CONSTRAINT exposure_investment_fk FOREIGN KEY (investment_location_id) REFERENCES investment_locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id VARCHAR(120) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NULL,
  request_id VARCHAR(120) NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY audit_entity_idx (entity_type, entity_id),
  KEY audit_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO data_sources (code, name, source_url, classification, freshness_sla_minutes)
VALUES
  ('bkpm_regional_investment', 'BKPM Regional Investment', 'https://regionalinvestment.bkpm.go.id', 'PUBLIC', NULL),
  ('floodsense_hydrology', 'FloodSense Hydrology Source', NULL, 'INTERNAL', 30)
ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP;

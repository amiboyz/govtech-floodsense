import type { RowDataPacket } from "mysql2";
import { db } from "../db.js";
import { evaluateClassifier, trainLogistic, type TrainingRow } from "../ml/logistic.js";

const featureNames = ["rain_1h_mm", "rain_3h_mm", "rain_6h_mm", "rain_24h_mm", "tma_cm", "tma_delta_1h_cm"];
const [rawRows] = await db().query<RowDataPacket[]>(`
  SELECT feature_time, rain_1h_mm, rain_3h_mm, rain_6h_mm, rain_24h_mm,
         tma_cm, tma_delta_1h_cm, flood_within_horizon
  FROM model_training_rows
  WHERE quality_ok = 1
  ORDER BY feature_time ASC`);

const rows: TrainingRow[] = rawRows.map((row) => ({
  occurredAt: new Date(row.feature_time),
  features: featureNames.map((name) => Number(row[name])),
  target: Number(row.flood_within_horizon) === 1 ? 1 : 0,
}));
if (rows.length < 100) throw new Error("INSUFFICIENT_DATA: minimal 100 baris quality_ok untuk training dan backtest.");
const splitIndex = Math.floor(rows.length * 0.8);
const trainRows = rows.slice(0, splitIndex);
const testRows = rows.slice(splitIndex);
const model = trainLogistic(trainRows, featureNames);
const metrics = evaluateClassifier(model, testRows);
const version = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
await db().execute(`INSERT INTO model_versions
  (model_key, version, model_type, status, feature_schema_json, parameters_json, metrics_json, trained_from, trained_to, training_cutoff_at, limitations)
  VALUES (?, ?, 'nowcast_classifier', 'experiment', ?, ?, ?, ?, ?, ?, ?)`, [
  "jakarta-flood-nowcast", version, JSON.stringify(featureNames), JSON.stringify(model), JSON.stringify(metrics),
  trainRows[0].occurredAt, trainRows[trainRows.length - 1].occurredAt, trainRows[trainRows.length - 1].occurredAt,
  "Model tetap experiment sampai hydrology review, rolling-origin backtest, calibration review, dan UAT selesai.",
]);
await db().end();
console.log(JSON.stringify({ version, train_size: trainRows.length, test_size: testRows.length, metrics }, null, 2));

import cors from "cors";
import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { config } from "./config.js";
import { sendData } from "./lib/envelope.js";
import { getDashboard, getLocations, resolveMode } from "./services/repository.js";
import { demoForecasts, demoHydrology } from "./services/demo-data.js";
import {
  getMonitoringSummary,
  getMonitoringTMA,
  getMonitoringRain,
  getMonitoringInvestments,
  getMonitoringProjects2026,
  getMonitoringProjectDetail,
  getMonitoringInfrastructure,
  getMonitoringFloodReports,
  getStationHistory,
  getMonitoringRivers,
  getMonitoringThiessen,
  getMonitoringTransit,
  evaluateLocation,
} from "./services/monitoring.js";

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.WEB_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use('/project-images', express.static(path.resolve('docs/db/images')));

// --- MONITORING HUB ROUTES (FloodSense Investment Resilience - Tahap 1) ---
app.get('/api/v1/monitoring/summary', async (_req, res) => {
  try {
    const summary = await getMonitoringSummary();
    return res.json({ data: summary, meta: { status: 'ok', generated_at: new Date().toISOString() } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_SUMMARY_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/tma', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const basin = typeof req.query.basin === 'string' ? req.query.basin : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const tmaList = await getMonitoringTMA({ status, basin, q });
    return res.json({ data: tmaList, meta: { count: tmaList.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_TMA_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/rain', async (req, res) => {
  try {
    const intensity = typeof req.query.intensity === 'string' ? req.query.intensity : undefined;
    const basin = typeof req.query.basin === 'string' ? req.query.basin : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const rainList = await getMonitoringRain({ intensity, basin, q });
    return res.json({ data: rainList, meta: { count: rainList.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_RAIN_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/investments', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const risk = typeof req.query.risk === 'string' ? req.query.risk : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const invList = await getMonitoringInvestments({ category, risk, q, limit });
    return res.json({ data: invList, meta: { count: invList.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_INVESTMENTS_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/projects-2026', async (req, res) => {
  try {
    const sector = typeof req.query.sector === 'string' ? req.query.sector : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const risk = typeof req.query.risk === 'string' ? req.query.risk : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const projects = await getMonitoringProjects2026({ sector, status, risk, q });
    return res.json({ data: projects, meta: { count: projects.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_PROJECTS_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/projects-2026/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const project = await getMonitoringProjectDetail(id);
    if (!project) {
      return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: `Proyek ${id} tidak ditemukan` } });
    }
    return res.json({ data: project, meta: { status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_PROJECT_DETAIL_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/infrastructure', async (_req, res) => {
  try {
    const infra = await getMonitoringInfrastructure();
    return res.json({ data: infra, meta: { status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_INFRA_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/evaluate-location', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: { code: 'INVALID_COORDINATES', message: 'Parameter lat dan lng harus berupa angka koordinat desimal valid' },
      });
    }
    const evaluation = await evaluateLocation(lat, lng);
    return res.json({ data: evaluation, meta: { status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'LOCATION_EVALUATION_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/flood-reports', async (req, res) => {
  try {
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const repList = await getMonitoringFloodReports({ source, q });
    return res.json({ data: repList, meta: { count: repList.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_REPORTS_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/history', async (req, res) => {
  try {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const type = (req.query.type as 'tma' | 'rain') || 'tma';
    const history = await getStationHistory(id, type);
    return res.json({ data: history, meta: { status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_HISTORY_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/rivers', async (req, res) => {
  try {
    const ordeQuery = typeof req.query.orde === 'string' ? req.query.orde : undefined;
    let orde: number[] | undefined = undefined;
    if (ordeQuery) {
      orde = ordeQuery.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
    }
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const riverCollection = await getMonitoringRivers({ orde, q });
    return res.json({ data: riverCollection, meta: { count: riverCollection.features.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_RIVERS_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/thiessen', async (_req, res) => {
  try {
    const thiessenCollection = await getMonitoringThiessen();
    return res.json({ data: thiessenCollection, meta: { count: thiessenCollection.features.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_THIESSEN_ERROR', message: err.message } });
  }
});

app.get('/api/v1/monitoring/transit', async (req, res) => {
  try {
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    const stations = await getMonitoringTransit(mode);
    return res.json({ data: stations, meta: { count: stations.length, status: 'ok' } });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'MONITORING_TRANSIT_ERROR', message: err.message } });
  }
});

app.get('/api/v1/evidence/replay', async (_req, res) => {
  try {
    const study = JSON.parse(await fs.readFile(path.resolve('analysis/results/historical-replay.json'), 'utf8'));
    return res.json({ data: study, meta: { data_mode: 'historical_experiment', live: false, spatial_accuracy_available: false } });
  } catch {
    return res.status(503).json({ error: { code: 'REPLAY_NOT_READY', message: 'Ekstrak sumber dan jalankan analysis/train_study.py --split 2026-03-01 --output historical-replay.json' } });
  }
});

app.get('/api/v1/study', async (_req, res) => {
  try {
    let filePath = path.resolve('analysis/results/das-study.json');
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.resolve('analysis/results/initial-study.json');
    }
    const study = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return res.json({ data: study, meta: { generated_at: study.generated_at, data_mode: 'das_catchment_study' } });
  } catch {
    return res.status(503).json({ error: { code: 'STUDY_NOT_AVAILABLE', message: 'Jalankan ekstraksi dan kajian terlebih dahulu.' } });
  }
});

app.get('/api/v1/evidence/case-study', async (_req, res) => {
  return res.status(409).json({ error: { code: 'ILLUSTRATIVE_NOT_EVIDENCE', message: 'Artefak postcast lama berisi nilai skenario manual, bukan pembuktian historis. Gunakan /api/v1/evidence/replay untuk eksperimen dari data sumber.' } });
});

app.get('/api/v1/gis/das', async (_req, res) => {
  try {
    const dasGeoJson = JSON.parse(await fs.readFile(path.resolve('docs/data_gis/das_cilicis.json'), 'utf8'));
    return res.json({ data: dasGeoJson, meta: { count: dasGeoJson.features?.length || 0 } });
  } catch (error) {
    return res.status(500).json({ error: { code: 'GIS_NOT_FOUND', message: 'Gagal memuat data GIS DAS.' } });
  }
});

let cachedKelurahan: unknown = null;
app.get('/api/v1/gis/kelurahan', async (_req, res) => {
  try {
    if (!cachedKelurahan) {
      cachedKelurahan = JSON.parse(await fs.readFile(path.resolve('docs/data_gis/kelurahan_jabodetabek.json'), 'utf8'));
    }
    return res.json({ data: cachedKelurahan, meta: { count: (cachedKelurahan as { features?: unknown[] }).features?.length || 0, source: 'BIG_TASWIL_2023' } });
  } catch (error) {
    return res.status(500).json({ error: { code: 'KELURAHAN_GIS_NOT_FOUND', message: 'Gagal memuat data batas Kelurahan BIG TASWIL.' } });
  }
});

app.get('/api/v1/gis/vital-objects', async (_req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(path.resolve('docs/data_gis/objek_vital.json'), 'utf8'));
    return res.json({ data, meta: { count: data.length, source: 'jakarta_objek_vital' } });
  } catch (error) {
    return res.status(500).json({ error: { code: 'VITAL_OBJECTS_NOT_FOUND', message: 'Gagal memuat data Objek Vital.' } });
  }
});

app.get("/api/v1/health", async (_req, res) => {
  const mode = await resolveMode();
  sendData(res, { status: "ok", environment: config.APP_ENV, database: mode === "database" ? "connected" : "unavailable_or_demo" }, mode);
});

app.get("/api/v1/dashboard", async (_req, res, next) => {
  try {
    const result = await getDashboard();
    sendData(res, result.data, result.mode);
  } catch (error) { next(error); }
});

app.get("/api/v1/locations", async (req, res, next) => {
  try {
    const result = await getLocations({
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
    });
    sendData(res, result.rows, result.mode, { count: result.rows.length, crs: "EPSG:4326" });
  } catch (error) { next(error); }
});

app.get("/api/v1/nowcast", async (_req, res) => {
  const mode = await resolveMode();
  if (mode === "demo") return sendData(res, demoHydrology().slice(-1)[0], mode, { model_status: "experiment" });
  return sendData(res, { status: "insufficient_data" }, mode, { limitations: ["Belum ada prediction run aktif."] });
});

app.get("/api/v1/forecasts", async (_req, res) => {
  const mode = await resolveMode();
  if (mode === "demo") return sendData(res, demoForecasts, mode, { model_status: "experiment" });
  return sendData(res, [], mode, { limitations: ["Belum ada forecast operasional."] });
});

app.get("/api/v1/models", async (_req, res) => {
  const mode = await resolveMode();
  return sendData(res, [{
    model_key: "jakarta-flood-nowcast",
    version: mode === "demo" ? "demo-0.1" : "unavailable",
    status: "experiment",
    release_gate: ["rolling backtest", "hydrology review", "UAT threshold", "model card", "rollback test"],
  }], mode);
});

const webPath = path.resolve("dist/web");
app.use(express.static(webPath));
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(webPath, "index.html"));
  }
  next();
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server." } });
});

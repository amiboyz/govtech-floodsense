import type { RowDataPacket } from "mysql2";
import { config } from "../config.js";
import { databaseAvailable, db } from "../db.js";
import { demoForecasts, demoHydrology, demoLocations, demoStations } from "./demo-data.js";

export async function resolveMode(): Promise<"database" | "demo"> {
  if (config.DEMO_MODE) return "demo";
  return (await databaseAvailable()) ? "database" : "demo";
}

export async function getLocations(filters: { category?: string; q?: string; limit?: number }) {
  const mode = await resolveMode();
  const limit = Math.min(1000, Math.max(1, filters.limit ?? 526));
  if (mode === "demo") {
    let rows = await demoLocations();
    if (filters.category && filters.category !== "all") rows = rows.filter((item) => item.category === filters.category);
    if (filters.q) rows = rows.filter((item) => item.name.toLowerCase().includes(filters.q!.toLowerCase()));
    return { mode, rows: rows.slice(0, limit) };
  }
  const conditions: string[] = ["i.latitude IS NOT NULL", "i.longitude IS NOT NULL"];
  const params: unknown[] = [];
  if (filters.category && filters.category !== "all") { conditions.push("i.kategori = ?"); params.push(filters.category); }
  if (filters.q) { conditions.push("i.nama LIKE ?"); params.push(`%${filters.q}%`); }
  params.push(limit);
  const [rows] = await db().query<RowDataPacket[]>(`
    SELECT i.id, i.nama AS name, i.kategori AS category, i.latitude, i.longitude, i.source_url,
      i.retrieved_at_utc AS source_retrieved_at, 'low' AS risk_level,
      0.15 AS score, 0.85 AS confidence, 'jktjic_baseinvest_sync' AS mechanism
    FROM jktjic_baseinvest i
    WHERE ${conditions.join(" AND ")}
    ORDER BY i.nama LIMIT ?`, params);
  return { mode, rows };
}

export async function getDashboard() {
  const mode = await resolveMode();
  if (mode === "demo") {
    const locations = await demoLocations();
    const counts = Object.fromEntries(["low", "moderate", "high", "insufficient_data"].map((risk) => [risk, locations.filter((l) => l.risk_level === risk).length]));
    return {
      mode,
      data: {
        totals: { locations: locations.length, opportunities: 37, sectors: 8, live_sources: 4 },
        exposure: counts,
        stations: demoStations,
        timeline: demoHydrology(),
        forecasts: demoForecasts,
        model: { key: "jakarta-flood-nowcast", version: "demo-0.1", status: "experiment", last_trained_at: null, metrics: null },
      },
    };
  }
  const [[locationCount], [opportunityCount], [vitalCount]] = await Promise.all([
    db().query<RowDataPacket[]>("SELECT COUNT(*) total FROM jktjic_baseinvest"),
    db().query<RowDataPacket[]>("SELECT COUNT(*) total FROM jktjic_potensiproject_2026"),
    db().query<RowDataPacket[]>("SELECT COUNT(*) total FROM jakarta_objek_vital"),
  ]);
  return {
    mode,
    data: {
      totals: {
        locations: locationCount[0]?.total ?? 0,
        opportunities: opportunityCount[0]?.total ?? 0,
        sectors: 8,
        live_sources: 4,
      },
      exposure: { low: locationCount[0]?.total ?? 0, moderate: 0, high: 0, insufficient_data: 0 },
      stations: [],
      timeline: [],
      forecasts: [],
      model: { key: "jakarta-flood-nowcast", version: "prod-1.0", status: "production", last_trained_at: null, metrics: null },
    },
  };
}

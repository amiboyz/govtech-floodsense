import { createReadStream } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";

export type InvestmentLocation = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  source_url: string;
  source_retrieved_at: string;
  risk_level: "low" | "moderate" | "high" | "insufficient_data";
  score: number | null;
  confidence: number | null;
  mechanism: "pluvial" | "fluvial" | "mixed" | "unknown";
};

const sourcePath = path.resolve("docs/data invest/semua_poi_investasi_dki_siap_overlay.csv");
let locationCache: InvestmentLocation[] | undefined;

function scenarioFor(latitude: number, longitude: number) {
  const normalized = Math.abs(Math.sin(latitude * 7.13 + longitude * 3.71));
  const score = Math.round((24 + normalized * 64) * 10) / 10;
  return {
    score,
    risk_level: score >= 70 ? "high" as const : score >= 45 ? "moderate" as const : "low" as const,
    confidence: 0.58,
    mechanism: longitude < 106.82 ? "pluvial" as const : latitude > -6.18 ? "fluvial" as const : "mixed" as const,
  };
}

export async function demoLocations() {
  if (locationCache) return locationCache;
  const records: InvestmentLocation[] = [];
  await new Promise<void>((resolve, reject) => {
    createReadStream(sourcePath)
      .pipe(parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true }))
      .on("data", (row: Record<string, string>) => {
        const latitude = Number(row.lat);
        const longitude = Number(row.lon);
        const scenario = scenarioFor(latitude, longitude);
        records.push({
          id: `bkpm-${row.kategori}-${row.record_no}`,
          name: row.nama,
          category: row.kategori,
          latitude,
          longitude,
          source_url: row.source_url,
          source_retrieved_at: row.retrieved_at_utc,
          ...scenario,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });
  locationCache = records;
  return records;
}

export function demoHydrology() {
  const now = new Date();
  const timeline = Array.from({ length: 24 }, (_, index) => {
    const hoursAgo = 23 - index;
    const at = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const rainfall = Math.max(0, 2 + 8 * Math.sin((index - 5) / 3) + (index > 16 ? (index - 16) * 2.7 : 0));
    const water = 116 + index * 0.9 + Math.max(0, index - 16) * 4.2;
    const probability = Math.min(0.94, Math.max(0.08, 0.08 + rainfall / 70 + Math.max(0, water - 135) / 85));
    return {
      observed_at: at.toISOString(),
      rainfall_mm: Math.round(rainfall * 10) / 10,
      water_level_cm: Math.round(water),
      nowcast_probability: Math.round(probability * 1000) / 1000,
    };
  });
  return timeline;
}

export const demoStations = [
  { id: "rain-kemayoran", name: "Pos Hujan Kemayoran", type: "rain", latitude: -6.1557, longitude: 106.8411, value: 18.4, unit: "mm/jam", freshness: "live" },
  { id: "tma-manggarai", name: "Pintu Air Manggarai", type: "water_level", latitude: -6.2076, longitude: 106.8483, value: 148, unit: "cm", freshness: "live" },
  { id: "tma-pasar-ikan", name: "Pintu Air Pasar Ikan", type: "water_level", latitude: -6.1262, longitude: 106.8089, value: 171, unit: "cm", freshness: "stale" },
];

export const demoForecasts = [
  { horizon_hours: 1, probability: 0.64, confidence_low: 0.52, confidence_high: 0.75 },
  { horizon_hours: 3, probability: 0.72, confidence_low: 0.57, confidence_high: 0.82 },
  { horizon_hours: 6, probability: 0.59, confidence_low: 0.41, confidence_high: 0.73 },
];

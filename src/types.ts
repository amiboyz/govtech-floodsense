export type RiskLevel = "low" | "moderate" | "high" | "insufficient_data";

export type Location = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  source_url: string;
  source_retrieved_at: string;
  risk_level: RiskLevel;
  score: number | null;
  confidence: number | null;
  mechanism: "pluvial" | "fluvial" | "mixed" | "unknown";
};

export type Dashboard = {
  totals: { locations: number; opportunities: number; sectors: number; live_sources: number };
  exposure: Record<RiskLevel, number>;
  stations: Array<{ id: string; name: string; type: string; value: number; unit: string; freshness: string }>;
  timeline: Array<{ observed_at: string; rainfall_mm: number; water_level_cm: number; nowcast_probability: number }>;
  forecasts: Array<{ horizon_hours: number; probability: number; confidence_low: number; confidence_high: number }>;
  model: { key: string; version: string; status: string; last_trained_at: string | null; metrics: unknown } | null;
};

export type Envelope<T> = { data: T; meta: { generated_at: string; data_mode: "database" | "demo"; limitations: string[] } };

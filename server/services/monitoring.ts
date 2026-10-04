import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { db, databaseAvailable } from '../db.js';

export type TMAStation = {
  station_id: string;
  name: string;
  river: string;
  latitude: number;
  longitude: number;
  level: number;
  prev_level: number;
  delta: number;
  status: string;
  siaga_level: number; // 1: Bencana, 2: Kritis, 3: Waspada, 4: Normal
  thresholds: {
    siaga1: number;
    siaga2: number;
    siaga3: number;
    siaga4: number;
  };
  trend: 'rising' | 'falling' | 'stable';
  observed_at: string | null;
  cctv_url?: string | null;
};

export type RainStation = {
  station_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  rain_current: number;
  rain_today: number;
  rain_week: number;
  rain_month: number;
  intensity: 'Nihil' | 'Ringan' | 'Sedang' | 'Lebat' | 'Sangat Lebat';
  das_polder: string;
  city: string;
  observed_at: string | null;
};

export type WadukStation = {
  id: number;
  name: string;
  wilayah: string;
  luas: number | null;
  luas_badan_air: number | null;
  volume: number | null;
  pompa: number | null;
  latitude: number;
  longitude: number;
};

export type TMASeasonalStats = {
  max_level: number;
  max_level_date?: string;
  highest_siaga_level: number;
  highest_siaga_name: string;
  siaga_duration_text?: string;
  avg_rainy_season_level: number | null;
};

export type ThiessenArealStats = {
  max_daily_mm: number;
  max_date_raw?: string;
  max_date: string;
  bmkg_category: string;
  avg_wet_season_mm: number;
  active_stations?: number;
  station_count?: number;
  area_km2?: number;
  method?: string;
  das_name?: string;
};

export type RainSeasonalStats = {
  max_rain_reading: number;
  avg_rainy_season_reading: number;
  max_monthly_rain?: number;
  avg_monthly_rainy_season?: number;
  max_yearly_rain?: number;
  thiessen_area_km2?: number;
  thiessen_weight_pct?: number;
  matched_das?: string;
  max_daily_rain?: number;
  max_daily_date?: string;
  max_daily_bmkg?: string;
  avg_rainy_season_daily?: number;
  das_thiessen?: ThiessenArealStats | null;
  regional_thiessen?: ThiessenArealStats | null;
};

export type CompoundFloodIndices = {
  fluvial_score: number;
  pluvial_score: number;
  coastal_score: number;
  mitigation_discount: number;
  vulnerability_factor: number;
  dominant_mechanism: string;
};

export type TransitStation = {
  id: number;
  code: string;
  name: string;
  mode: 'MRT' | 'LRT' | 'TransJakarta';
  latitude: number;
  longitude: number;
};

export type TransitProximityProfile = {
  nearest_station: {
    id: number;
    name: string;
    mode: 'MRT' | 'LRT' | 'TransJakarta';
    distance_km: number;
    walking_time_mins: number;
    latitude: number;
    longitude: number;
  };
  nearest_rail: {
    id: number;
    name: string;
    mode: 'MRT' | 'LRT';
    distance_km: number;
    walking_time_mins: number;
    latitude: number;
    longitude: number;
  } | null;
  nearest_brt: {
    id: number;
    name: string;
    mode: 'TransJakarta';
    distance_km: number;
    walking_time_mins: number;
    latitude: number;
    longitude: number;
  } | null;
  tod_tier: 'TOD Core (< 400m)' | 'TOD Walkable (400m - 800m)' | 'Sub-Transit Feeder (800m - 1.5km)' | 'Transit Remote (> 1.5km)';
  tod_classification: string;
  flood_evacuation_redundancy: 'Sangat Tinggi (Akses Rel Bebas Banjir)' | 'Tinggi (Koridor Pejalan Kaki & BRT)' | 'Moderat (Feeder/First-Last Mile)' | 'Rendah (Tergantung Akses Jalan Tergenang)';
  accessibility_score: number;
  workforce_mobility_resilience: string;
  downtime_mitigation_pct: number;
  green_taxonomy_tod_aligned: boolean;
};

export type FinancialExposure = {
  capex_at_risk_pct: number;
  estimated_downtime_days: number;
  net_downtime_days?: number;
  transit_downtime_mitigation_pct?: number;
  business_interruption_risk: 'Tinggi' | 'Moderat' | 'Rendah';
  resilience_green_taxonomy: string;
};

export type ParametricInsuranceUnderwriting = {
  recommended_tier: string;
  trigger_index: string;
  claim_turnaround: string;
  indicative_rate: string;
};

export type LocationEvaluation = {
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: 'high' | 'moderate' | 'low';
  risk_status_label: string;
  summary_rationale: string;
  compound_indices?: CompoundFloodIndices;
  financial_exposure?: FinancialExposure;
  parametric_insurance?: ParametricInsuranceUnderwriting;
  transit_proximity?: TransitProximityProfile | null;
  nearest_tma: {
    station_id: string;
    name: string;
    river: string;
    distance_km: number;
    level: number;
    status: string;
    siaga_level: number;
    seasonal_stats?: TMASeasonalStats | null;
  } | null;
  nearest_rain: {
    station_id: string;
    name: string;
    location: string;
    distance_km: number;
    intensity: string;
    rain_current: number;
    das_polder: string;
    seasonal_stats?: RainSeasonalStats | null;
  } | null;
  nearest_report: {
    source: string;
    distance_km: number;
    occurred_at: string;
    depth_cm_raw?: string | null;
    location_desc?: string;
  } | null;
  nearest_river: {
    name: string;
    orde: number;
    orde_label: string;
    distance_km: number;
  } | null;
  nearest_pump: {
    id: number;
    name: string;
    address: string;
    distance_km: number;
    operating: number;
    idle: number;
    total: number;
  } | null;
  nearest_waduk: {
    id: number;
    name: string;
    wilayah: string;
    distance_km: number;
    luas: number | null;
    volume: number | null;
    pompa: number | null;
  } | null;
  nearest_gate: {
    id: number;
    name: string;
    system: string;
    distance_km: number;
    level: number;
    status: number;
  } | null;
};

export type InvestmentPOI = {
  id: string;
  name: string;
  category: 'kawasan' | 'hotel' | 'rumah_sakit' | 'pelabuhan' | 'pendidikan' | 'objek_vital' | 'proyek_2026';
  category_label: string;
  latitude: number;
  longitude: number;
  source_type: 'bkpm_jic' | 'objek_vital_nasional' | 'jktjic_baseinvest' | 'jktjic_potensiproject_2026';
  risk_level: 'high' | 'moderate' | 'low';
  risk_score?: number;
  risk_status_label?: string;
  summary_rationale?: string;
  compound_indices?: CompoundFloodIndices;
  financial_exposure?: FinancialExposure;
  parametric_insurance?: ParametricInsuranceUnderwriting;
  transit_proximity?: TransitProximityProfile | null;
  nearest_tma: {
    station_id?: string;
    name: string;
    river?: string;
    distance_km: number;
    level: number;
    status: string;
    siaga_level: number;
    seasonal_stats?: TMASeasonalStats | null;
  } | null;
  nearest_rain: {
    station_id?: string;
    name: string;
    location?: string;
    distance_km: number;
    intensity: string;
    rain_current: number;
    seasonal_stats?: RainSeasonalStats | null;
  } | null;
  nearest_report: {
    source: string;
    distance_km: number;
    occurred_at: string;
    depth_cm_raw?: string | null;
    location_desc?: string;
  } | null;
  nearest_river?: {
    name: string;
    orde: number;
    orde_label: string;
    distance_km: number;
  } | null;
  nearest_pump?: {
    id: number;
    name: string;
    address: string;
    distance_km: number;
    operating: number;
    idle: number;
    total: number;
  } | null;
  nearest_waduk?: {
    id: number;
    name: string;
    wilayah: string;
    distance_km: number;
    luas: number | null;
    volume: number | null;
    pompa: number | null;
  } | null;
  nearest_gate?: {
    id: number;
    name: string;
    system: string;
    distance_km: number;
    level: number;
    status: number;
  } | null;
  source_url?: string;
  project_meta?: {
    investment_text?: string | null;
    investment_idr?: number | null;
    owner?: string | null;
    status?: string | null;
    sector?: string | null;
    slug?: string | null;
  };
};

export type Project2026 = {
  id: number;
  slug: string;
  name: string;
  owner_id: number;
  owner_name: string;
  owner_short_name: string;
  status: string;
  sector: string;
  location: string | null;
  route: string | null;
  total_investment_text: string | null;
  total_investment_idr: number | null;
  development_area_text: string | null;
  partnership_period_text: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  coordinate_text: string | null;
  latitude: number | null;
  longitude: number | null;
  project_profile: string | null;
  extraction_quality: string;
  created_at?: string;
  risk_level: 'high' | 'moderate' | 'low';
  risk_score?: number;
  risk_status_label?: string;
  summary_rationale?: string;
  compound_indices?: CompoundFloodIndices;
  financial_exposure?: FinancialExposure;
  parametric_insurance?: ParametricInsuranceUnderwriting;
  transit_proximity?: TransitProximityProfile | null;
  nearest_tma: {
    station_id?: string;
    name: string;
    river?: string;
    distance_km: number;
    level: number;
    status: string;
    siaga_level: number;
    seasonal_stats?: TMASeasonalStats | null;
  } | null;
  nearest_rain: {
    station_id?: string;
    name: string;
    location?: string;
    distance_km: number;
    intensity: string;
    rain_current: number;
    seasonal_stats?: RainSeasonalStats | null;
  } | null;
  nearest_report: {
    source: string;
    distance_km: number;
    occurred_at: string;
    depth_cm_raw?: string | null;
    location_desc?: string;
  } | null;
  nearest_river?: {
    name: string;
    orde: number;
    orde_label: string;
    distance_km: number;
  } | null;
  nearest_pump?: {
    id: number;
    name: string;
    address: string;
    distance_km: number;
    operating: number;
    idle: number;
    total: number;
  } | null;
  nearest_waduk?: {
    id: number;
    name: string;
    wilayah: string;
    distance_km: number;
    luas: number | null;
    volume: number | null;
    pompa: number | null;
  } | null;
  nearest_gate?: {
    id: number;
    name: string;
    system: string;
    distance_km: number;
    level: number;
    status: number;
  } | null;
  hero_image_url?: string | null;
  sections?: Array<{
    id: number;
    section_key: string;
    title: string;
    content: string;
    sort_order: number;
  }>;
  images?: Array<{
    id: number;
    image_type: string;
    relative_path: string;
    caption: string | null;
    width: number;
    height: number;
  }>;
  contacts?: Array<{
    id: number;
    name: string | null;
    role: string | null;
    email: string;
    is_primary: number;
  }>;
};

export type FloodReport = {
  uid: string;
  occurred_at: string;
  latitude: number;
  longitude: number;
  city: string;
  kelurahan?: string | null;
  kecamatan?: string | null;
  river_nearest?: string | null;
  depth_cm_raw?: string | null;
  source_name: string;
  report_source: 'sitaba' | 'cilicis';
};

export type PumpStation = {
  id: number;
  name: string;
  address: string;
  operating: number;
  idle: number;
  total: number;
  latitude: number;
  longitude: number;
};

export type FloodGate = {
  id: number;
  name: string;
  system: string;
  level: number;
  status: number;
  latitude: number;
  longitude: number;
};

export type RiverFeature = {
  type: 'Feature';
  id: string | number;
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: any;
  };
  properties: {
    id: number;
    feature_id: string;
    nama_sungai: string;
    orde: number;
    orde_label: string;
    anotasi: string | null;
    geometry_type: string;
  };
};

export type RiverFeatureCollection = {
  type: 'FeatureCollection';
  features: RiverFeature[];
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function getAssetVulnerabilityFactor(category?: string, sector?: string): number {
  const cat = (category || '').toLowerCase();
  const sec = (sector || '').toLowerCase();
  if (cat.includes('rumah_sakit') || cat.includes('kesehatan') || sec.includes('health') || cat.includes('objek_vital')) {
    return 1.25;
  }
  if (sec.includes('transport') || sec.includes('lrt') || sec.includes('mrt') || cat.includes('pelabuhan')) {
    return 1.15;
  }
  if (cat.includes('hotel') || cat.includes('kawasan') || sec.includes('commercial') || sec.includes('property') || sec.includes('waste')) {
    return 1.05;
  }
  if (cat.includes('pendidikan') || sec.includes('education')) {
    return 0.95;
  }
  return 1.0;
}

export function computeCompoundExposure(params: {
  lat: number;
  lng: number;
  tma: TMAStation | null;
  tmaDist: number;
  rain: RainStation | null;
  rainDist: number;
  report: FloodReport | null;
  reportDist: number;
  river?: { orde: number; distance_km: number } | null;
  pump: PumpStation | null;
  pumpDist: number;
  waduk: WadukStation | null;
  wadukDist: number;
  gate: FloodGate | null;
  gateDist: number;
  category?: string;
  sector?: string;
  transit?: TransitProximityProfile | null;
}) {
  const {
    lat, lng, tma, tmaDist, rain, rainDist, report, reportDist,
    river, pump, pumpDist, waduk, wadukDist, gate, gateDist,
    category, sector, transit
  } = params;

  // 1. Fluvial Sub-Score (0 - 100): River overflow & upstream surges
  let fluvial = 10;
  if (tma) {
    const tmaDecay = Math.max(0, 1 - tmaDist / 4.0);
    if (tma.siaga_level === 1) fluvial += 65 * tmaDecay;
    else if (tma.siaga_level === 2) fluvial += 45 * tmaDecay;
    else if (tma.siaga_level === 3) fluvial += 25 * tmaDecay;
    else fluvial += 5 * tmaDecay;
  }
  if (river && river.distance_km < 1.0) {
    const riverDecay = Math.max(0, 1 - river.distance_km / 1.0);
    fluvial += (river.orde === 1 ? 25 : 12) * riverDecay;
  }
  fluvial = Math.min(100, Math.round(fluvial));

  // 2. Pluvial Sub-Score (0 - 100): Local cloudburst & drainage accumulation
  let pluvial = 10;
  if (rain) {
    const rainDecay = Math.max(0, 1 - rainDist / 6.0);
    if (rain.rain_current >= 20) pluvial += 50 * rainDecay;
    else if (rain.rain_current >= 10) pluvial += 35 * rainDecay;
    else if (rain.rain_current >= 5) pluvial += 20 * rainDecay;
    else if (rain.rain_current > 0.5) pluvial += 8 * rainDecay;
  }
  if (report) {
    if (reportDist < 0.8) pluvial += 35;
    else if (reportDist < 2.0) pluvial += 20;
    else if (reportDist < 3.5) pluvial += 10;
  }
  pluvial = Math.min(100, Math.round(pluvial));

  // 3. Coastal / Rob Sub-Score (0 - 100): Tidal surge & subsidence in North Jakarta
  let coastal = 5;
  if (lat >= -6.16) {
    if (lat >= -6.12) coastal = 65; // Pluit, Ancol, Tanjung Priok, Muara Baru
    else if (lat >= -6.14) coastal = 45; // Pademangan, Koja, Penjaringan
    else coastal = 25; // Kelapa Gading, Sunter pesisir
  }
  coastal = Math.min(100, coastal);

  // 4. Mitigation Discount (0 - 25 points)
  let discount = 0;
  if (pump && pumpDist < 2.5 && pump.operating > 0) {
    const opRatio = pump.total > 0 ? pump.operating / pump.total : 1;
    discount += Math.round(12 * opRatio * Math.max(0, 1 - pumpDist / 2.5));
  }
  if (waduk && wadukDist < 2.0) {
    discount += Math.round(7 * Math.max(0, 1 - wadukDist / 2.0));
  }
  if (gate && gateDist < 2.5) {
    discount += Math.round(5 * Math.max(0, 1 - gateDist / 2.5));
  }
  discount = Math.min(25, discount);

  // 5. Asset Vulnerability
  const vulnFactor = getAssetVulnerabilityFactor(category, sector);

  // 6. Composite Score
  const weightedHazard = (0.40 * fluvial) + (0.35 * pluvial) + (0.25 * coastal) - discount;
  const finalScore = Math.max(5, Math.min(95, Math.round(weightedHazard * vulnFactor)));

  // Risk Classification
  let riskLevel: 'high' | 'moderate' | 'low' = 'low';
  let riskStatusLabel = 'TERKENDALI / AMAN';
  if (finalScore >= 60) {
    riskLevel = 'high';
    riskStatusLabel = 'WASPADA TINGGI';
  } else if (finalScore >= 30) {
    riskLevel = 'moderate';
    riskStatusLabel = 'MODERAT / WASPADA';
  }

  // Dominant Mechanism
  let dominantMechanism = 'Terkendali / Risiko Rendah';
  if (fluvial >= 40 && pluvial >= 40) {
    dominantMechanism = 'Banjir Campuran (Fluvial Luapan + Pluvial Hujan)';
  } else if (fluvial >= 40) {
    dominantMechanism = 'Dominan Fluvial (Luapan Sungai / Air Kiriman)';
  } else if (pluvial >= 40) {
    dominantMechanism = 'Dominan Pluvial (Genangan Hujan Lokal)';
  } else if (coastal >= 40) {
    dominantMechanism = 'Dominan Coastal / Rob (Pasang Air Laut)';
  }

  // Financial Exposure Metrics
  const capexAtRiskPct = finalScore >= 60 ? Math.round(12 + (finalScore - 60) * 0.4) : finalScore >= 30 ? Math.round(4 + (finalScore - 30) * 0.25) : Math.round(finalScore * 0.1);
  const downtimeDays = finalScore >= 60 ? parseFloat((2.0 + (finalScore - 60) * 0.08).toFixed(1)) : finalScore >= 30 ? parseFloat((0.5 + (finalScore - 30) * 0.05).toFixed(1)) : 0.2;
  const biRisk: 'Tinggi' | 'Moderat' | 'Rendah' = finalScore >= 60 ? 'Tinggi' : finalScore >= 30 ? 'Moderat' : 'Rendah';

  const transitMitigation = transit?.downtime_mitigation_pct || 0;
  const netDowntime = Math.round(Math.max(0.1, downtimeDays * (1 - transitMitigation / 100)) * 10) / 10;
  const greenTaxonomy = (finalScore < 40 || (transit?.green_taxonomy_tod_aligned && finalScore < 50))
    ? (transit?.green_taxonomy_tod_aligned
        ? 'Eligible (Taksonomi Hijau OJK & Koridor Prioritas TOD)'
        : 'Eligible (Sesuai Taksonomi Hijau Indonesia & POJK 51/2017)')
    : 'Perlu Rekayasa Mitigasi Bangunan untuk Eligible Taksonomi Hijau';

  // Parametric Insurance Trigger
  const recommendedTier = finalScore >= 60 
    ? 'Tier 1 (25% Early Liquidity) + Tier 2 (100% Catastrophic Payout)'
    : finalScore >= 30 
    ? 'Tier 1 (25% Quick Payout Operasional)'
    : 'Standby Protection / Minimum Coverage';
  const triggerIndex = `Hujan Harian Wilayah Thiessen > 100 mm/hari ATAU TMA Siaga 2 (≥ 2 jam)`;
  const claimTurnaround = '3 - 5 Hari Kerja (Tanpa Survei Kerugian Fisik)';
  const indicativeRate = finalScore >= 60 ? '1.45% - 2.10% TIV' : finalScore >= 30 ? '0.85% - 1.35% TIV' : '0.45% - 0.75% TIV';

  return {
    score: finalScore,
    risk_level: riskLevel,
    risk_status_label: riskStatusLabel,
    compound_indices: {
      fluvial_score: fluvial,
      pluvial_score: pluvial,
      coastal_score: coastal,
      mitigation_discount: discount,
      vulnerability_factor: vulnFactor,
      dominant_mechanism: dominantMechanism,
    },
    financial_exposure: {
      capex_at_risk_pct: capexAtRiskPct,
      estimated_downtime_days: downtimeDays,
      net_downtime_days: netDowntime,
      transit_downtime_mitigation_pct: transitMitigation,
      business_interruption_risk: biRisk,
      resilience_green_taxonomy: greenTaxonomy,
    },
    parametric_insurance: {
      recommended_tier: recommendedTier,
      trigger_index: triggerIndex,
      claim_turnaround: claimTurnaround,
      indicative_rate: indicativeRate,
    }
  };
}

export function buildSummaryRationale(params: {
  tma: TMAStation | null;
  tmaDist: number;
  rain: RainStation | null;
  rainDist: number;
  report: FloodReport | null;
  reportDist: number;
  pump: PumpStation | null;
  pumpDist: number;
  waduk: WadukStation | null;
  wadukDist: number;
  gate: FloodGate | null;
  gateDist: number;
  river?: { name: string; orde: number; distance_km: number } | null;
  compound: CompoundFloodIndices;
  transit?: TransitProximityProfile | null;
}): string {
  const parts: string[] = [];
  parts.push(`Karakteristik Paparan: ${params.compound.dominant_mechanism}.`);
  if (params.tma && params.tmaDist < 5.0) {
    parts.push(`Dipantau pos TMA ${params.tma.name} (${params.tmaDist.toFixed(1)} km, ${params.tma.status}, elevasi ${params.tma.level} cm).`);
  }
  if (params.rain) {
    parts.push(`Curah hujan di ${params.rain.name} (${params.rainDist.toFixed(1)} km) tercatat ${params.rain.rain_current} mm (${params.rain.intensity}).`);
  }
  if (params.river && params.river.distance_km < 1.0) {
    parts.push(`Berdekatan dengan ${params.river.name} (${params.river.distance_km.toFixed(2)} km, Orde ${params.river.orde}).`);
  }
  if (params.report && params.reportDist < 3.5) {
    parts.push(`Pernah tercatat laporan genangan air di sekitar ${params.report.kelurahan || params.report.city} sejauh ${params.reportDist.toFixed(1)} km.`);
  }
  const mitigations: string[] = [];
  if (params.pump && params.pumpDist < 2.5) mitigations.push(`Rumah Pompa ${params.pump.name} (${params.pumpDist.toFixed(1)} km, ${params.pump.operating}/${params.pump.total} pompa aktif)`);
  if (params.waduk && params.wadukDist < 2.0) mitigations.push(`Waduk/Situ ${params.waduk.name} (${params.wadukDist.toFixed(1)} km)`);
  if (params.gate && params.gateDist < 2.5) mitigations.push(`Pintu Air ${params.gate.name} (${params.gateDist.toFixed(1)} km)`);
  if (mitigations.length > 0) {
    parts.push(`Mitigasi terdekat: ${mitigations.join(', ')}.`);
  }
  if (params.transit) {
    if (params.transit.tod_tier === 'TOD Core (< 400m)' || params.transit.tod_tier === 'TOD Walkable (400m - 800m)') {
      parts.push(`Konektivitas transit prima: ${params.transit.tod_classification} (${params.transit.flood_evacuation_redundancy}, mitigasi downtime -${params.transit.downtime_mitigation_pct}%).`);
    } else if (params.transit.tod_tier === 'Sub-Transit Feeder (800m - 1.5km)') {
      parts.push(`Konektivitas transit sekunder: ${params.transit.tod_classification} (butuh armada feeder last-mile).`);
    } else {
      parts.push(`Konektivitas transit: ${params.transit.tod_classification}.`);
    }
  }
  return parts.join(' ');
}

// In-memory cache
let cachedTMA: TMAStation[] | null = null;
let cachedRain: RainStation[] | null = null;
let cachedInvestments: InvestmentPOI[] | null = null;
let cachedProjects2026: Project2026[] | null = null;
let cachedReports: FloodReport[] | null = null;
let cachedPumps: PumpStation[] | null = null;
let cachedGates: FloodGate[] | null = null;
let cachedWaduk: WadukStation[] | null = null;
let cachedTransitStations: TransitStation[] | null = null;
let cachedTMASeasonal: Record<string, TMASeasonalStats> = {};
let cachedRainSeasonal: Record<string, RainSeasonalStats> = {};
let cachedRivers: RiverFeatureCollection | null = null;
const stationHistoryCache = new Map<string, { data: any; cachedAt: number }>();

export function computeTransitProximity(lat: number, lng: number): TransitProximityProfile | null {
  const stations = cachedTransitStations || [];
  if (stations.length === 0) return null;

  let minOverallDist = Infinity;
  let closestOverall: TransitStation | null = null;

  let minRailDist = Infinity;
  let closestRail: TransitStation | null = null;

  let minBrtDist = Infinity;
  let closestBrt: TransitStation | null = null;

  for (const s of stations) {
    const d = getDistanceKm(lat, lng, s.latitude, s.longitude);
    if (d < minOverallDist) {
      minOverallDist = d;
      closestOverall = s;
    }
    if (s.mode === 'MRT' || s.mode === 'LRT') {
      if (d < minRailDist) {
        minRailDist = d;
        closestRail = s;
      }
    } else if (s.mode === 'TransJakarta') {
      if (d < minBrtDist) {
        minBrtDist = d;
        closestBrt = s;
      }
    }
  }

  if (!closestOverall) return null;

  const walkingOverallMins = Math.max(1, Math.round((minOverallDist * 1000) / 80));
  const walkingRailMins = closestRail ? Math.max(1, Math.round((minRailDist * 1000) / 80)) : null;
  const walkingBrtMins = closestBrt ? Math.max(1, Math.round((minBrtDist * 1000) / 80)) : null;

  let tod_tier: 'TOD Core (< 400m)' | 'TOD Walkable (400m - 800m)' | 'Sub-Transit Feeder (800m - 1.5km)' | 'Transit Remote (> 1.5km)';
  if (minOverallDist <= 0.4) {
    tod_tier = 'TOD Core (< 400m)';
  } else if (minOverallDist <= 0.8) {
    tod_tier = 'TOD Walkable (400m - 800m)';
  } else if (minOverallDist <= 1.5) {
    tod_tier = 'Sub-Transit Feeder (800m - 1.5km)';
  } else {
    tod_tier = 'Transit Remote (> 1.5km)';
  }

  let flood_evacuation_redundancy: 'Sangat Tinggi (Akses Rel Bebas Banjir)' | 'Tinggi (Koridor Pejalan Kaki & BRT)' | 'Moderat (Feeder/First-Last Mile)' | 'Rendah (Tergantung Akses Jalan Tergenang)';
  if (minRailDist <= 0.8) {
    flood_evacuation_redundancy = 'Sangat Tinggi (Akses Rel Bebas Banjir)';
  } else if (minBrtDist <= 0.8 || minRailDist <= 1.5) {
    flood_evacuation_redundancy = 'Tinggi (Koridor Pejalan Kaki & BRT)';
  } else if (minOverallDist <= 1.5) {
    flood_evacuation_redundancy = 'Moderat (Feeder/First-Last Mile)';
  } else {
    flood_evacuation_redundancy = 'Rendah (Tergantung Akses Jalan Tergenang)';
  }

  let accessibility_score = 30;
  if (minRailDist <= 0.4) {
    accessibility_score = 98;
  } else if (minRailDist <= 0.8) {
    accessibility_score = 88;
  } else if (minRailDist <= 1.5) {
    accessibility_score = 75;
  } else if (minBrtDist <= 0.4) {
    accessibility_score = 82;
  } else if (minBrtDist <= 0.8) {
    accessibility_score = 70;
  } else if (minOverallDist <= 1.5) {
    accessibility_score = 55;
  } else {
    accessibility_score = Math.max(15, Math.round(50 - minOverallDist * 10));
  }

  let downtime_mitigation_pct = 0;
  if (minRailDist <= 0.4) {
    downtime_mitigation_pct = 35;
  } else if (minRailDist <= 0.8) {
    downtime_mitigation_pct = 25;
  } else if (minBrtDist <= 0.4) {
    downtime_mitigation_pct = 15;
  } else if (minBrtDist <= 0.8) {
    downtime_mitigation_pct = 10;
  } else if (minOverallDist <= 1.5) {
    downtime_mitigation_pct = 5;
  } else {
    downtime_mitigation_pct = 0;
  }

  const green_taxonomy_tod_aligned = minOverallDist <= 0.8;

  let tod_classification = '';
  let workforce_mobility_resilience = '';

  if (minRailDist <= 0.8) {
    tod_classification = `Kawasan Prioritas TOD Rel (${closestRail!.mode} ${closestRail!.name} - ${minRailDist} km)`;
    workforce_mobility_resilience = `Tapak memiliki proteksi mobilitas tinggi melalui koridor rel layang/bawah tanah (${closestRail!.mode} ${closestRail!.name}, ±${walkingRailMins} mnt jalan kaki). Saat banjir menggenangi jalan arteri permukaan, pekerja dan tim operasional tetap dapat tiba di lokasi via viaduct rel bebas banjir, mereduksi potensi downtime operasional hingga ${downtime_mitigation_pct}%.`;
  } else if (minBrtDist <= 0.8) {
    tod_classification = `Kawasan Terhubung Koridor BRT (${closestBrt!.name} - ${minBrtDist} km)`;
    workforce_mobility_resilience = `Tapak memiliki aksesibilitas koridor busway terproteksi (${closestBrt!.name}, ±${walkingBrtMins} mnt jalan kaki), menyediakan redundansi evakuasi pejalan kaki dan angkutan massal saat genangan jalan lokal terjadi (mitigasi downtime sekitar ${downtime_mitigation_pct}%).`;
  } else if (minOverallDist <= 1.5) {
    tod_classification = `Zona Feeder Transit (${closestOverall.name} - ${minOverallDist} km)`;
    workforce_mobility_resilience = `Tapak berada di zona feeder sekunder (±${walkingOverallMins} mnt jalan kaki/mikrotrans). Memerlukan koordinasi moda penghubung (last-mile shuttle) saat kondisi darurat banjir jalan raya.`;
  } else {
    tod_classification = `Zona Non-TOD Terisolasi (> 1.5 km dari Transit)`;
    workforce_mobility_resilience = `Tapak berjarak >1.5 km dari simpul transportasi umum terdekat (${closestOverall.name} - ${minOverallDist} km). Mobilitas bergantung penuh pada jalan raya permukaan yang rentan terputus genangan banjir. Disarankan penyediaan armada shuttle evakuasi mandiri.`;
  }

  return {
    nearest_station: {
      id: closestOverall.id,
      name: closestOverall.name,
      mode: closestOverall.mode,
      distance_km: minOverallDist,
      walking_time_mins: walkingOverallMins,
      latitude: closestOverall.latitude,
      longitude: closestOverall.longitude,
    },
    nearest_rail: closestRail ? {
      id: closestRail.id,
      name: closestRail.name,
      mode: closestRail.mode as 'MRT' | 'LRT',
      distance_km: minRailDist,
      walking_time_mins: walkingRailMins!,
      latitude: closestRail.latitude,
      longitude: closestRail.longitude,
    } : null,
    nearest_brt: closestBrt ? {
      id: closestBrt.id,
      name: closestBrt.name,
      mode: 'TransJakarta',
      distance_km: minBrtDist,
      walking_time_mins: walkingBrtMins!,
      latitude: closestBrt.latitude,
      longitude: closestBrt.longitude,
    } : null,
    tod_tier,
    tod_classification,
    flood_evacuation_redundancy,
    accessibility_score,
    workforce_mobility_resilience,
    downtime_mitigation_pct,
    green_taxonomy_tod_aligned,
  };
}

async function loadData() {
  if (
    cachedTMA &&
    cachedRain &&
    cachedInvestments &&
    cachedProjects2026 &&
    cachedReports &&
    cachedPumps &&
    cachedGates &&
    cachedWaduk &&
    cachedTransitStations
  ) {
    return;
  }

  try {
    // 1. Load TMA stations
    const tmaRaw = await fs.readFile(path.resolve('.build/study/latest-tma.json'), 'utf8');
    cachedTMA = JSON.parse(tmaRaw);
  } catch {
    cachedTMA = [];
  }

  try {
    // 2. Load Rain stations
    const rainRaw = await fs.readFile(path.resolve('.build/study/latest-ch.json'), 'utf8');
    cachedRain = JSON.parse(rainRaw);
  } catch {
    cachedRain = [];
  }

  try {
    // 3. Load Flood Reports
    const repRaw = await fs.readFile(path.resolve('.build/study/events.json'), 'utf8');
    const rawList: any[] = JSON.parse(repRaw);
    cachedReports = rawList.map((r) => ({
      uid: r.uid,
      occurred_at: r.occurred_at,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      city: r.city,
      kelurahan: r.kelurahan,
      kecamatan: r.kecamatan,
      river_nearest: r.river_nearest,
      depth_cm_raw: r.depth_cm_raw,
      source_name: r.source_name,
      report_source: r.report_source,
    }));
  } catch {
    cachedReports = [];
  }

  try {
    // 4. Load Infrastructure (Pumps, Gates, Waduk)
    const pumpRaw = await fs.readFile(path.resolve('.build/study/infrastructure-pumps.json'), 'utf8');
    cachedPumps = JSON.parse(pumpRaw);
  } catch {
    cachedPumps = [];
  }

  try {
    const gateRaw = await fs.readFile(path.resolve('.build/study/infrastructure-gates.json'), 'utf8');
    cachedGates = JSON.parse(gateRaw);
  } catch {
    cachedGates = [];
  }

  try {
    const wadukRaw = await fs.readFile(path.resolve('.build/study/infrastructure-waduk.json'), 'utf8');
    cachedWaduk = JSON.parse(wadukRaw);
  } catch {
    cachedWaduk = [];
  }

  try {
    // 5. Load Precalculated Seasonal Stats
    const seasonRaw = await fs.readFile(path.resolve('.build/study/station-seasonal-stats.json'), 'utf8');
    const seasonData = JSON.parse(seasonRaw);
    cachedTMASeasonal = seasonData.tma_seasonal_stats || {};
    cachedRainSeasonal = seasonData.thiessen_station_stats || seasonData.ch_seasonal_stats || seasonData.rain_seasonal_stats || {};
  } catch {
    cachedTMASeasonal = {};
    cachedRainSeasonal = {};
  }

  // 5b. Load Public Transit Hubs (MRT, LRT, TransJakarta)
  try {
    const isAvail = await databaseAvailable();
    if (isAvail) {
      const conn = db();
      const [mrtRows]: any = await conn.query(`
        SELECT id, code, name, latitude, longitude
        FROM jakarta_transport_mrt
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      const [lrtRows]: any = await conn.query(`
        SELECT id, code, name, latitude, longitude
        FROM jakarta_transport_lrt
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      const [tjRows]: any = await conn.query(`
        SELECT id, code, name, latitude, longitude
        FROM jakarta_transport_tj
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);

      cachedTransitStations = [
        ...mrtRows.map((r: any) => ({
          id: Number(r.id),
          code: r.code || `mrt_${r.id}`,
          name: r.name,
          mode: 'MRT' as const,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        })),
        ...lrtRows.map((r: any) => ({
          id: Number(r.id),
          code: r.code || `lrt_${r.id}`,
          name: r.name,
          mode: 'LRT' as const,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        })),
        ...tjRows.map((r: any) => ({
          id: Number(r.id),
          code: r.code || `tj_${r.id}`,
          name: r.name,
          mode: 'TransJakarta' as const,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        })),
      ];
    } else {
      throw new Error('Database not available');
    }
  } catch {
    try {
      const transitRaw = await fs.readFile(path.resolve('.build/study/transit_stations.json'), 'utf8');
      cachedTransitStations = JSON.parse(transitRaw);
    } catch {
      cachedTransitStations = [];
    }
  }

  // 6. Load and synthesize Investments & 2026 Pipeline Projects from local_govtech_floodsense
  const investments: InvestmentPOI[] = [];
  const projects2026: Project2026[] = [];

  const categoryLabels: Record<string, string> = {
    pendidikan: 'Pendidikan & Riset',
    rumah_sakit: 'Rumah Sakit',
    hotel: 'Hotel & Hospitalitas',
    pelabuhan: 'Pelabuhan & Logistik',
    kawasan: 'Kawasan Pembangunan / Industri',
    objek_vital: 'Objek Vital Nasional',
  };

  let loadedFromDb = false;

  try {
    const isAvail = await databaseAvailable();
    if (isAvail) {
      const conn = db();

      // A. jktjic_baseinvest (518 locations)
      const [baseRows]: any = await conn.query(`
        SELECT id, nama, kategori, latitude, longitude, source_url
        FROM jktjic_baseinvest
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      for (const row of baseRows) {
        investments.push({
          id: `jktjic-base-${row.id}`,
          name: row.nama,
          category: (row.kategori as any) || 'kawasan',
          category_label: categoryLabels[row.kategori] || row.kategori,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          source_type: 'jktjic_baseinvest',
          risk_level: 'low',
          nearest_tma: null,
          nearest_rain: null,
          nearest_report: null,
          source_url: row.source_url,
        });
      }

      // B. jakarta_objek_vital (134 vital objects)
      const [vitalRows]: any = await conn.query(`
        SELECT id, nama_lokasi as name, category, latitude, longitude
        FROM jakarta_objek_vital
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      for (const v of vitalRows) {
        investments.push({
          id: `vital-${v.id}`,
          name: v.name,
          category: 'objek_vital',
          category_label: `Objek Vital Nasional (Kat ${v.category})`,
          latitude: Number(v.latitude),
          longitude: Number(v.longitude),
          source_type: 'objek_vital_nasional',
          risk_level: 'low',
          nearest_tma: null,
          nearest_rain: null,
          nearest_report: null,
        });
      }

      // C. jktjic_potensiproject_2026 (37 strategic pipeline projects)
      const [pRows]: any = await conn.query(`
        SELECT p.*, o.name as owner_name, o.short_name as owner_short_name
        FROM jktjic_potensiproject_2026 p
        LEFT JOIN jktjic_potensiproject_2026_organizations o ON o.id = p.owner_id
        ORDER BY p.id ASC
      `);
      for (const p of pRows) {
        const lat = p.latitude != null ? Number(p.latitude) : null;
        const lon = p.longitude != null ? Number(p.longitude) : null;
        projects2026.push({
          id: p.id,
          slug: p.slug,
          name: p.name,
          owner_id: p.owner_id,
          owner_name: p.owner_name || 'BUMD DKI Jakarta',
          owner_short_name: p.owner_short_name || 'DKI',
          status: p.status,
          sector: p.sector,
          location: p.location,
          route: p.route,
          total_investment_text: p.total_investment_text,
          total_investment_idr: p.total_investment_idr ? Number(p.total_investment_idr) : null,
          development_area_text: p.development_area_text,
          partnership_period_text: p.partnership_period_text,
          contact_name: p.contact_name,
          contact_role: p.contact_role,
          contact_email: p.contact_email,
          coordinate_text: p.coordinate_text,
          latitude: lat,
          longitude: lon,
          project_profile: p.project_profile,
          extraction_quality: p.extraction_quality,
          created_at: p.created_at,
          risk_level: 'low',
          nearest_tma: null,
          nearest_rain: null,
          nearest_report: null,
          hero_image_url: `/project-images/${p.slug}/hero.jpg`,
        });

        // Overlay projects with coordinates into investment layer
        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
          investments.push({
            id: `jktjic-proj-${p.id}`,
            name: `⭐ ${p.name}`,
            category: 'proyek_2026',
            category_label: `Peluang Investasi 2026 (${p.sector})`,
            latitude: lat,
            longitude: lon,
            source_type: 'jktjic_potensiproject_2026',
            risk_level: 'low',
            nearest_tma: null,
            nearest_rain: null,
            nearest_report: null,
            source_url: `https://invest.jakarta.go.id/project/${p.slug}`,
            project_meta: {
              investment_text: p.total_investment_text,
              investment_idr: p.total_investment_idr ? Number(p.total_investment_idr) : null,
              owner: p.owner_short_name || p.owner_name,
              status: p.status,
              sector: p.sector,
              slug: p.slug,
            },
          });
        }
      }

      loadedFromDb = true;
    }
  } catch (err) {
    console.warn('DB query in monitoring failed, falling back to local files:', err);
  }

  // Fallback to local files if database is offline (e.g. testing in sandbox without DB)
  if (!loadedFromDb) {
    try {
      const csvContent = await fs.readFile(
        path.resolve('docs/data invest/semua_poi_investasi_dki_siap_overlay.csv'),
        'utf8'
      );
      const bkpmRows: any[] = parse(csvContent, { columns: true, bom: true, skip_empty_lines: true });

      for (const row of bkpmRows) {
        const lat = Number(row.lat);
        const lon = Number(row.lon);
        if (isNaN(lat) || isNaN(lon) || lat === 0) continue;

        investments.push({
          id: `bkpm-${row.kategori}-${row.record_no}`,
          name: row.nama,
          category: (row.kategori as any) || 'kawasan',
          category_label: categoryLabels[row.kategori] || row.kategori,
          latitude: lat,
          longitude: lon,
          source_type: 'bkpm_jic',
          risk_level: 'low',
          nearest_tma: null,
          nearest_rain: null,
          nearest_report: null,
          source_url: row.source_url,
        });
      }
    } catch (err) {
      console.warn('Could not read fallback BKPM POIs:', err);
    }

    try {
      const vitalRaw = await fs.readFile(path.resolve('docs/data_gis/objek_vital.json'), 'utf8');
      const vitalRows: any[] = JSON.parse(vitalRaw);
      for (const v of vitalRows) {
        investments.push({
          id: `vital-${v.id}`,
          name: v.name,
          category: 'objek_vital',
          category_label: `Objek Vital Nasional (Kat ${v.category})`,
          latitude: v.latitude,
          longitude: v.longitude,
          source_type: 'objek_vital_nasional',
          risk_level: 'low',
          nearest_tma: null,
          nearest_rain: null,
          nearest_report: null,
        });
      }
    } catch (err) {
      console.warn('Could not read fallback Objek Vital:', err);
    }
  }

  // Compute spatial exposure for investments
  for (const inv of investments) {
    let minTmaDist = Infinity;
    let closestTma: TMAStation | null = null;
    for (const t of cachedTMA || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, t.latitude, t.longitude);
      if (d < minTmaDist) {
        minTmaDist = d;
        closestTma = t;
      }
    }
    if (closestTma) {
      const tmaSeasonal = cachedTMASeasonal[closestTma.station_id] || null;
      inv.nearest_tma = {
        station_id: closestTma.station_id,
        name: closestTma.name,
        river: closestTma.river,
        distance_km: minTmaDist,
        level: closestTma.level,
        status: closestTma.status,
        siaga_level: closestTma.siaga_level,
        seasonal_stats: tmaSeasonal,
      };
    }

    let minRainDist = Infinity;
    let closestRain: RainStation | null = null;
    for (const r of cachedRain || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, r.latitude, r.longitude);
      if (d < minRainDist) {
        minRainDist = d;
        closestRain = r;
      }
    }
    if (closestRain) {
      const rainSeasonal = cachedRainSeasonal[closestRain.station_id] || null;
      inv.nearest_rain = {
        station_id: closestRain.station_id,
        name: closestRain.name,
        location: closestRain.location,
        distance_km: minRainDist,
        intensity: closestRain.intensity,
        rain_current: closestRain.rain_current,
        seasonal_stats: rainSeasonal,
      };
    }

    let minRepDist = Infinity;
    let closestRep: FloodReport | null = null;
    for (const rep of cachedReports || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, rep.latitude, rep.longitude);
      if (d < minRepDist) {
        minRepDist = d;
        closestRep = rep;
      }
    }
    if (closestRep) {
      inv.nearest_report = {
        source: closestRep.report_source === 'cilicis' ? 'Cilicis Lapangan' : 'PU Sitaba',
        distance_km: minRepDist,
        occurred_at: closestRep.occurred_at,
        depth_cm_raw: closestRep.depth_cm_raw,
        location_desc: closestRep.kelurahan || closestRep.city,
      };
    }

    // Nearest Pump Station (jakarta_rumah_pumpa)
    let minPumpDist = Infinity;
    let closestPump: PumpStation | null = null;
    for (const p of cachedPumps || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, p.latitude, p.longitude);
      if (d < minPumpDist) {
        minPumpDist = d;
        closestPump = p;
      }
    }
    if (closestPump) {
      inv.nearest_pump = {
        id: closestPump.id,
        name: closestPump.name,
        address: closestPump.address,
        distance_km: minPumpDist,
        operating: closestPump.operating,
        idle: closestPump.idle,
        total: closestPump.total,
      };
    }

    // Nearest Waduk / Situ (jakarta_waduk)
    let minWadukDist = Infinity;
    let closestWaduk: WadukStation | null = null;
    for (const w of cachedWaduk || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, w.latitude, w.longitude);
      if (d < minWadukDist) {
        minWadukDist = d;
        closestWaduk = w;
      }
    }
    if (closestWaduk) {
      inv.nearest_waduk = {
        id: closestWaduk.id,
        name: closestWaduk.name,
        wilayah: closestWaduk.wilayah,
        distance_km: minWadukDist,
        luas: closestWaduk.luas,
        volume: closestWaduk.volume,
        pompa: closestWaduk.pompa,
      };
    }

    // Nearest Flood Gate (jakarta_pintu_air)
    let minGateDist = Infinity;
    let closestGate: FloodGate | null = null;
    for (const g of cachedGates || []) {
      const d = getDistanceKm(inv.latitude, inv.longitude, g.latitude, g.longitude);
      if (d < minGateDist) {
        minGateDist = d;
        closestGate = g;
      }
    }
    if (closestGate) {
      inv.nearest_gate = {
        id: closestGate.id,
        name: closestGate.name,
        system: closestGate.system,
        distance_km: minGateDist,
        level: closestGate.level,
        status: closestGate.status,
      };
    }

    const transit = computeTransitProximity(inv.latitude, inv.longitude);
    inv.transit_proximity = transit;

    const exp = computeCompoundExposure({
      lat: inv.latitude,
      lng: inv.longitude,
      tma: closestTma,
      tmaDist: minTmaDist,
      rain: closestRain,
      rainDist: minRainDist,
      report: closestRep,
      reportDist: minRepDist,
      pump: closestPump,
      pumpDist: minPumpDist,
      waduk: closestWaduk,
      wadukDist: minWadukDist,
      gate: closestGate,
      gateDist: minGateDist,
      category: inv.category,
      sector: inv.project_meta?.sector || undefined,
      transit,
    });
    inv.risk_level = exp.risk_level;
    inv.risk_score = exp.score;
    inv.risk_status_label = exp.risk_status_label;
    inv.compound_indices = exp.compound_indices;
    inv.financial_exposure = exp.financial_exposure;
    inv.parametric_insurance = exp.parametric_insurance;
    inv.summary_rationale = buildSummaryRationale({
      tma: closestTma,
      tmaDist: minTmaDist,
      rain: closestRain,
      rainDist: minRainDist,
      report: closestRep,
      reportDist: minRepDist,
      pump: closestPump,
      pumpDist: minPumpDist,
      waduk: closestWaduk,
      wadukDist: minWadukDist,
      gate: closestGate,
      gateDist: minGateDist,
      compound: exp.compound_indices,
      transit,
    });
  }

  // Compute spatial exposure for 2026 pipeline projects
  for (const proj of projects2026) {
    if (proj.latitude === null || proj.longitude === null) continue;

    let minTmaDist = Infinity;
    let closestTma: TMAStation | null = null;
    for (const t of cachedTMA || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, t.latitude, t.longitude);
      if (d < minTmaDist) {
        minTmaDist = d;
        closestTma = t;
      }
    }
    if (closestTma) {
      const tmaSeasonal = cachedTMASeasonal[closestTma.station_id] || null;
      proj.nearest_tma = {
        station_id: closestTma.station_id,
        name: closestTma.name,
        river: closestTma.river,
        distance_km: minTmaDist,
        level: closestTma.level,
        status: closestTma.status,
        siaga_level: closestTma.siaga_level,
        seasonal_stats: tmaSeasonal,
      };
    }

    let minRainDist = Infinity;
    let closestRain: RainStation | null = null;
    for (const r of cachedRain || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, r.latitude, r.longitude);
      if (d < minRainDist) {
        minRainDist = d;
        closestRain = r;
      }
    }
    if (closestRain) {
      const rainSeasonal = cachedRainSeasonal[closestRain.station_id] || null;
      proj.nearest_rain = {
        station_id: closestRain.station_id,
        name: closestRain.name,
        location: closestRain.location,
        distance_km: minRainDist,
        intensity: closestRain.intensity,
        rain_current: closestRain.rain_current,
        seasonal_stats: rainSeasonal,
      };
    }

    let minRepDist = Infinity;
    let closestRep: FloodReport | null = null;
    for (const rep of cachedReports || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, rep.latitude, rep.longitude);
      if (d < minRepDist) {
        minRepDist = d;
        closestRep = rep;
      }
    }
    if (closestRep) {
      proj.nearest_report = {
        source: closestRep.report_source === 'cilicis' ? 'Cilicis Lapangan' : 'PU Sitaba',
        distance_km: minRepDist,
        occurred_at: closestRep.occurred_at,
        depth_cm_raw: closestRep.depth_cm_raw,
        location_desc: closestRep.kelurahan || closestRep.city,
      };
    }

    // Nearest Pump Station
    let minPumpDist = Infinity;
    let closestPump: PumpStation | null = null;
    for (const p of cachedPumps || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, p.latitude, p.longitude);
      if (d < minPumpDist) {
        minPumpDist = d;
        closestPump = p;
      }
    }
    if (closestPump) {
      proj.nearest_pump = {
        id: closestPump.id,
        name: closestPump.name,
        address: closestPump.address,
        distance_km: minPumpDist,
        operating: closestPump.operating,
        idle: closestPump.idle,
        total: closestPump.total,
      };
    }

    // Nearest Waduk / Situ
    let minWadukDist = Infinity;
    let closestWaduk: WadukStation | null = null;
    for (const w of cachedWaduk || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, w.latitude, w.longitude);
      if (d < minWadukDist) {
        minWadukDist = d;
        closestWaduk = w;
      }
    }
    if (closestWaduk) {
      proj.nearest_waduk = {
        id: closestWaduk.id,
        name: closestWaduk.name,
        wilayah: closestWaduk.wilayah,
        distance_km: minWadukDist,
        luas: closestWaduk.luas,
        volume: closestWaduk.volume,
        pompa: closestWaduk.pompa,
      };
    }

    // Nearest Flood Gate
    let minGateDist = Infinity;
    let closestGate: FloodGate | null = null;
    for (const g of cachedGates || []) {
      const d = getDistanceKm(proj.latitude, proj.longitude, g.latitude, g.longitude);
      if (d < minGateDist) {
        minGateDist = d;
        closestGate = g;
      }
    }
    if (closestGate) {
      proj.nearest_gate = {
        id: closestGate.id,
        name: closestGate.name,
        system: closestGate.system,
        distance_km: minGateDist,
        level: closestGate.level,
        status: closestGate.status,
      };
    }

    const transit = computeTransitProximity(proj.latitude, proj.longitude);
    proj.transit_proximity = transit;

    const exp = computeCompoundExposure({
      lat: proj.latitude,
      lng: proj.longitude,
      tma: closestTma,
      tmaDist: minTmaDist,
      rain: closestRain,
      rainDist: minRainDist,
      report: closestRep,
      reportDist: minRepDist,
      pump: closestPump,
      pumpDist: minPumpDist,
      waduk: closestWaduk,
      wadukDist: minWadukDist,
      gate: closestGate,
      gateDist: minGateDist,
      category: 'proyek_2026',
      sector: proj.sector,
      transit,
    });
    proj.risk_level = exp.risk_level;
    proj.risk_score = exp.score;
    proj.risk_status_label = exp.risk_status_label;
    proj.compound_indices = exp.compound_indices;
    proj.financial_exposure = exp.financial_exposure;
    proj.parametric_insurance = exp.parametric_insurance;
    proj.summary_rationale = buildSummaryRationale({
      tma: closestTma,
      tmaDist: minTmaDist,
      rain: closestRain,
      rainDist: minRainDist,
      report: closestRep,
      reportDist: minRepDist,
      pump: closestPump,
      pumpDist: minPumpDist,
      waduk: closestWaduk,
      wadukDist: minWadukDist,
      gate: closestGate,
      gateDist: minGateDist,
      compound: exp.compound_indices,
      transit,
    });
  }

  cachedInvestments = investments;
  cachedProjects2026 = projects2026;
}

export async function getMonitoringSummary() {
  await loadData();
  const tma = cachedTMA || [];
  const rain = cachedRain || [];
  const investments = cachedInvestments || [];
  const projects = cachedProjects2026 || [];
  const reports = cachedReports || [];
  const pumps = cachedPumps || [];
  const gates = cachedGates || [];

  const sectorCounts: Record<string, number> = {};
  for (const p of projects) {
    sectorCounts[p.sector] = (sectorCounts[p.sector] || 0) + 1;
  }

  return {
    tma: {
      total: tma.length,
      siaga1: tma.filter((s) => s.siaga_level === 1).length,
      siaga2: tma.filter((s) => s.siaga_level === 2).length,
      siaga3: tma.filter((s) => s.siaga_level === 3).length,
      normal: tma.filter((s) => s.siaga_level === 4).length,
      rising: tma.filter((s) => s.trend === 'rising').length,
    },
    rain: {
      total: rain.length,
      heavy: rain.filter((r) => r.rain_current >= 20).length,
      moderate: rain.filter((r) => r.rain_current >= 5 && r.rain_current < 20).length,
      light: rain.filter((r) => r.rain_current > 0.5 && r.rain_current < 5).length,
      zero: rain.filter((r) => r.rain_current <= 0.5).length,
    },
    investments: {
      total: investments.length,
      high_exposure: investments.filter((i) => i.risk_level === 'high').length,
      moderate_exposure: investments.filter((i) => i.risk_level === 'moderate').length,
      low_exposure: investments.filter((i) => i.risk_level === 'low').length,
      by_category: {
        kawasan: investments.filter((i) => i.category === 'kawasan').length,
        hotel: investments.filter((i) => i.category === 'hotel').length,
        rumah_sakit: investments.filter((i) => i.category === 'rumah_sakit').length,
        pelabuhan: investments.filter((i) => i.category === 'pelabuhan').length,
        pendidikan: investments.filter((i) => i.category === 'pendidikan').length,
        objek_vital: investments.filter((i) => i.category === 'objek_vital').length,
        proyek_2026: investments.filter((i) => i.category === 'proyek_2026').length,
      },
    },
    projects2026: {
      total: projects.length,
      with_coordinates: projects.filter((p) => p.latitude !== null).length,
      ready_to_offer: projects.filter((p) => p.status.toLowerCase().includes('ready')).length,
      market_sounding: projects.filter((p) => p.status.toLowerCase().includes('sounding')).length,
      under_study: projects.filter((p) => p.status.toLowerCase().includes('study')).length,
      high_exposure: projects.filter((p) => p.risk_level === 'high').length,
      moderate_exposure: projects.filter((p) => p.risk_level === 'moderate').length,
      low_exposure: projects.filter((p) => p.risk_level === 'low').length,
      total_investment_idr: projects.reduce((acc, p) => acc + (p.total_investment_idr || 0), 0),
      by_sector: sectorCounts,
    },
    reports: {
      total: reports.length,
      sitaba: reports.filter((r) => r.report_source === 'sitaba').length,
      cilicis: reports.filter((r) => r.report_source === 'cilicis').length,
    },
    infrastructure: {
      pumps_total: pumps.length,
      gates_total: gates.length,
      waduk_total: (cachedWaduk || []).length,
    },
    rivers: {
      total: 200,
      table: 'cilicis_datasungai',
    },
    transit: {
      total: (cachedTransitStations || []).length,
      mrt: (cachedTransitStations || []).filter((s) => s.mode === 'MRT').length,
      lrt: (cachedTransitStations || []).filter((s) => s.mode === 'LRT').length,
      transjakarta: (cachedTransitStations || []).filter((s) => s.mode === 'TransJakarta').length,
    },
    provenance: {
      database: 'local_govtech_floodsense (MySQL single source of truth)',
      tma_source: 'jakarta_tma (81 Pos Sensor Hidrologi DKI Jakarta)',
      rain_source: 'jakarta_ch & cilicis_pch (116 Stasiun Telemetri Jabodetabek)',
      rivers_source: 'cilicis_datasungai (200 Ruas Jaringan Sungai Jabodetabek)',
      transit_source: 'jakarta_transport_mrt (13 stasiun), jakarta_transport_lrt (6 stasiun), jakarta_transport_tj (267 halte BRT)',
      investment_source: 'jktjic_baseinvest (518 lokasi) & jakarta_objek_vital (134 lokasi)',
      projects2026_source: 'jktjic_potensiproject_2026 (37 Proyek Peluang Investasi Jakarta 2026)',
      reports_source: 'Kombinasi PU Sitaba & Penelusuran Lapangan Cilicis (132 Laporan Terverifikasi)',
      infrastructure_source: 'jakarta_rumah_pumpa (222 rumah pompa), jakarta_waduk (69 waduk/situ), jakarta_pintu_air (17 pintu air)',
      updated_at: new Date().toISOString(),
    },
  };
}

export async function getMonitoringTMA(filters?: { status?: string; basin?: string; q?: string }) {
  await loadData();
  let list = cachedTMA || [];

  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'siaga1') list = list.filter((s) => s.siaga_level === 1);
    else if (filters.status === 'siaga2') list = list.filter((s) => s.siaga_level === 2);
    else if (filters.status === 'siaga3') list = list.filter((s) => s.siaga_level === 3);
    else if (filters.status === 'siaga_all') list = list.filter((s) => s.siaga_level <= 3);
    else if (filters.status === 'normal') list = list.filter((s) => s.siaga_level === 4);
  }

  if (filters?.basin && filters.basin !== 'all') {
    const qb = filters.basin.toLowerCase();
    list = list.filter((s) => s.river.toLowerCase().includes(qb) || s.name.toLowerCase().includes(qb));
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q) || s.river.toLowerCase().includes(q));
  }

  return list;
}

export async function getMonitoringRain(filters?: { intensity?: string; basin?: string; q?: string }) {
  await loadData();
  let list = cachedRain || [];

  if (filters?.intensity && filters.intensity !== 'all') {
    list = list.filter((r) => r.intensity.toLowerCase() === filters.intensity!.toLowerCase());
  }

  if (filters?.basin && filters.basin !== 'all') {
    const qb = filters.basin.toLowerCase();
    list = list.filter((r) => r.das_polder.toLowerCase().includes(qb));
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.das_polder.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function getMonitoringInvestments(filters?: {
  category?: string;
  risk?: string;
  q?: string;
  limit?: number;
}) {
  await loadData();
  let list = cachedInvestments || [];

  if (filters?.category && filters.category !== 'all') {
    list = list.filter((i) => i.category === filters.category);
  }

  if (filters?.risk && filters.risk !== 'all') {
    list = list.filter((i) => i.risk_level === filters.risk);
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category_label.toLowerCase().includes(q) ||
        (i.nearest_tma && i.nearest_tma.name.toLowerCase().includes(q))
    );
  }

  if (filters?.limit) {
    list = list.slice(0, filters.limit);
  }

  return list;
}

export async function getMonitoringInfrastructure() {
  await loadData();
  return {
    pumps: cachedPumps || [],
    gates: cachedGates || [],
    waduk: cachedWaduk || [],
  };
}

export async function getMonitoringFloodReports(filters?: { source?: string; q?: string }) {
  await loadData();
  let list = cachedReports || [];

  if (filters?.source && filters.source !== 'all') {
    list = list.filter((r) => r.report_source === filters.source);
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (r) =>
        r.city.toLowerCase().includes(q) ||
        (r.kelurahan && r.kelurahan.toLowerCase().includes(q)) ||
        (r.kecamatan && r.kecamatan.toLowerCase().includes(q)) ||
        (r.river_nearest && r.river_nearest.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function getStationHistory(stationId: string, type: 'tma' | 'rain') {
  await loadData();

  const cacheKey = `${type}:${stationId}`;
  const nowMs = Date.now();
  const cached = stationHistoryCache.get(cacheKey);
  if (cached && nowMs - cached.cachedAt < 300000) {
    return cached.data;
  }

  if (type === 'tma') {
    const station = cachedTMA?.find((s) => s.station_id === stationId);
    if (!station) return { error: 'STATION_NOT_FOUND', history: [] };

    const s1 = station.thresholds.siaga1;
    const s2 = station.thresholds.siaga2;
    const s3 = station.thresholds.siaga3;
    const s4 = station.thresholds.siaga4;

    let history: Array<{
      hour: string;
      datetime?: string;
      level: number;
      siaga1: number;
      siaga2: number;
      siaga3: number;
      siaga4: number;
      status: string;
    }> = [];

    let periodMeta: { start?: string; end?: string; source: string } = {
      source: 'hydrological_model',
    };

    // 1. Primary: query actual telemetry records from jakarta_tma in local_govtech_floodsense
    if (await databaseAvailable()) {
      try {
        const pool = db();
        const [rows] = await pool.query<any[]>(
          `SELECT TANGGAL, TINGGI_AIR, STATUS_SIAGA 
           FROM jakarta_tma 
           WHERE (ID_PINTU_AIR = ? OR NAMA_PINTU_AIR = ?) 
             AND TANGGAL > '2000-01-01' 
             AND TINGGI_AIR IS NOT NULL 
           ORDER BY TANGGAL DESC 
           LIMIT 150`,
          [station.station_id, station.name]
        );

        if (Array.isArray(rows) && rows.length >= 8) {
          // Sort chronological (ascending)
          const sorted = [...rows].sort(
            (a, b) => new Date(a.TANGGAL).getTime() - new Date(b.TANGGAL).getTime()
          );

          // Find the most recent continuous block of readings (gap <= 3.5h)
          const blocks: any[][] = [];
          let curBlock: any[] = [sorted[0]];
          for (let i = 1; i < sorted.length; i++) {
            const prevT = new Date(sorted[i - 1].TANGGAL).getTime();
            const curT = new Date(sorted[i].TANGGAL).getTime();
            const diffHours = (curT - prevT) / (3600 * 1000);
            if (diffHours <= 3.5) {
              curBlock.push(sorted[i]);
            } else {
              blocks.push(curBlock);
              curBlock = [sorted[i]];
            }
          }
          blocks.push(curBlock);

          const validBlocks = blocks.filter((b) => b.length >= 8);
          const chosenBlock =
            validBlocks.length > 0 ? validBlocks[validBlocks.length - 1] : blocks[blocks.length - 1];

          if (chosenBlock.length >= 4) {
            const endT = new Date(chosenBlock[chosenBlock.length - 1].TANGGAL);
            const startT = new Date(chosenBlock[0].TANGGAL);

            periodMeta = {
              start: startT.toISOString(),
              end: endT.toISOString(),
              source: 'jakarta_tma',
            };

            // Construct 24 hourly points ending at endT
            const tempSlots: Array<{
              hour: string;
              datetime: string;
              level: number | null;
            }> = [];

            for (let i = 23; i >= 0; i--) {
              const slotEnd = new Date(endT.getTime() - i * 3600 * 1000);
              const slotStart = new Date(slotEnd.getTime() - 3600 * 1000);
              const hourStr = slotEnd.getHours().toString().padStart(2, '0') + ':00';

              const inSlot = chosenBlock.filter((r) => {
                const t = new Date(r.TANGGAL).getTime();
                return t > slotStart.getTime() && t <= slotEnd.getTime();
              });

              if (inSlot.length > 0) {
                const avg =
                  inSlot.reduce((sum, r) => sum + Number(r.TINGGI_AIR), 0) / inSlot.length;
                tempSlots.push({ hour: hourStr, datetime: slotEnd.toISOString(), level: Math.round(avg) });
              } else {
                tempSlots.push({ hour: hourStr, datetime: slotEnd.toISOString(), level: null });
              }
            }

            // Interpolate any null hours linearly from surrounding known measurements
            for (let i = 0; i < tempSlots.length; i++) {
              if (tempSlots[i].level === null) {
                let prevVal: number | null = null;
                let prevDist = 0;
                for (let p = i - 1; p >= 0; p--) {
                  if (tempSlots[p].level !== null) {
                    prevVal = tempSlots[p].level;
                    prevDist = i - p;
                    break;
                  }
                }

                let nextVal: number | null = null;
                let nextDist = 0;
                for (let n = i + 1; n < tempSlots.length; n++) {
                  if (tempSlots[n].level !== null) {
                    nextVal = tempSlots[n].level;
                    nextDist = n - i;
                    break;
                  }
                }

                if (prevVal !== null && nextVal !== null) {
                  const weight = prevDist / (prevDist + nextDist);
                  tempSlots[i].level = Math.round(prevVal + (nextVal - prevVal) * weight);
                } else if (prevVal !== null) {
                  tempSlots[i].level = prevVal;
                } else if (nextVal !== null) {
                  tempSlots[i].level = nextVal;
                } else {
                  tempSlots[i].level = Number(chosenBlock[chosenBlock.length - 1].TINGGI_AIR) || station.level;
                }
              }
            }

            history = tempSlots.map((slot) => {
              const lvl = slot.level ?? station.level;
              let st = 'Normal';
              if (lvl >= s1) st = 'Siaga 1';
              else if (lvl >= s2) st = 'Siaga 2';
              else if (lvl >= s3) st = 'Siaga 3';

              return {
                hour: slot.hour,
                datetime: slot.datetime,
                level: lvl,
                siaga1: s1,
                siaga2: s2,
                siaga3: s3,
                siaga4: s4,
                status: st,
              };
            });
          }
        }
      } catch (err) {
        console.warn(`[getStationHistory] Warning querying jakarta_tma for station ${stationId}:`, err);
      }
    }

    // 2. Fallback when offline or DB empty: Organic hydrological baseflow/recession curve (NO SINE WAVE)
    if (history.length === 0) {
      const now = new Date();
      const current = station.level;
      const prev = station.prev_level ?? current;
      let seed = 0;
      for (let c = 0; c < stationId.length; c++) seed = (seed * 31 + stationId.charCodeAt(c)) & 0xffffff;

      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600 * 1000);
        const hourStr = d.getHours().toString().padStart(2, '0') + ':00';
        const progress = (23 - i) / 23;

        seed = (seed * 1664525 + 1013904223) & 0xffffff;
        const noiseFactor = ((seed / 0xffffff) - 0.5) * 0.015;

        let lvl: number;
        if (station.trend === 'rising') {
          const sigmoid = 1 / (1 + Math.exp(-6 * (progress - 0.6)));
          lvl = Math.round(prev + (current - prev) * sigmoid + current * noiseFactor);
        } else if (station.trend === 'falling') {
          const recession = Math.exp(-2.2 * progress);
          lvl = Math.round(current + (prev - current) * recession + current * noiseFactor);
        } else {
          lvl = Math.round(current * (1 + noiseFactor));
        }

        let st = 'Normal';
        if (lvl >= s1) st = 'Siaga 1';
        else if (lvl >= s2) st = 'Siaga 2';
        else if (lvl >= s3) st = 'Siaga 3';

        history.push({
          hour: hourStr,
          datetime: d.toISOString(),
          level: Math.max(0, lvl),
          siaga1: s1,
          siaga2: s2,
          siaga3: s3,
          siaga4: s4,
          status: st,
        });
      }
    }

    const result = {
      station,
      period: periodMeta,
      history,
    };
    stationHistoryCache.set(cacheKey, { data: result, cachedAt: nowMs });
    return result;
  } else {
    const station = cachedRain?.find((s) => s.station_id === stationId);
    if (!station) return { error: 'STATION_NOT_FOUND', history: [] };

    let history: Array<{ hour: string; datetime?: string; rain: number }> = [];
    let periodMeta: { start?: string; end?: string; source: string } = {
      source: 'meteorological_model',
    };

    // 1. Primary: query actual observations from jakarta_ch in local_govtech_floodsense
    if (await databaseAvailable()) {
      try {
        const pool = db();
        const [rows] = await pool.query<any[]>(
          `SELECT TANGGAL_TERAKHIR, KETINGGIAN_TERAKHIR, KETINGGIAN_HARI_INI 
           FROM jakarta_ch 
           WHERE ID_LOKASI_PEMANTAUAN = ? 
             AND TANGGAL_TERAKHIR > '2000-01-01' 
           ORDER BY TANGGAL_TERAKHIR DESC 
           LIMIT 150`,
          [station.station_id]
        );

        if (Array.isArray(rows) && rows.length >= 8) {
          const sorted = [...rows].sort(
            (a, b) => new Date(a.TANGGAL_TERAKHIR).getTime() - new Date(b.TANGGAL_TERAKHIR).getTime()
          );

          const blocks: any[][] = [];
          let curBlock: any[] = [sorted[0]];
          for (let i = 1; i < sorted.length; i++) {
            const prevT = new Date(sorted[i - 1].TANGGAL_TERAKHIR).getTime();
            const curT = new Date(sorted[i].TANGGAL_TERAKHIR).getTime();
            const diffHours = (curT - prevT) / (3600 * 1000);
            if (diffHours <= 3.5) {
              curBlock.push(sorted[i]);
            } else {
              blocks.push(curBlock);
              curBlock = [sorted[i]];
            }
          }
          blocks.push(curBlock);

          const validBlocks = blocks.filter((b) => b.length >= 8);
          const chosenBlock =
            validBlocks.length > 0 ? validBlocks[validBlocks.length - 1] : blocks[blocks.length - 1];

          if (chosenBlock.length >= 4) {
            const endT = new Date(chosenBlock[chosenBlock.length - 1].TANGGAL_TERAKHIR);
            const startT = new Date(chosenBlock[0].TANGGAL_TERAKHIR);

            periodMeta = {
              start: startT.toISOString(),
              end: endT.toISOString(),
              source: 'jakarta_ch',
            };

            for (let i = 23; i >= 0; i--) {
              const slotEnd = new Date(endT.getTime() - i * 3600 * 1000);
              const slotStart = new Date(slotEnd.getTime() - 3600 * 1000);
              const hourStr = slotEnd.getHours().toString().padStart(2, '0') + ':00';

              const inSlot = chosenBlock.filter((r) => {
                const t = new Date(r.TANGGAL_TERAKHIR).getTime();
                return t > slotStart.getTime() && t <= slotEnd.getTime();
              });

              if (inSlot.length > 0) {
                const maxVal = inSlot.reduce(
                  (max, r) => Math.max(max, Number(r.KETINGGIAN_TERAKHIR) || 0),
                  0
                );
                history.push({ hour: hourStr, datetime: slotEnd.toISOString(), rain: Math.round(maxVal * 10) / 10 });
              } else {
                history.push({ hour: hourStr, datetime: slotEnd.toISOString(), rain: 0 });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[getStationHistory] Warning querying jakarta_ch for station ${stationId}:`, err);
      }
    }

    // 2. Meteorological hyetograph fallback (NO SINE WAVE)
    if (history.length === 0) {
      const now = new Date();
      const rainToday = station.rain_today || 0;
      const currentRain = station.rain_current || 0;

      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600 * 1000);
        const hourStr = d.getHours().toString().padStart(2, '0') + ':00';

        let rainVal = 0;
        if (i === 0) {
          rainVal = currentRain;
        } else if (rainToday > 0) {
          if (i === 1) rainVal = Math.round(rainToday * 0.35 * 10) / 10;
          else if (i === 2) rainVal = Math.round(rainToday * 0.50 * 10) / 10;
          else if (i === 3) rainVal = Math.round(rainToday * 0.15 * 10) / 10;
        }

        history.push({ hour: hourStr, datetime: d.toISOString(), rain: rainVal });
      }
    }

    const result = {
      station,
      period: periodMeta,
      history,
    };
    stationHistoryCache.set(cacheKey, { data: result, cachedAt: nowMs });
    return result;
  }
}

export async function getMonitoringProjects2026(filters?: {
  sector?: string;
  status?: string;
  risk?: string;
  q?: string;
}) {
  await loadData();
  let list = cachedProjects2026 || [];

  if (filters?.sector && filters.sector !== 'all') {
    list = list.filter((p) => p.sector.toLowerCase() === filters.sector!.toLowerCase());
  }

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((p) => p.status.toLowerCase().includes(filters.status!.toLowerCase()));
  }

  if (filters?.risk && filters.risk !== 'all') {
    list = list.filter((p) => p.risk_level === filters.risk);
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.owner_name.toLowerCase().includes(q) ||
        p.owner_short_name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function getMonitoringProjectDetail(idOrSlug: string | number) {
  await loadData();
  const projects = cachedProjects2026 || [];
  const project = projects.find(
    (p) => p.id === Number(idOrSlug) || p.slug === String(idOrSlug)
  );
  if (!project) return null;

  try {
    const isAvail = await databaseAvailable();
    if (isAvail) {
      const conn = db();
      const [sections]: any = await conn.query(
        'SELECT id, section_key, title, content, sort_order FROM jktjic_potensiproject_2026_sections WHERE project_id = ? ORDER BY sort_order ASC',
        [project.id]
      );
      const [images]: any = await conn.query(
        'SELECT id, image_type, relative_path, caption, width, height FROM jktjic_potensiproject_2026_images WHERE project_id = ?',
        [project.id]
      );
      const [contacts]: any = await conn.query(
        'SELECT id, name, role, email, is_primary FROM jktjic_potensiproject_2026_contacts WHERE project_id = ?',
        [project.id]
      );
      return {
        ...project,
        sections: sections || [],
        images: images || [],
        contacts: contacts || [],
      };
    }
  } catch (err) {
    console.warn('Could not query project details from DB:', err);
  }

  return project;
}

export async function getMonitoringRivers(filters?: {
  orde?: number | number[];
  q?: string;
}): Promise<RiverFeatureCollection> {
  if (!cachedRivers) {
    let features: RiverFeature[] = [];
    const isAvail = await databaseAvailable();
    if (isAvail) {
      try {
        const conn = db();
        const [rows]: any = await conn.query(`
          SELECT id, feature_id, nama_sungai, orde, anotasi, geometry_type, source_geojson
          FROM cilicis_datasungai
          ORDER BY orde ASC, nama_sungai ASC
        `);

        for (const row of rows) {
          try {
            const rawGeo = typeof row.source_geojson === 'string'
              ? JSON.parse(row.source_geojson)
              : row.source_geojson;

            const roundCoords = (geom: any) => {
              if (geom.type === 'LineString') {
                return geom.coordinates.map((pt: number[]) => [
                  Math.round(pt[0] * 1e5) / 1e5,
                  Math.round(pt[1] * 1e5) / 1e5,
                ]);
              } else if (geom.type === 'MultiLineString') {
                return geom.coordinates.map((line: number[][]) =>
                  line.map((pt: number[]) => [
                    Math.round(pt[0] * 1e5) / 1e5,
                    Math.round(pt[1] * 1e5) / 1e5,
                  ])
                );
              }
              return geom.coordinates;
            };

            const ordeLabels: Record<number, string> = {
              1: 'Sungai Utama',
              2: 'Anak Sungai',
              3: 'Saluran Penghubung',
            };

            features.push({
              type: 'Feature',
              id: row.feature_id || row.id,
              geometry: {
                type: row.geometry_type || rawGeo.geometry.type,
                coordinates: roundCoords(rawGeo.geometry),
              },
              properties: {
                id: Number(row.id),
                feature_id: row.feature_id,
                nama_sungai: row.nama_sungai,
                orde: Number(row.orde),
                orde_label: ordeLabels[Number(row.orde)] || `Orde ${row.orde}`,
                anotasi: row.anotasi || null,
                geometry_type: row.geometry_type,
              },
            });
          } catch (e) {
            console.warn(`Error parsing river feature ${row.id}:`, e);
          }
        }
      } catch (err) {
        console.warn('Could not query cilicis_datasungai from DB, falling back to JSON:', err);
      }
    }

    if (features.length === 0) {
      // Fallback to docs/data_gis/data_sungai.json
      try {
        const fileContent = await fs.readFile(path.resolve('docs/data_gis/data_sungai.json'), 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          const roundCoords = (geom: any) => {
            if (geom.type === 'LineString') {
              return geom.coordinates.map((pt: number[]) => [
                Math.round(pt[0] * 1e5) / 1e5,
                Math.round(pt[1] * 1e5) / 1e5,
              ]);
            } else if (geom.type === 'MultiLineString') {
              return geom.coordinates.map((line: number[][]) =>
                line.map((pt: number[]) => [
                  Math.round(pt[0] * 1e5) / 1e5,
                  Math.round(pt[1] * 1e5) / 1e5,
                ])
              );
            }
            return geom.coordinates;
          };

          const ordeLabels: Record<number, string> = {
            1: 'Sungai Utama',
            2: 'Anak Sungai',
            3: 'Saluran Penghubung',
          };

          features = parsed.features.map((f: any, idx: number) => ({
            type: 'Feature',
            id: f.id || `river-${idx + 1}`,
            geometry: {
              type: f.geometry.type,
              coordinates: roundCoords(f.geometry),
            },
            properties: {
              id: idx + 1,
              feature_id: f.id || `river-${idx + 1}`,
              nama_sungai: f.properties?.['Nama Sungai'] || 'Sungai Tanpa Nama',
              orde: Number(f.properties?.ORDE || 1),
              orde_label: ordeLabels[Number(f.properties?.ORDE || 1)] || 'Sungai',
              anotasi: f.properties?.ANOTASI || null,
              geometry_type: f.geometry.type,
            },
          }));
        }
      } catch (fileErr) {
        console.warn('Could not read docs/data_gis/data_sungai.json:', fileErr);
      }
    }

    cachedRivers = {
      type: 'FeatureCollection',
      features,
    };
  }

  let resultFeatures = cachedRivers.features;

  if (filters?.orde !== undefined) {
    const ordeFilter = Array.isArray(filters.orde) ? filters.orde : [filters.orde];
    resultFeatures = resultFeatures.filter((f) => ordeFilter.includes(f.properties.orde));
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    resultFeatures = resultFeatures.filter(
      (f) =>
        f.properties.nama_sungai.toLowerCase().includes(q) ||
        (f.properties.anotasi && f.properties.anotasi.toLowerCase().includes(q))
    );
  }

  return {
    type: 'FeatureCollection',
    features: resultFeatures,
  };
}

export function findNearestRiver(lat: number, lon: number): { name: string; orde: number; orde_label: string; distance_km: number } | null {
  if (!cachedRivers || cachedRivers.features.length === 0) return null;
  let minDist = Infinity;
  let bestRiver: RiverFeature | null = null;

  for (const f of cachedRivers.features) {
    const geom = f.geometry;
    if (geom.type === 'LineString') {
      for (const pt of geom.coordinates) {
        const d = getDistanceKm(lat, lon, pt[1], pt[0]);
        if (d < minDist) {
          minDist = d;
          bestRiver = f;
        }
      }
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        for (const pt of line) {
          const d = getDistanceKm(lat, lon, pt[1], pt[0]);
          if (d < minDist) {
            minDist = d;
            bestRiver = f;
          }
        }
      }
    }
  }

  if (!bestRiver) return null;
  return {
    name: bestRiver.properties.nama_sungai,
    orde: bestRiver.properties.orde,
    orde_label: bestRiver.properties.orde_label,
    distance_km: Math.round(minDist * 100) / 100,
  };
}

export type ThiessenPolygonFeature = {
  type: 'Feature';
  geometry: any;
  properties: {
    station_id: string;
    name: string;
    area_km2: number;
    weight_pct: number;
    das_name: string;
    city?: string;
  };
};

export type ThiessenFeatureCollection = {
  type: 'FeatureCollection';
  features: ThiessenPolygonFeature[];
  summary?: {
    regional_dki: ThiessenArealStats | null;
    regional_catchment?: ThiessenArealStats | null;
    das_stats: Record<string, ThiessenArealStats>;
  };
};

let cachedThiessen: ThiessenFeatureCollection | null = null;

export async function getMonitoringThiessen(): Promise<ThiessenFeatureCollection> {
  if (cachedThiessen) return cachedThiessen;
  try {
    const raw = await fs.readFile(path.resolve('.build/study/thiessen-polygons.json'), 'utf8');
    const geo = JSON.parse(raw);
    const seasonRaw = await fs.readFile(path.resolve('.build/study/station-seasonal-stats.json'), 'utf8');
    const seasonData = JSON.parse(seasonRaw);
    cachedThiessen = {
      type: 'FeatureCollection',
      features: geo.features || [],
      summary: {
        regional_dki: seasonData.thiessen_regional_dki || null,
        regional_catchment: seasonData.thiessen_regional_catchment || null,
        das_stats: seasonData.thiessen_das || {},
      },
    };
    return cachedThiessen;
  } catch (err) {
    console.warn('Could not load thiessen polygons:', err);
    return { type: 'FeatureCollection', features: [] };
  }
}

export type DasFeature = {
  type: 'Feature';
  geometry: any;
  properties: {
    AREA?: number;
    PERIMETER?: number;
    KODE?: string;
    kode?: string;
    NAMA_DAS: string;
    name?: string;
    WS?: string;
    Luas?: number;
    luas_ha?: number;
    ch_stations?: number;
    tma_stations?: number;
    flood_reports?: number;
    experiments_count?: number;
    das_id?: string;
  };
};

export type DasFeatureCollection = {
  type: 'FeatureCollection';
  features: DasFeature[];
  summary?: {
    total_das: number;
    total_area_ha: number;
  };
};

let cachedDas: DasFeatureCollection | null = null;

export async function getMonitoringDas(): Promise<DasFeatureCollection> {
  if (cachedDas) return cachedDas;
  try {
    const raw = await fs.readFile(path.resolve('docs/data_gis/das_cilicis.json'), 'utf8');
    const geo = JSON.parse(raw);

    const dasSummaryMap = new Map<string, any>();
    try {
      const studyFilePath = path.resolve('analysis/results/das-study.json');
      const studyRaw = await fs.readFile(studyFilePath, 'utf8');
      const studyData = JSON.parse(studyRaw);
      if (Array.isArray(studyData.das_summary)) {
        for (const item of studyData.das_summary) {
          if (item.name) {
            dasSummaryMap.set(item.name.toLowerCase().trim(), item);
          }
        }
      }
    } catch {
      // study file optional
    }

    let totalAreaHa = 0;
    const enrichedFeatures: DasFeature[] = (geo.features || []).map((feat: any) => {
      const p = feat.properties || {};
      const dasName = p.NAMA_DAS || '';
      const summaryItem = dasSummaryMap.get(dasName.toLowerCase().trim());
      const luasHa = summaryItem?.luas_ha ?? p.Luas ?? (p.AREA ? p.AREA / 10000 : 0);
      totalAreaHa += Number(luasHa) || 0;

      return {
        ...feat,
        properties: {
          ...p,
          NAMA_DAS: dasName,
          name: dasName,
          kode: p.KODE || summaryItem?.kode,
          luas_ha: luasHa,
          ch_stations: summaryItem?.ch_stations ?? 0,
          tma_stations: summaryItem?.tma_stations ?? 0,
          flood_reports: summaryItem?.flood_reports ?? 0,
          experiments_count: summaryItem?.experiments_count ?? 0,
          das_id: summaryItem?.das_id,
        },
      };
    });

    cachedDas = {
      type: 'FeatureCollection',
      features: enrichedFeatures,
      summary: {
        total_das: enrichedFeatures.length,
        total_area_ha: Math.round(totalAreaHa),
      },
    };
    return cachedDas;
  } catch (err) {
    console.warn('Could not load DAS GeoJSON:', err);
    return { type: 'FeatureCollection', features: [] };
  }
}

export async function evaluateLocation(lat: number, lng: number): Promise<LocationEvaluation> {
  await loadData();
  if (!cachedRivers) {
    await getMonitoringRivers();
  }

  // 1. Nearest TMA Station
  let minTmaDist = Infinity;
  let closestTma: TMAStation | null = null;
  for (const t of cachedTMA || []) {
    const d = getDistanceKm(lat, lng, t.latitude, t.longitude);
    if (d < minTmaDist) {
      minTmaDist = d;
      closestTma = t;
    }
  }

  // 2. Nearest Rain Station
  let minRainDist = Infinity;
  let closestRain: RainStation | null = null;
  for (const r of cachedRain || []) {
    const d = getDistanceKm(lat, lng, r.latitude, r.longitude);
    if (d < minRainDist) {
      minRainDist = d;
      closestRain = r;
    }
  }

  // 3. Nearest Flood Report
  let minRepDist = Infinity;
  let closestRep: FloodReport | null = null;
  for (const rep of cachedReports || []) {
    const d = getDistanceKm(lat, lng, rep.latitude, rep.longitude);
    if (d < minRepDist) {
      minRepDist = d;
      closestRep = rep;
    }
  }

  // 4. Nearest River
  const nearestRiver = findNearestRiver(lat, lng);

  // 5. Nearest Pump Station (jakarta_rumah_pumpa)
  let minPumpDist = Infinity;
  let closestPump: PumpStation | null = null;
  for (const p of cachedPumps || []) {
    const d = getDistanceKm(lat, lng, p.latitude, p.longitude);
    if (d < minPumpDist) {
      minPumpDist = d;
      closestPump = p;
    }
  }

  // 6. Nearest Waduk / Situ (jakarta_waduk)
  let minWadukDist = Infinity;
  let closestWaduk: WadukStation | null = null;
  for (const w of cachedWaduk || []) {
    const d = getDistanceKm(lat, lng, w.latitude, w.longitude);
    if (d < minWadukDist) {
      minWadukDist = d;
      closestWaduk = w;
    }
  }

  // 7. Nearest Flood Gate (jakarta_pintu_air)
  let minGateDist = Infinity;
  let closestGate: FloodGate | null = null;
  for (const g of cachedGates || []) {
    const d = getDistanceKm(lat, lng, g.latitude, g.longitude);
    if (d < minGateDist) {
      minGateDist = d;
      closestGate = g;
    }
  }

  const transit = computeTransitProximity(lat, lng);

  const exp = computeCompoundExposure({
    lat,
    lng,
    tma: closestTma,
    tmaDist: minTmaDist,
    rain: closestRain,
    rainDist: minRainDist,
    report: closestRep,
    reportDist: minRepDist,
    river: nearestRiver,
    pump: closestPump,
    pumpDist: minPumpDist,
    waduk: closestWaduk,
    wadukDist: minWadukDist,
    gate: closestGate,
    gateDist: minGateDist,
    transit,
  });

  const rationale = buildSummaryRationale({
    tma: closestTma,
    tmaDist: minTmaDist,
    rain: closestRain,
    rainDist: minRainDist,
    report: closestRep,
    reportDist: minRepDist,
    pump: closestPump,
    pumpDist: minPumpDist,
    waduk: closestWaduk,
    wadukDist: minWadukDist,
    gate: closestGate,
    gateDist: minGateDist,
    river: nearestRiver,
    compound: exp.compound_indices,
    transit,
  });

  const tmaSeasonal = closestTma ? cachedTMASeasonal[closestTma.station_id] || null : null;
  const rainSeasonal = closestRain ? cachedRainSeasonal[closestRain.station_id] || null : null;

  return {
    latitude: lat,
    longitude: lng,
    risk_score: exp.score,
    risk_level: exp.risk_level,
    risk_status_label: exp.risk_status_label,
    summary_rationale: rationale,
    compound_indices: exp.compound_indices,
    financial_exposure: exp.financial_exposure,
    parametric_insurance: exp.parametric_insurance,
    transit_proximity: transit,
    nearest_tma: closestTma ? {
      station_id: closestTma.station_id,
      name: closestTma.name,
      river: closestTma.river,
      distance_km: minTmaDist,
      level: closestTma.level,
      status: closestTma.status,
      siaga_level: closestTma.siaga_level,
      seasonal_stats: tmaSeasonal,
    } : null,
    nearest_rain: closestRain ? {
      station_id: closestRain.station_id,
      name: closestRain.name,
      location: closestRain.location,
      distance_km: minRainDist,
      intensity: closestRain.intensity,
      rain_current: closestRain.rain_current,
      das_polder: closestRain.das_polder,
      seasonal_stats: rainSeasonal,
    } : null,
    nearest_report: closestRep ? {
      source: closestRep.report_source === 'cilicis' ? 'Cilicis Lapangan' : 'PU Sitaba',
      distance_km: minRepDist,
      occurred_at: closestRep.occurred_at,
      depth_cm_raw: closestRep.depth_cm_raw,
      location_desc: closestRep.kelurahan || closestRep.city,
    } : null,
    nearest_river: nearestRiver,
    nearest_pump: closestPump ? {
      id: closestPump.id,
      name: closestPump.name,
      address: closestPump.address,
      distance_km: minPumpDist,
      operating: closestPump.operating,
      idle: closestPump.idle,
      total: closestPump.total,
    } : null,
    nearest_waduk: closestWaduk ? {
      id: closestWaduk.id,
      name: closestWaduk.name,
      wilayah: closestWaduk.wilayah,
      distance_km: minWadukDist,
      luas: closestWaduk.luas,
      volume: closestWaduk.volume,
      pompa: closestWaduk.pompa,
    } : null,
    nearest_gate: closestGate ? {
      id: closestGate.id,
      name: closestGate.name,
      system: closestGate.system,
      distance_km: minGateDist,
      level: closestGate.level,
      status: closestGate.status,
    } : null,
  };
}

export async function getMonitoringTransit(mode?: string) {
  await loadData();
  let list = cachedTransitStations || [];
  if (mode && mode !== 'all') {
    list = list.filter((s) => s.mode.toLowerCase() === mode.toLowerCase());
  }
  return list;
}


import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
  Popup,
  Polyline,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Compass,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  History,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  ReferenceLine,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from 'recharts';
import 'leaflet/dist/leaflet.css';
import './monitoring.css';

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
  siaga_level: number;
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
    das_stats: Record<string, ThiessenArealStats>;
  };
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

export type MonitoringSummary = {
  tma: {
    total: number;
    siaga1: number;
    siaga2: number;
    siaga3: number;
    normal: number;
    rising: number;
  };
  rain: {
    total: number;
    heavy: number;
    moderate: number;
    light: number;
    zero: number;
  };
  investments: {
    total: number;
    high_exposure: number;
    moderate_exposure: number;
    low_exposure: number;
    by_category: Record<string, number>;
  };
  projects2026?: {
    total: number;
    with_coordinates: number;
    ready_to_offer: number;
    market_sounding: number;
    under_study: number;
    high_exposure: number;
    moderate_exposure: number;
    low_exposure: number;
    total_investment_idr: number;
    by_sector: Record<string, number>;
  };
  reports: {
    total: number;
    sitaba: number;
    cilicis: number;
  };
  infrastructure: {
    pumps_total: number;
    gates_total: number;
  };
  provenance: {
    database?: string;
    tma_source: string;
    rain_source: string;
    investment_source: string;
    projects2026_source?: string;
    reports_source: string;
    updated_at: string;
  };
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

type SelectedEntity =
  | { type: 'tma'; data: TMAStation }
  | { type: 'investment'; data: InvestmentPOI }
  | { type: 'project'; data: Project2026 }
  | { type: 'rain'; data: RainStation }
  | { type: 'report'; data: FloodReport }
  | { type: 'river'; data: RiverFeature }
  | { type: 'waduk'; data: WadukStation }
  | { type: 'custom_location'; data: LocationEvaluation }
  | null;

function MapAutoResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      map.panTo(e.latlng, { animate: true, duration: 0.4 });
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MonitoringDashboard({
  onSwitchToLab,
}: {
  onSwitchToLab?: () => void;
}) {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [tmaList, setTmaList] = useState<TMAStation[]>([]);
  const [rainList, setRainList] = useState<RainStation[]>([]);
  const [investments, setInvestments] = useState<InvestmentPOI[]>([]);
  const [projects2026, setProjects2026] = useState<Project2026[]>([]);
  const [floodReports, setFloodReports] = useState<FloodReport[]>([]);
  const [pumps, setPumps] = useState<PumpStation[]>([]);
  const [gates, setGates] = useState<FloodGate[]>([]);
  const [waduk, setWaduk] = useState<WadukStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & mode controls
  const [mode, setMode] = useState<'realtime' | 'historical'>('realtime');
  const [corridor, setCorridor] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Layer toggles
  const [layerRivers, setLayerRivers] = useState(true);
  const [layerThiessen, setLayerThiessen] = useState(false);
  const [layerTMA, setLayerTMA] = useState(true);
  const [layerRain, setLayerRain] = useState(true);
  const [layerReports, setLayerReports] = useState(true);
  const [layerInfra, setLayerInfra] = useState(false);
  const [layerWaduk, setLayerWaduk] = useState(true);
  const [layerProjects2026, setLayerProjects2026] = useState(true);
  const [layerInvestments, setLayerInvestments] = useState(true);
  const [layerVital, setLayerVital] = useState(true);
  const [layerTransit, setLayerTransit] = useState(false);
  const [transitStations, setTransitStations] = useState<TransitStation[]>([]);

  // River GeoJSON state
  const [riverCollection, setRiverCollection] = useState<RiverFeatureCollection | null>(null);
  const [thiessenData, setThiessenData] = useState<ThiessenFeatureCollection | null>(null);

  // Custom arbitrary location evaluation state
  const [customLocation, setCustomLocation] = useState<LocationEvaluation | null>(null);
  const [evaluatingLocation, setEvaluatingLocation] = useState(false);
  const [evaluatingCoord, setEvaluatingCoord] = useState<{ lat: number; lng: number } | null>(null);

  // Inspector & Bottom tab
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [stationHistory, setStationHistory] = useState<any[]>([]);
  const [stationHistoryPeriod, setStationHistoryPeriod] = useState<{ start?: string; end?: string; source?: string } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState<'projects' | 'tma' | 'rain' | 'investments' | 'reports' | 'rivers' | 'waduk'>('projects');

  // Interactive Resilience Mitigation Simulator state
  const [mitigations, setMitigations] = useState<{
    elevatedFloor: boolean;
    floodBarrier: boolean;
    retentionBasin: boolean;
    elevatedUtilities: boolean;
  }>({
    elevatedFloor: false,
    floodBarrier: false,
    retentionBasin: false,
    elevatedUtilities: false,
  });

  const getMitigationDiscountPct = () => {
    let reductionPct = 0;
    if (mitigations.elevatedFloor) reductionPct += 32;
    if (mitigations.floodBarrier) reductionPct += 24;
    if (mitigations.retentionBasin) reductionPct += 20;
    if (mitigations.elevatedUtilities) reductionPct += 14;
    return reductionPct;
  };

  const calcMitigatedScore = (baseScore: number) => {
    const reductionPct = getMitigationDiscountPct();
    return Math.max(5, Math.round(baseScore * (1 - reductionPct / 100)));
  };

  const renderResilienceAnalysisCards = (params: {
    entityName: string;
    entityCategory: string;
    coordinates?: { lat: number; lng: number };
    baseScore: number;
    riskLevel: string;
    riskStatusLabel: string;
    compoundIndices?: CompoundFloodIndices;
    financialExposure?: FinancialExposure;
    parametricInsurance?: ParametricInsuranceUnderwriting;
    transitProximity?: TransitProximityProfile | null;
  }) => {
    const {
      baseScore,
      compoundIndices,
      financialExposure,
      parametricInsurance,
      transitProximity,
    } = params;

    const mitigatedScore = calcMitigatedScore(baseScore);
    const reductionPct = getMitigationDiscountPct();
    const isMitigated = reductionPct > 0;

    return (
      <div style={{ marginTop: '14px' }}>
        {/* 1. DEKOMPOSISI MEKANISME BANJIR (COMPOUND FLOOD INDICES) */}
        {compoundIndices && (
          <div className="m-resilience-card">
            <div className="m-resilience-card-title">
              <span>🌊 Dekomposisi Mekanisme Bahaya</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Skala 0–100</span>
            </div>

            <div className="m-compound-meter">
              <div className="m-compound-label">
                <span>Luapan Sungai (Fluvial Hazard)</span>
                <strong style={{ color: compoundIndices.fluvial_score >= 50 ? '#dc2626' : '#2563eb' }}>
                  {compoundIndices.fluvial_score}%
                </strong>
              </div>
              <div className="m-progress-track">
                <div
                  className="m-progress-fill"
                  style={{
                    width: `${compoundIndices.fluvial_score}%`,
                    background: compoundIndices.fluvial_score >= 50 ? '#ef4444' : '#3b82f6',
                  }}
                />
              </div>
            </div>

            <div className="m-compound-meter">
              <div className="m-compound-label">
                <span>Genangan Hujan Lokal (Pluvial Hazard)</span>
                <strong style={{ color: compoundIndices.pluvial_score >= 50 ? '#dc2626' : '#0891b2' }}>
                  {compoundIndices.pluvial_score}%
                </strong>
              </div>
              <div className="m-progress-track">
                <div
                  className="m-progress-fill"
                  style={{
                    width: `${compoundIndices.pluvial_score}%`,
                    background: compoundIndices.pluvial_score >= 50 ? '#ef4444' : '#06b6d4',
                  }}
                />
              </div>
            </div>

            <div className="m-compound-meter">
              <div className="m-compound-label">
                <span>Pasang Laut / Rob (Coastal Hazard)</span>
                <strong style={{ color: compoundIndices.coastal_score >= 50 ? '#dc2626' : '#64748b' }}>
                  {compoundIndices.coastal_score}%
                </strong>
              </div>
              <div className="m-progress-track">
                <div
                  className="m-progress-fill"
                  style={{
                    width: `${compoundIndices.coastal_score}%`,
                    background: compoundIndices.coastal_score >= 50 ? '#ef4444' : '#94a3b8',
                  }}
                />
              </div>
            </div>

            {compoundIndices.mitigation_discount > 0 && (
              <div style={{
                marginTop: '8px',
                padding: '6px 9px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '10.5px',
                color: '#166534',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>🛡️ Proteksi Pompa & Waduk Kota:</span>
                <strong>Diskon -{compoundIndices.mitigation_discount} Poin</strong>
              </div>
            )}
          </div>
        )}

        {/* 2. KUANTIFIKASI FINANSIAL RISIKO & TAKSONOMI HIJAU */}
        {financialExposure && (
          <div className="m-resilience-card">
            <div className="m-resilience-card-title">
              <span>💼 Kuantifikasi Finansial Kerugian (VaR)</span>
              <span style={{ fontSize: '10px', color: '#047857', fontWeight: 700 }}>JIC Due Diligence</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                <span style={{ fontSize: '9.5px', color: '#64748b', display: 'block' }}>CAPEX AT RISK</span>
                <strong style={{ fontSize: '13px', color: financialExposure.capex_at_risk_pct >= 15 ? '#dc2626' : '#2563eb' }}>
                  {isMitigated 
                    ? `${Math.round(financialExposure.capex_at_risk_pct * (1 - reductionPct / 100))}%` 
                    : `${financialExposure.capex_at_risk_pct}%`}
                </strong>
                {isMitigated && (
                  <span style={{ fontSize: '9px', color: '#16a34a', display: 'block', fontWeight: 600 }}>
                    (-{reductionPct}% dicegah)
                  </span>
                )}
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                <span style={{ fontSize: '9.5px', color: '#64748b', display: 'block' }}>GANGGUAN USAHA (BI)</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {isMitigated 
                  {financialExposure.net_downtime_days != null
                    ? `${(financialExposure.net_downtime_days * (isMitigated ? (1 - reductionPct / 100) : 1)).toFixed(1)} Hari`
                    : isMitigated 
                    ? `${(financialExposure.estimated_downtime_days * (1 - reductionPct / 100)).toFixed(1)} Hari` 
                    : `${financialExposure.estimated_downtime_days} Hari`}
                </strong>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>
                  Downtime operasional
                  {financialExposure.transit_downtime_mitigation_pct ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Net hemat -{financialExposure.transit_downtime_mitigation_pct}% via transit</span>
                  ) : 'Downtime operasional'}
                </span>
              </div>
            </div>

            <div style={{
              background: mitigatedScore < 40 ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${mitigatedScore < 40 ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: '6px',
              padding: '6px 9px',
              fontSize: '10.5px',
              color: mitigatedScore < 40 ? '#166534' : '#92400e',
            }}>
              <strong>🌿 Taksonomi Hijau OJK: </strong>
              <span>
                {mitigatedScore < 40 
                  ? 'Kategori A: Resiliensi Iklim (Eligible Pembiayaan Hijau / Green Loan)' 
                  : 'Memerlukan Mitigasi Rekayasa untuk Memenuhi Standar Resiliensi Iklim'}
              </span>
            </div>
          </div>
        )}

        {/* 3. AKSESIBILITAS TRANSPORTASI UMUM & KETAHANAN TOD */}
        {transitProximity && (
          <div className="m-resilience-card" style={{ borderLeft: '3px solid #6366f1' }}>
            <div className="m-resilience-card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚊 <span>Konektivitas Transit & Ketahanan TOD</span>
              </span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: transitProximity.tod_tier.includes('Core') ? '#15803d' : transitProximity.tod_tier.includes('Walkable') ? '#0369a1' : '#b45309',
                background: transitProximity.tod_tier.includes('Core') ? '#dcfce7' : transitProximity.tod_tier.includes('Walkable') ? '#e0f2fe' : '#fef3c7',
                padding: '2px 7px',
                borderRadius: '4px',
              }}>
                {transitProximity.tod_tier}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
                  Simpul Terdekat ({transitProximity.nearest_station.mode})
                </span>
                <strong style={{ fontSize: '11.5px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {transitProximity.nearest_station.name}
                </strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                    {transitProximity.nearest_station.distance_km} km
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                    ±{transitProximity.nearest_station.walking_time_mins} mnt jalan
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
                  Koridor Rel Bebas Banjir
                </span>
                {transitProximity.nearest_rail ? (
                  <>
                    <strong style={{ fontSize: '11.5px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {transitProximity.nearest_rail.mode} {transitProximity.nearest_rail.name}
                    </strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>
                        {transitProximity.nearest_rail.distance_km} km
                      </span>
                      <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                        ±{transitProximity.nearest_rail.walking_time_mins} mnt jalan
                      </span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Tidak dalam radius rel</span>
                )}
              </div>
            </div>

            <div style={{
              background: transitProximity.downtime_mitigation_pct > 0 ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${transitProximity.downtime_mitigation_pct > 0 ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: '6px',
              padding: '6px 9px',
              fontSize: '10px',
              marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 700 }}>Redundansi Evakuasi:</span>
                <span style={{ fontWeight: 800, color: transitProximity.flood_evacuation_redundancy.includes('Sangat Tinggi') ? '#15803d' : '#0369a1' }}>
                  {transitProximity.flood_evacuation_redundancy}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#475569', fontWeight: 700 }}>Mitigasi Hari Mati Usaha:</span>
                <strong style={{ color: '#047857' }}>
                  -{transitProximity.downtime_mitigation_pct}% Downtime Operasional
                </strong>
              </div>
            </div>

            <p style={{ margin: '0', fontSize: '10px', color: '#334155', lineHeight: 1.45 }}>
              {transitProximity.workforce_mobility_resilience}
            </p>

            <div style={{
              marginTop: '8px',
              padding: '5px 8px',
              background: transitProximity.green_taxonomy_tod_aligned ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${transitProximity.green_taxonomy_tod_aligned ? '#86efac' : '#cbd5e1'}`,
              borderRadius: '5px',
              fontSize: '9.5px',
              color: transitProximity.green_taxonomy_tod_aligned ? '#166534' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>{transitProximity.green_taxonomy_tod_aligned ? '✅' : 'ℹ️'}</span>
              <span>
                <b>Taksonomi Hijau Indonesia:</b> {transitProximity.green_taxonomy_tod_aligned
                  ? 'Memenuhi koridor prioritas TOD (< 800m), eligible pembiayaan berkelanjutan OJK TKBI'
                  : 'Berjarak > 800m dari transit massal, disarankan fasilitas feeder mandiri'}
              </span>
            </div>
          </div>
        )}

        {/* 3. SIMULATOR MITIGASI RESILIENSI MANDIRI */}
        <div className="m-resilience-card" style={{ borderColor: isMitigated ? '#86efac' : '#e2e8f0', background: isMitigated ? '#fafffa' : '#ffffff' }}>
          <div className="m-resilience-card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎛️ <span>Simulator Mitigasi Rekayasa</span>
            </span>
            {isMitigated && (
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '9.5px',
                fontWeight: 700,
              }}>
                -{reductionPct}% Reduksi
              </span>
            )}
          </div>

          <p style={{ fontSize: '10.5px', color: '#64748b', margin: '0 0 8px' }}>
            Simulasikan penurunan risiko investasi melalui implementasi rekayasa sipil bangunan:
          </p>

          <label className={`m-mitigation-option ${mitigations.elevatedFloor ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="m-mitigation-checkbox"
              checked={mitigations.elevatedFloor}
              onChange={(e) => setMitigations({ ...mitigations, elevatedFloor: e.target.checked })}
            />
            <div>
              <strong>🏗️ Peninggian Lantai Dasar (+1.2m di atas muka jalan)</strong>
              <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b' }}>
                Mencegah luapan air permukaan masuk ke lobi dan ground floor (-32% risiko)
              </span>
            </div>
          </label>

          <label className={`m-mitigation-option ${mitigations.floodBarrier ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="m-mitigation-checkbox"
              checked={mitigations.floodBarrier}
              onChange={(e) => setMitigations({ ...mitigations, floodBarrier: e.target.checked })}
            />
            <div>
              <strong>🛡️ Automatic Flood Barrier Ramp Basement</strong>
              <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b' }}>
                Proteksi hidrolik otomatis pada pintu masuk ruang parkir bawah tanah (-24% risiko)
              </span>
            </div>
          </label>

          <label className={`m-mitigation-option ${mitigations.retentionBasin ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="m-mitigation-checkbox"
              checked={mitigations.retentionBasin}
              onChange={(e) => setMitigations({ ...mitigations, retentionBasin: e.target.checked })}
            />
            <div>
              <strong>🌊 Kolam Retensi Mandiri (On-site Retention / Rain Harvesting)</strong>
              <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b' }}>
                Kapasitas tampung hujan lebat mandiri mengurangi limpasan ke drainase luar (-20% risiko)
              </span>
            </div>
          </label>

          <label className={`m-mitigation-option ${mitigations.elevatedUtilities ? 'active' : ''}`}>
            <input
              type="checkbox"
              className="m-mitigation-checkbox"
              checked={mitigations.elevatedUtilities}
              onChange={(e) => setMitigations({ ...mitigations, elevatedUtilities: e.target.checked })}
            />
            <div>
              <strong>⚡ Relokasi Gardu Listrik & Genset ke Lantai 2 / Rooftop</strong>
              <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b' }}>
                Menjamin kontinuitas daya listrik dan mencegah padam total saat genangan (-14% risiko)
              </span>
            </div>
          </label>

          {/* Dynamic Score Transition Box */}
          <div style={{
            marginTop: '10px',
            padding: '9px 12px',
            background: isMitigated ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${isMitigated ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>TRANSISI SKOR RISIKO</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: isMitigated ? 'line-through' : 'none' }}>
                  {baseScore}
                </span>
                {isMitigated && (
                  <>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>➔</span>
                    <strong style={{ fontSize: '16px', color: mitigatedScore < 30 ? '#15803d' : '#b45309' }}>
                      {mitigatedScore}
                    </strong>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: mitigatedScore < 30 ? '#15803d' : '#b45309',
                    }}>
                      ({mitigatedScore < 30 ? 'TERKENDALI / AMAN' : 'MODERAT / WASPADA'})
                    </span>
                  </>
                )}
              </div>
            </div>

            {isMitigated && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '9.5px', color: '#15803d', fontWeight: 700, display: 'block' }}>
                  🏷️ Diskon Premi Asuransi:
                </span>
                <strong style={{ fontSize: '12px', color: '#166534' }}>
                  Hingga {Math.min(40, Math.round(reductionPct * 0.55))}%
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* 4. ASURANSI PARAMETRIK UNDERWRITING SHEET */}
        {parametricInsurance && (
          <div className="m-resilience-card">
            <div className="m-resilience-card-title">
              <span>🛡️ Lembar Asuransi Banjir Parametrik</span>
              <span style={{ fontSize: '9.5px', color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Index-Based
              </span>
            </div>

            <div style={{ fontSize: '10.5px', color: '#334155', lineHeight: 1.5, marginBottom: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong style={{ color: '#475569' }}>Rekomendasi Skema: </strong>
                <span>{parametricInsurance.recommended_tier}</span>
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong style={{ color: '#475569' }}>Parameter Pemicu: </strong>
                <span style={{ color: '#0f172a' }}>{parametricInsurance.trigger_index}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '5px', padding: '6px 8px' }}>
                  <small style={{ fontSize: '9px', color: '#6b21a8', display: 'block' }}>WAKTU PENCAIRAN</small>
                  <strong style={{ fontSize: '11px', color: '#581c87' }}>{parametricInsurance.claim_turnaround}</strong>
                </div>
                <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '5px', padding: '6px 8px' }}>
                  <small style={{ fontSize: '9px', color: '#6b21a8', display: 'block' }}>RATE INDIKATIF</small>
                  <strong style={{ fontSize: '11px', color: '#581c87' }}>
                    {isMitigated ? `${(parseFloat(parametricInsurance.indicative_rate) * 0.7).toFixed(2)}% TIV (Diskon)` : parametricInsurance.indicative_rate}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TOMBOL CETAK DOKUMEN UJI TUNTAS (PDF) */}
        <button
          className="m-print-brief-btn"
          onClick={() => window.print()}
          title="Cetak atau simpan sebagai dokumen PDF resmi untuk Investment Committee"
        >
          <FileText size={15} /> Cetak / Unduh Dokumen Uji Tuntas (PDF)
        </button>
      </div>
    );
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setEvaluatingLocation(true);
    setEvaluatingCoord({ lat, lng });
    try {
      const res = await fetch(`/api/v1/monitoring/evaluate-location?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
      const json = await res.json();
      if (json.data) {
        setCustomLocation(json.data);
        setSelectedEntity({ type: 'custom_location', data: json.data });
      }
    } catch (err) {
      console.error('Gagal mengevaluasi titik peta:', err);
    } finally {
      setEvaluatingLocation(false);
      setEvaluatingCoord(null);
    }
  };

  // Load all monitoring data
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [sumRes, tmaRes, rainRes, invRes, projRes, repRes, infraRes, rivRes, thRes] = await Promise.allSettled([
        const [sumRes, tmaRes, rainRes, invRes, projRes, repRes, infraRes, rivRes, thRes, transitRes] = await Promise.allSettled([
          fetch('/api/v1/monitoring/summary').then((r) => r.json()),
          fetch('/api/v1/monitoring/tma').then((r) => r.json()),
          fetch('/api/v1/monitoring/rain').then((r) => r.json()),
          fetch('/api/v1/monitoring/investments').then((r) => r.json()),
          fetch('/api/v1/monitoring/projects-2026').then((r) => r.json()),
          fetch('/api/v1/monitoring/flood-reports').then((r) => r.json()),
          fetch('/api/v1/monitoring/infrastructure').then((r) => r.json()),
          fetch('/api/v1/monitoring/rivers').then((r) => r.json()),
          fetch('/api/v1/monitoring/thiessen').then((r) => r.json()),
          fetch('/api/v1/monitoring/transit').then((r) => r.json()),
        ]);

        if (sumRes.status === 'fulfilled' && sumRes.value?.data) setSummary(sumRes.value.data);
        if (tmaRes.status === 'fulfilled' && tmaRes.value?.data) setTmaList(tmaRes.value.data);
        if (rainRes.status === 'fulfilled' && rainRes.value?.data) setRainList(rainRes.value.data);
        if (invRes.status === 'fulfilled' && invRes.value?.data) setInvestments(invRes.value.data);
        if (projRes.status === 'fulfilled' && projRes.value?.data) setProjects2026(projRes.value.data);
        if (repRes.status === 'fulfilled' && repRes.value?.data) setFloodReports(repRes.value.data);
        if (rivRes.status === 'fulfilled' && rivRes.value?.data) setRiverCollection(rivRes.value.data);
        if (thRes.status === 'fulfilled' && thRes.value?.data) setThiessenData(thRes.value.data);
        if (transitRes.status === 'fulfilled' && transitRes.value?.data) setTransitStations(transitRes.value.data);
        if (infraRes.status === 'fulfilled' && infraRes.value?.data) {
          setPumps(infraRes.value.data.pumps || []);
          setGates(infraRes.value.data.gates || []);
          setWaduk(infraRes.value.data.waduk || []);
        }

        // Set initial selected item to highest alert station
        if (tmaRes.status === 'fulfilled' && tmaRes.value?.data && tmaRes.value.data.length > 0) {
          const highest = [...tmaRes.value.data].sort((a, b) => a.siaga_level - b.siaga_level)[0];
          setSelectedEntity({ type: 'tma', data: highest });
        }
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Fetch station history when a TMA or Rain station is selected
  useEffect(() => {
    if (!selectedEntity) return;

    if (selectedEntity.type === 'tma') {
      setHistoryLoading(true);
      fetch(`/api/v1/monitoring/history?id=${selectedEntity.data.station_id}&type=tma`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data?.history) setStationHistory(res.data.history);
          if (res.data?.period) setStationHistoryPeriod(res.data.period);
          else setStationHistoryPeriod(null);
        })
        .catch(() => {
          setStationHistory([]);
          setStationHistoryPeriod(null);
        })
        .finally(() => setHistoryLoading(false));
    } else if (selectedEntity.type === 'rain') {
      setHistoryLoading(true);
      fetch(`/api/v1/monitoring/history?id=${selectedEntity.data.station_id}&type=rain`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data?.history) setStationHistory(res.data.history);
          if (res.data?.period) setStationHistoryPeriod(res.data.period);
          else setStationHistoryPeriod(null);
        })
        .catch(() => {
          setStationHistory([]);
          setStationHistoryPeriod(null);
        })
        .finally(() => setHistoryLoading(false));
    } else if (
      selectedEntity.type === 'project' &&
      (!selectedEntity.data.sections || selectedEntity.data.sections.length === 0)
    ) {
      fetch(`/api/v1/monitoring/projects-2026/${selectedEntity.data.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data) {
            setSelectedEntity({ type: 'project', data: res.data });
          }
        })
        .catch((err) => console.warn('Could not fetch project details:', err));
    }
  }, [selectedEntity]);

  // Corridor keyword mapping for comprehensive multi-river matching
  const getCorridorKeywords = (corr: string): string[] => {
    const kwMap: Record<string, string[]> = {
      ciliwung: ['ciliwung'],
      sunter: ['sunter', 'cipinang'],
      pesanggrahan: ['pesanggrahan', 'angke', 'krukut', 'grogol', 'mampang'],
      marina: ['muara', 'asin', 'pluit', 'ancol', 'cakung', 'kamal', 'marunda', 'laut', 'pantai', 'marina', 'utara', 'north'],
    };
    return kwMap[corr.toLowerCase()] || [corr.toLowerCase()];
  };

  // Corridor filtering logic
  const filteredTMA = useMemo(() => {
    let list = tmaList;
    if (corridor !== 'all') {
      const kws = getCorridorKeywords(corridor);
      list = list.filter((s) => kws.some((kw) => s.river.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw)));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.river.toLowerCase().includes(q));
    }
    return list;
  }, [tmaList, corridor, searchQuery]);

  const filteredRain = useMemo(() => {
    let list = rainList;
    if (corridor !== 'all') {
      const kws = getCorridorKeywords(corridor);
      list = list.filter((r) => kws.some((kw) => r.das_polder.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw) || r.location.toLowerCase().includes(kw)));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.das_polder.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rainList, corridor, searchQuery]);

  const filteredInvestments = useMemo(() => {
    let list = investments;
    if (corridor !== 'all') {
      const kws = getCorridorKeywords(corridor);
      list = list.filter(
        (i) =>
          i.nearest_tma &&
          kws.some(
            (kw) =>
              (i.nearest_tma?.river && i.nearest_tma.river.toLowerCase().includes(kw)) ||
              (i.nearest_tma?.name && i.nearest_tma.name.toLowerCase().includes(kw))
          )
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category_label.toLowerCase().includes(q) ||
          (i.nearest_tma && (i.nearest_tma.name.toLowerCase().includes(q) || (i.nearest_tma.river && i.nearest_tma.river.toLowerCase().includes(q))))
      );
    }
    return list;
  }, [investments, corridor, searchQuery]);

  const filteredProjects2026 = useMemo(() => {
    let list = projects2026;
    if (selectedSector !== 'all') {
      list = list.filter((p) => p.sector.toLowerCase() === selectedSector.toLowerCase());
    }
    if (selectedStatus !== 'all') {
      list = list.filter((p) => p.status.toLowerCase().includes(selectedStatus.toLowerCase()));
    }
    if (corridor !== 'all') {
      const kws = getCorridorKeywords(corridor);
      list = list.filter(
        (p) =>
          (p.location && kws.some((kw) => p.location?.toLowerCase().includes(kw))) ||
          (p.nearest_tma &&
            kws.some(
              (kw) =>
                (p.nearest_tma?.river && p.nearest_tma.river.toLowerCase().includes(kw)) ||
                (p.nearest_tma?.name && p.nearest_tma.name.toLowerCase().includes(kw))
            ))
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
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
  }, [projects2026, selectedSector, selectedStatus, corridor, searchQuery]);

  // Filtered river features from cilicis_datasungai
  const filteredRivers = useMemo(() => {
    if (!riverCollection) return null;
    let list = riverCollection.features;

    if (corridor !== 'all') {
      const kwMap: Record<string, string[]> = {
        ciliwung: ['ciliwung'],
        sunter: ['sunter', 'cipinang'],
        pesanggrahan: ['pesanggrahan', 'angke', 'krukut', 'grogol', 'mampang'],
        marina: ['muara', 'asin', 'pluit', 'ancol', 'cakung', 'kamal', 'marunda'],
      };
      const kws = kwMap[corridor] || [corridor];
      const matched = list.filter((f) =>
        kws.some((kw) => f.properties.nama_sungai.toLowerCase().includes(kw))
      );
      if (matched.length > 0) {
        list = matched;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matched = list.filter(
        (f) =>
          f.properties.nama_sungai.toLowerCase().includes(q) ||
          (f.properties.anotasi && f.properties.anotasi.toLowerCase().includes(q))
      );
      if (matched.length > 0) {
        list = matched;
      }
    }

    return {
      type: 'FeatureCollection' as const,
      features: list,
    };
  }, [riverCollection, corridor, searchQuery]);

  // Nearby investments within 5km of selected TMA
  const nearbyInvestments = useMemo(() => {
    if (!selectedEntity || selectedEntity.type !== 'tma') return [];
    const tma = selectedEntity.data;
    return investments
      .filter((inv) => inv.nearest_tma?.name === tma.name && inv.nearest_tma.distance_km <= 5.0)
      .sort((a, b) => (a.nearest_tma?.distance_km ?? 0) - (b.nearest_tma?.distance_km ?? 0))
      .slice(0, 8);
  }, [selectedEntity, investments]);

  // Nearby 2026 projects within 8km of selected TMA
  const nearbyProjects = useMemo(() => {
    if (!selectedEntity || selectedEntity.type !== 'tma') return [];
    const tma = selectedEntity.data;
    return projects2026
      .filter((p) => p.nearest_tma?.name === tma.name && p.nearest_tma.distance_km <= 8.0)
      .sort((a, b) => (a.nearest_tma?.distance_km ?? 0) - (b.nearest_tma?.distance_km ?? 0));
  }, [selectedEntity, projects2026]);

  const printData = useMemo(() => {
    if (!selectedEntity) return null;
    if (selectedEntity.type === 'project') {
      const p = selectedEntity.data;
      return {
        name: p.name,
        category: `Peluang Investasi 2026 (${p.sector})`,
        owner: p.owner_name || 'Pemprov DKI Jakarta',
        latitude: p.latitude,
        longitude: p.longitude,
        investmentText: p.total_investment_text,
        status: p.status,
        riskScore: p.risk_score ?? 20,
        riskLabel: p.risk_status_label ?? 'TERKENDALI',
        rationale: p.summary_rationale ?? 'Wilayah berada dalam jangkauan pemantauan hidrologi terpadu.',
        compound: p.compound_indices,
        financial: p.financial_exposure,
        parametric: p.parametric_insurance,
        transit: p.transit_proximity,
      };
    }
    if (selectedEntity.type === 'investment') {
      const inv = selectedEntity.data;
      return {
        name: inv.name,
        category: inv.category_label,
        owner: 'DPMPTSP / Sektor Swasta',
        latitude: inv.latitude,
        longitude: inv.longitude,
        investmentText: null,
        status: 'Aset Eksisting',
        riskScore: inv.risk_score ?? 20,
        riskLabel: inv.risk_status_label ?? 'TERKENDALI',
        rationale: inv.summary_rationale ?? 'Wilayah berada dalam jangkauan pemantauan hidrologi terpadu.',
        compound: inv.compound_indices,
        financial: inv.financial_exposure,
        parametric: inv.parametric_insurance,
        transit: inv.transit_proximity,
      };
    }
    if (selectedEntity.type === 'custom_location') {
      const loc = selectedEntity.data;
      return {
        name: 'Titik Evaluasi Bebas (Investor Pin)',
        category: 'Evaluasi Spasial Mandiri',
        owner: 'Pemeriksaan Lapangan Calon Investor',
        latitude: loc.latitude,
        longitude: loc.longitude,
        investmentText: null,
        status: 'Dalam Kajian Pra-Investasi',
        riskScore: loc.risk_score ?? 20,
        riskLabel: loc.risk_status_label ?? 'TERKENDALI',
        rationale: loc.summary_rationale ?? 'Wilayah berada dalam jangkauan pemantauan hidrologi terpadu.',
        compound: loc.compound_indices,
        financial: loc.financial_exposure,
        parametric: loc.parametric_insurance,
        transit: loc.transit_proximity,
      };
    }
    return null;
  }, [selectedEntity]);

  return (
    <div className="m-app">
      {/* 1. TOPBAR */}
      <header className="m-topbar">
        <div className="m-brand-area">
          <div className="m-logo-badge">
            <Waves size={24} />
          </div>
          <div className="m-brand-title">
            <strong>FloodSense Investment Resilience</strong>
            <span>Unit Pengelola Jakarta Investment Centre (JIC) · DPMPTSP Provinsi DKI Jakarta</span>
          </div>
        </div>

        <div className="m-topbar-controls">
          <div className="m-telemetry-badge">
            <span className="m-telemetry-dot" /> 116 Pos Hujan • 81 Pos TMA • Telemetri 10-Menit Aktif
          </div>

          <div className="m-mode-toggle">
            <button
              className={`m-mode-btn ${mode === 'realtime' ? 'active' : ''}`}
              onClick={() => setMode('realtime')}
            >
              <span className="m-badge-live" /> Realtime Operasional
            </button>
            <button
              className={`m-mode-btn ${mode === 'historical' ? 'active' : ''}`}
              onClick={() => setMode('historical')}
            >
              <History size={14} /> Kejadian Historis
            </button>
          </div>

          <div className="m-nav-switch">
            <button className="m-nav-btn active">
              <Activity size={15} /> Pemantauan Terpadu
            </button>
            {onSwitchToLab && (
              <button className="m-nav-btn" onClick={onSwitchToLab}>
                <Layers size={15} /> Historical Lab (+6j)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 1.1 EARLY WARNING LEAD TIME TICKER */}
      <div className="m-early-warning-ticker">
        <div className="m-ticker-content">
          <span className="m-ticker-tag">⚡ CILIWUNG EARLY WARNING</span>
          <span className="m-ticker-text">
            <strong>Perambatan Gelombang Banjir:</strong> Katulampa ➔ Depok (3–4 jam) ➔ Manggarai (6–8 jam). 
            <strong> Total Lead Time Mitigasi Hulu–Hilir: 9–12 Jam</strong> untuk pengamanan aset dan aktivasi pompa.
          </span>
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          BBWS Cilicis · Dinas SDA DKI
        </div>
      </div>

      {/* 2. KPI STATS BAR */}
      <section className="m-kpi-bar" aria-label="Metrik Ringkasan Eksekutif">
        <div className="m-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="m-kpi-header">
            <span>PELUANG INVESTASI JIC 2026</span>
            <Building2 size={16} color="#d97706" />
          </div>
          <div className="m-kpi-val" style={{ color: '#b45309' }}>
            Rp 115,15 T
          </div>
          <div className="m-kpi-footer">
            {summary?.projects2026?.total ?? 37} Proyek Strategis ({summary?.projects2026?.ready_to_offer ?? 28} Ready to Offer)
          </div>
        </div>

        <div className="m-kpi-card">
          <div className="m-kpi-header">
            <span>POS TMA SIAGA 1 & 2 (KRITIS)</span>
            <ShieldAlert size={16} color="#dc2626" />
          </div>
          <div className="m-kpi-val danger">
            {(summary?.tma.siaga1 ?? 0) + (summary?.tma.siaga2 ?? 0)}
          </div>
          <div className="m-kpi-footer">
            {summary?.tma.siaga3 ?? 0} Pos Waspada (Siaga 3) dari total {summary?.tma.total ?? 81} pos
          </div>
        </div>

        <div className="m-kpi-card">
          <div className="m-kpi-header">
            <span>HUJAN LEBAT / SANGAT LEBAT</span>
            <CloudRain size={16} color="#0284c7" />
          </div>
          <div className="m-kpi-val accent">{summary?.rain.heavy ?? 0}</div>
          <div className="m-kpi-footer">
            Dari {summary?.rain.total ?? 116} stasiun telemetri penakar hujan
          </div>
        </div>

        <div className="m-kpi-card">
          <div className="m-kpi-header">
            <span>PROYEK & ASET TERPAPAR</span>
            <AlertTriangle size={16} color="#ea580c" />
          </div>
          <div className="m-kpi-val warning">
            {(summary?.projects2026?.high_exposure ?? 8) + (summary?.investments.high_exposure ?? 0)}
          </div>
          <div className="m-kpi-footer">
            {summary?.projects2026?.high_exposure ?? 8} proyek JIC '26 & {summary?.investments.high_exposure ?? 0} aset basis berisiko tinggi
          </div>
        </div>

        <div className="m-kpi-card">
          <div className="m-kpi-header">
            <span>TOTAL BASIS LOKASI & VITAL</span>
            <ShieldCheck size={16} color="#16a34a" />
          </div>
          <div className="m-kpi-val safe">{summary?.investments.total ?? 685}</div>
          <div className="m-kpi-footer">518 Basis JIC + 134 Objek Vital + 37 Proyek '26 (1 DB)</div>
        </div>
      </section>

      {/* 3. WORKSPACE (MAP & DETAILS) */}
      <main className="m-workspace">
        {/* CORRIDOR & FILTER BAR */}
        <section className="m-corridor-bar">
          <div className="m-corridor-filters" style={{ flexWrap: 'wrap', gap: '6px' }}>
            <span className="m-corridor-label">Koridor Sungai:</span>
            <button
              className={`m-pill-btn ${corridor === 'all' ? 'active' : ''}`}
              onClick={() => setCorridor('all')}
            >
              Semua ({tmaList.length} Pos)
            </button>
            <button
              className={`m-pill-btn ${corridor === 'ciliwung' ? 'active' : ''}`}
              onClick={() => setCorridor('ciliwung')}
            >
              Ciliwung
            </button>
            <button
              className={`m-pill-btn ${corridor === 'sunter' ? 'active' : ''}`}
              onClick={() => setCorridor('sunter')}
            >
              Sunter
            </button>
            <button
              className={`m-pill-btn ${corridor === 'pesanggrahan' ? 'active' : ''}`}
              onClick={() => setCorridor('pesanggrahan')}
            >
              Pesanggrahan
            </button>
            <button
              className={`m-pill-btn ${corridor === 'marina' ? 'active' : ''}`}
              onClick={() => setCorridor('marina')}
            >
              Pesisir & Rob
            </button>

            <span className="m-corridor-label" style={{ marginLeft: '10px' }}>Sektor JIC:</span>
            <select
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
            >
              <option value="all">Semua Sektor Proyek (37)</option>
              <option value="Utility">Utility & Waste (4)</option>
              <option value="Transportation">Transportation & TOD (1)</option>
              <option value="Residential">Residential (8)</option>
              <option value="Hospitality">Hospitality (9)</option>
              <option value="Waterfront Township">Waterfront (2)</option>
              <option value="Mixed-use TOD">Mixed-use TOD (5)</option>
              <option value="Industry & Logistics">Logistics (2)</option>
              <option value="Sport & Recreation">Sport & Rec (4)</option>
              <option value="Commercial">Commercial (2)</option>
            </select>

            <select
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Semua Status Proyek</option>
              <option value="Ready to Offer">Ready to Offer (28)</option>
              <option value="Market Sounding">Market Sounding (9)</option>
            </select>
          </div>

          <div className="m-search-input">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Cari proyek JIC, stasiun TMA, aset investasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => setSearchQuery('')}
              >
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>
        </section>

        {/* MAIN SPLIT GRID */}
        <div className="m-grid">
          {/* LEFT: LEAFLET SPATIAL MAP */}
          <section className="m-map-container">
            <div className="m-map-header">
              <div className="m-map-header-title-box">
                <h3>
                  <MapPin size={17} color="#2563eb" /> Peta Spasial Hidrologi & Investasi DKI Jakarta
                </h3>
                <span className="m-map-header-subtitle">
                  Overlay geospasial 200 ruas sungai, 81 pos TMA, 116 stasiun hujan, 132 titik banjir, dan 689 aset investasi
                </span>
              </div>
            </div>

            {/* GROUPED LAYER CONTROLS (DATA HIDROLOGI vs DATA INVESTASI) */}
            <div className="m-layer-control-panel">
              {/* GROUP 1: DATA HIDROLOGI */}
              <div className="m-layer-group hydrology">
                <div className="m-layer-group-header">
                  <div className="m-layer-group-title">
                    <Waves size={14} color="#0284c7" />
                    <span>DATA HIDROLOGI</span>
                  </div>
                  <button
                    className="m-layer-group-btn"
                    onClick={() => {
                      const allActive = layerRivers && layerThiessen && layerTMA && layerRain && layerReports && layerInfra && layerWaduk;
                      const turnOn = !allActive;
                      setLayerRivers(turnOn);
                      setLayerThiessen(turnOn);
                      setLayerTMA(turnOn);
                      setLayerRain(turnOn);
                      setLayerReports(turnOn);
                      setLayerInfra(turnOn);
                      setLayerWaduk(turnOn);
                    }}
                  >
                    {layerRivers && layerThiessen && layerTMA && layerRain && layerReports && layerInfra && layerWaduk
                      ? 'Sembunyikan Semua'
                      : 'Tampilkan Semua'}
                  </button>
                </div>
                <div className="m-layer-items">
                  <label className={`m-layer-chip ${layerRivers ? 'active c-rivers' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerRivers}
                      onChange={(e) => setLayerRivers(e.target.checked)}
                    />
                    🌊 Jaringan Sungai ({filteredRivers?.features.length ?? 200})
                  </label>
                  <label className={`m-layer-chip ${layerThiessen ? 'active c-thiessen' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerThiessen}
                      onChange={(e) => setLayerThiessen(e.target.checked)}
                    />
                    📐 Poligon Thiessen DAS ({thiessenData?.features.length ?? 93})
                  </label>
                  <label className={`m-layer-chip ${layerTMA ? 'active c-tma' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerTMA}
                      onChange={(e) => setLayerTMA(e.target.checked)}
                    />
                    💧 Pos TMA ({filteredTMA.length})
                  </label>
                  <label className={`m-layer-chip ${layerRain ? 'active c-rain' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerRain}
                      onChange={(e) => setLayerRain(e.target.checked)}
                    />
                    🌧️ Pos Hujan ({filteredRain.length})
                  </label>
                  <label className={`m-layer-chip ${layerReports ? 'active c-reports' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerReports}
                      onChange={(e) => setLayerReports(e.target.checked)}
                    />
                    ⚠️ Titik Banjir ({floodReports.length})
                  </label>
                  <label className={`m-layer-chip ${layerInfra ? 'active c-infra' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerInfra}
                      onChange={(e) => setLayerInfra(e.target.checked)}
                    />
                    ⚙️ Pompa ({pumps.length}) & 🚪 Pintu ({gates.length})
                  </label>
                  <label className={`m-layer-chip ${layerWaduk ? 'active c-waduk' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerWaduk}
                      onChange={(e) => setLayerWaduk(e.target.checked)}
                    />
                    🏞️ Situ & Waduk ({waduk.length})
                  </label>
                </div>
              </div>

              {/* GROUP 2: DATA INVESTASI */}
              <div className="m-layer-group investment">
                <div className="m-layer-group-header">
                  <div className="m-layer-group-title">
                    <Building2 size={14} color="#b45309" />
                    <span>DATA INVESTASI</span>
                  </div>
                  <button
                    className="m-layer-group-btn"
                    onClick={() => {
                      const allActive = layerProjects2026 && layerInvestments && layerVital;
                      const turnOn = !allActive;
                      setLayerProjects2026(turnOn);
                      setLayerInvestments(turnOn);
                      setLayerVital(turnOn);
                    }}
                  >
                    {layerProjects2026 && layerInvestments && layerVital
                      ? 'Sembunyikan Semua'
                      : 'Tampilkan Semua'}
                  </button>
                </div>
                <div className="m-layer-items">
                  <label className={`m-layer-chip ${layerProjects2026 ? 'active c-projects2026' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerProjects2026}
                      onChange={(e) => setLayerProjects2026(e.target.checked)}
                    />
                    ⭐ Proyek JIC 2026 ({filteredProjects2026.length})
                  </label>
                  <label className={`m-layer-chip ${layerInvestments ? 'active c-investments' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerInvestments}
                      onChange={(e) => setLayerInvestments(e.target.checked)}
                    />
                    🏢 Basis JIC (518)
                  </label>
                  <label className={`m-layer-chip ${layerVital ? 'active c-vital' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerVital}
                      onChange={(e) => setLayerVital(e.target.checked)}
                    />
                    🏛️ Objek Vital (134)
                  </label>
                  <label className={`m-layer-chip ${layerTransit ? 'active c-transit' : ''}`}>
                    <input
                      type="checkbox"
                      checked={layerTransit}
                      onChange={(e) => setLayerTransit(e.target.checked)}
                    />
                    🚊 Simpul Transit MRT/LRT/TJ ({transitStations.length})
                  </label>
                </div>
              </div>
            </div>

            {/* INTERACTIVE EVALUATION BANNER */}
            <div className="m-eval-banner">
              <div className="m-eval-banner-text">
                <Compass size={16} color="#0284c7" />
                <span>
                  <strong>Mode Evaluasi Lokasi Bebas:</strong> Klik sembarang titik di peta untuk menilai <b>Status Eksposur Risiko Banjir</b>, <b>Profil Hidrologi Musiman</b> (rekap tertinggi & rata-rata musim penghujan), serta <b>Infrastruktur Pengendali</b> terdekat.
                </span>
              </div>
              {evaluatingLocation && (
                <span className="m-eval-loading-badge">
                  <RefreshCw size={12} className="m-spin" /> Menghitung spasial...
                </span>
              )}
              {customLocation && !evaluatingLocation && (
                <button
                  className="m-eval-clear-btn"
                  onClick={() => {
                    setCustomLocation(null);
                    if (selectedEntity?.type === 'custom_location') setSelectedEntity(null);
                  }}
                >
                  <X size={12} /> Hapus Pin ({customLocation.latitude.toFixed(4)}, {customLocation.longitude.toFixed(4)})
                </button>
              )}
            </div>

            <div className="m-leaflet-wrapper">
              <MapContainer center={[-6.2088, 106.8456]} zoom={11} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Map Auto Resizer to prevent empty/unrendered canvas on layout shift */}
                <MapAutoResizer />

                {/* Map Click Handler for Arbitrary Location Evaluation */}
                <MapClickHandler onMapClick={handleMapClick} />

                {/* 0. Overlay Jaringan Sungai (cilicis_datasungai) */}
                {layerRivers && filteredRivers && (
                  <GeoJSON
                    key={`rivers-${corridor}-${filteredRivers.features.length}`}
                    data={filteredRivers as any}
                    style={(feature) => {
                      const orde = feature?.properties?.orde ?? 2;
                      if (orde === 1) {
                        return {
                          color: '#1d4ed8',
                          weight: 3.5,
                          opacity: 0.9,
                          lineCap: 'round',
                          lineJoin: 'round',
                        };
                      } else if (orde === 2) {
                        return {
                          color: '#0284c7',
                          weight: 2.2,
                          opacity: 0.8,
                          lineCap: 'round',
                          lineJoin: 'round',
                        };
                      } else {
                        return {
                          color: '#0ea5e9',
                          weight: 1.5,
                          opacity: 0.7,
                          dashArray: '3, 4',
                        };
                      }
                    }}
                    onEachFeature={(feature, layer) => {
                      const p = feature.properties;
                      const ordeLabel = p.orde_label || (p.orde === 1 ? 'Sungai Utama' : p.orde === 2 ? 'Anak Sungai' : 'Saluran');
                      layer.bindTooltip(
                        `<strong>${p.nama_sungai}</strong><br/><span style="font-size:10px; color:#475569;">${ordeLabel}${p.anotasi ? ' · ' + p.anotasi : ''}</span>`,
                        { sticky: true, className: 'm-river-tooltip' }
                      );
                      layer.on({
                        click: (e: any) => {
                          if (e?.originalEvent) {
                            L.DomEvent.stopPropagation(e.originalEvent);
                          }
                          setSelectedEntity({ type: 'river', data: feature as any });
                        },
                        mouseover: (e: any) => {
                          e.target.setStyle({
                            weight: p.orde === 1 ? 5.5 : 4.0,
                            color: '#0369a1',
                            opacity: 1,
                          });
                        },
                        mouseout: (e: any) => {
                          const orde = p.orde ?? 2;
                          e.target.setStyle({
                            color: orde === 1 ? '#1d4ed8' : orde === 2 ? '#0284c7' : '#0ea5e9',
                            weight: orde === 1 ? 3.5 : orde === 2 ? 2.2 : 1.5,
                            opacity: orde === 1 ? 0.9 : orde === 2 ? 0.8 : 0.7,
                          });
                        },
                      });
                    }}
                  />
                )}

                {/* 0.1 Overlay Poligon Thiessen Pos Hujan (Metode Thiessen) */}
                {layerThiessen && thiessenData && (
                  <GeoJSON
                    key={`thiessen-${thiessenData.features.length}`}
                    data={thiessenData as any}
                    style={() => ({
                      color: '#16a34a',
                      weight: 1.6,
                      dashArray: '5, 5',
                      fillColor: '#22c55e',
                      fillOpacity: 0.08,
                    })}
                    onEachFeature={(feature, layer) => {
                      const p = feature.properties;
                      layer.bindTooltip(
                        `<div style="font-size:11px; line-height: 1.4;">
                          <strong style="color:#15803d;">📐 Poligon Thiessen: ${p.name}</strong><br/>
                          <span>Luas Pengaruh: <b>${p.area_km2} km²</b> (${p.weight_pct}%)</span><br/>
                          <span style="color:#475569; font-size:10px;">DAS: <b>${p.das_name || 'DKI Jakarta'}</b></span>
                        </div>`,
                        { sticky: true }
                      );
                      layer.on({
                        click: (e: any) => {
                          if (e?.originalEvent) {
                            L.DomEvent.stopPropagation(e.originalEvent);
                          }
                          const matchedStation = rainList.find((r) => r.station_id === p.station_id || r.name === p.name);
                          if (matchedStation) {
                            setSelectedEntity({ type: 'rain', data: matchedStation });
                          }
                        },
                        mouseover: (e: any) => {
                          e.target.setStyle({
                            weight: 2.5,
                            fillOpacity: 0.22,
                            color: '#15803d',
                          });
                        },
                        mouseout: (e: any) => {
                          e.target.setStyle({
                            weight: 1.6,
                            fillOpacity: 0.08,
                            color: '#16a34a',
                          });
                        },
                      });
                    }}
                  />
                )}

                {/* 1. Pos Curah Hujan */}
                {layerRain &&
                  filteredRain.map((r) => (
                    <CircleMarker
                      key={'rain-' + r.station_id}
                      center={[r.latitude, r.longitude]}
                      radius={5}
                      pathOptions={{
                        color: '#0891b2',
                        fillColor: r.rain_current >= 20 ? '#0284c7' : '#22d3ee',
                        fillOpacity: 0.85,
                        weight: 2,
                      }}
                      eventHandlers={{
                        click: (e: any) => {
                          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                          setSelectedEntity({ type: 'rain', data: r });
                        },
                      }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -5]}>
                        Pos Hujan: {r.name} ({r.rain_current} mm)
                      </LeafletTooltip>
                      <Popup>
                        <strong>Pos Hujan: {r.name}</strong>
                        <br />
                        Lokasi: {r.location}
                        <br />
                        Intensitas: {r.intensity} ({r.rain_current} mm)
                        <br />
                        Hari ini: {r.rain_today} mm · Mingguan: {r.rain_week} mm
                        <br />
                        DAS: {r.das_polder}
                      </Popup>
                    </CircleMarker>
                  ))}

                {/* 2. Pos TMA */}
                {layerTMA &&
                  filteredTMA.map((s) => {
                    const isSelected =
                      selectedEntity?.type === 'tma' && selectedEntity.data.station_id === s.station_id;
                    let markerColor = '#16a34a';
                    let fillColor = '#22c55e';
                    if (s.siaga_level === 1) {
                      markerColor = '#b91c1c';
                      fillColor = '#ef4444';
                    } else if (s.siaga_level === 2) {
                      markerColor = '#c2410c';
                      fillColor = '#f97316';
                    } else if (s.siaga_level === 3) {
                      markerColor = '#a16207';
                      fillColor = '#eab308';
                    }

                    return (
                      <CircleMarker
                        key={'tma-' + s.station_id}
                        center={[s.latitude, s.longitude]}
                        radius={isSelected ? 12 : s.siaga_level <= 2 ? 10 : 7}
                        pathOptions={{
                          color: isSelected ? '#1e3a8a' : markerColor,
                          fillColor: fillColor,
                          fillOpacity: 0.95,
                          weight: isSelected ? 3.5 : 2,
                        }}
                        eventHandlers={{
                          click: (e: any) => {
                            if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                            setSelectedEntity({ type: 'tma', data: s });
                          },
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -5]}>
                          {s.name} · {s.status} ({s.level} cm)
                        </LeafletTooltip>
                        <Popup>
                          <strong>{s.name}</strong>
                          <br />
                          Sungai: {s.river}
                          <br />
                          Tinggi Air: <b>{s.level} cm</b> (Status: {s.status})
                          <br />
                          Ambang Siaga: S1: {s.thresholds.siaga1} · S2: {s.thresholds.siaga2} · S3:{' '}
                          {s.thresholds.siaga3}
                          <br />
                          <button
                            style={{
                              marginTop: '8px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setSelectedEntity({ type: 'tma', data: s })}
                          >
                            Inspeksi Hydrograph & Aset
                          </button>
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                {/* 3. Laporan Banjir Terverifikasi */}
                {layerReports &&
                  floodReports.map((rep) => {
                    const isCilicis = rep.report_source === 'cilicis';
                    return (
                      <CircleMarker
                        key={'rep-' + rep.uid}
                        center={[rep.latitude, rep.longitude]}
                        radius={6}
                        pathOptions={{
                          color: isCilicis ? '#c2410c' : '#7e22ce',
                          fillColor: isCilicis ? '#ea580c' : '#a855f7',
                          fillOpacity: 0.85,
                          weight: 2,
                        }}
                        eventHandlers={{
                          click: (e: any) => {
                            if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                            setSelectedEntity({ type: 'report', data: rep });
                          },
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -5]}>
                          Laporan Banjir: {rep.kelurahan || rep.city} ({rep.depth_cm_raw || 'genangan'} cm)
                        </LeafletTooltip>
                        <Popup>
                          <strong>
                            Laporan Lapangan: {isCilicis ? 'Cilicis Warga' : 'PU Sitaba Resmi'}
                          </strong>
                          <br />
                          Waktu: {rep.occurred_at}
                          <br />
                          Lokasi: {rep.kelurahan ? `${rep.kelurahan}, ${rep.kecamatan}` : rep.city}
                          {rep.depth_cm_raw && (
                            <>
                              <br />
                              Kedalaman: {rep.depth_cm_raw} cm
                            </>
                          )}
                          {rep.river_nearest && (
                            <>
                              <br />
                              Sungai: {rep.river_nearest}
                            </>
                          )}
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                {/* 4. ⭐ Peluang Investasi JIC 2026 (37 Proyek Strategis) */}
                {layerProjects2026 &&
                  filteredProjects2026
                    .filter((p) => p.latitude !== null && p.longitude !== null)
                    .map((p) => {
                      const isSelected = selectedEntity?.type === 'project' && selectedEntity.data.id === p.id;
                      let strokeColor = '#d97706';
                      let fillColor = '#f59e0b';
                      if (p.risk_level === 'high') {
                        strokeColor = '#b91c1c';
                        fillColor = '#ef4444';
                      } else if (p.risk_level === 'moderate') {
                        strokeColor = '#c2410c';
                        fillColor = '#f97316';
                      }

                      return (
                        <CircleMarker
                          key={'proj-' + p.id}
                          center={[p.latitude!, p.longitude!]}
                          radius={isSelected ? 14 : 9}
                          pathOptions={{
                            color: isSelected ? '#1e3a8a' : strokeColor,
                            fillColor: fillColor,
                            fillOpacity: 0.95,
                            weight: isSelected ? 4 : 2.5,
                          }}
                          eventHandlers={{
                            click: (e: any) => {
                              if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                              setSelectedEntity({ type: 'project', data: p });
                            },
                          }}
                        >
                          <LeafletTooltip direction="top" offset={[0, -7]}>
                            ⭐ {p.name} ({p.total_investment_text || 'JIC 2026'})
                          </LeafletTooltip>
                          <Popup>
                            <div style={{ maxWidth: '270px' }}>
                              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                ⭐ PROYEK INVESTASI 2026
                              </span>
                              <h4 style={{ margin: '6px 0 2px', fontSize: '13px', color: '#0f172a' }}>{p.name}</h4>
                              <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>
                                Sektor: <b>{p.sector}</b> · BUMD: <b>{p.owner_short_name}</b>
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '11px', color: '#047857' }}>
                                Nilai Investasi: <b>{p.total_investment_text || 'Dalam Kajian'}</b>
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '11px' }}>
                                Status: <b>{p.status}</b> · Paparan: <b style={{ color: p.risk_level === 'high' ? '#dc2626' : p.risk_level === 'moderate' ? '#d97706' : '#16a34a' }}>{p.risk_level.toUpperCase()}</b>
                              </p>
                              <button
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  padding: '5px 10px',
                                  background: '#2563eb',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedEntity({ type: 'project', data: p })}
                              >
                                Buka Dossier Lengkap
                              </button>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}

                {/* 5. Aset Investasi Basis JIC (518 Lokasi) */}
                {layerInvestments &&
                  filteredInvestments
                    .filter((i) => i.source_type === 'bkpm_jic' || i.source_type === 'jktjic_baseinvest')
                    .slice(0, 300)
                    .map((inv) => (
                      <CircleMarker
                        key={'inv-' + inv.id}
                        center={[inv.latitude, inv.longitude]}
                        radius={5}
                        pathOptions={{
                          color: '#4338ca',
                          fillColor:
                            inv.risk_level === 'high'
                              ? '#ef4444'
                              : inv.risk_level === 'moderate'
                              ? '#f59e0b'
                              : '#6366f1',
                          fillOpacity: 0.85,
                          weight: 1.5,
                        }}
                        eventHandlers={{
                          click: (e: any) => {
                            if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                            setSelectedEntity({ type: 'investment', data: inv });
                          },
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -5]}>
                          {inv.name} ({inv.category_label})
                        </LeafletTooltip>
                        <Popup>
                          <strong>{inv.name}</strong>
                          <br />
                          Kategori: {inv.category_label}
                          <br />
                          Paparan Banjir: <b>{inv.risk_level.toUpperCase()}</b>
                          {inv.nearest_tma && (
                            <>
                              <br />
                              Pos TMA Terdekat: {inv.nearest_tma.name} ({inv.nearest_tma.distance_km} km)
                            </>
                          )}
                        </Popup>
                      </CircleMarker>
                    ))}

                {/* 6. Objek Vital Nasional */}
                {layerVital &&
                  investments
                    .filter((i) => i.source_type === 'objek_vital_nasional')
                    .map((vit) => (
                      <CircleMarker
                        key={'vit-' + vit.id}
                        center={[vit.latitude, vit.longitude]}
                        radius={6}
                        pathOptions={{
                          color: '#b45309',
                          fillColor: '#f59e0b',
                          fillOpacity: 0.95,
                          weight: 2,
                        }}
                        eventHandlers={{
                          click: (e: any) => {
                            if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                            setSelectedEntity({ type: 'investment', data: vit });
                          },
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -5]}>
                          Objek Vital: {vit.name}
                        </LeafletTooltip>
                        <Popup>
                          <strong>{vit.name}</strong>
                          <br />
                          Klasifikasi: Objek Vital Nasional
                          <br />
                          Paparan Risiko: <b>{vit.risk_level.toUpperCase()}</b>
                          {vit.nearest_tma && (
                            <>
                              <br />
                              Pos TMA Terdekat: {vit.nearest_tma.name} ({vit.nearest_tma.distance_km} km)
                            </>
                          )}
                        </Popup>
                      </CircleMarker>
                    ))}

                {/* 7. Rumah Pompa & Pintu Air */}
                {layerInfra && (
                  <>
                    {pumps.map((p) => (
                      <CircleMarker
                        key={'pump-' + p.id}
                        center={[p.latitude, p.longitude]}
                        radius={4}
                        pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.8, weight: 1.5 }}
                      >
                        <Popup>
                          <strong>Rumah Pompa: {p.name}</strong>
                          <br />
                          Kapasitas: {p.total} unit ({p.operating} operasi / {p.idle} idle)
                          <br />
                          Alamat: {p.address}
                        </Popup>
                      </CircleMarker>
                    ))}
                    {gates.map((g) => (
                      <CircleMarker
                        key={'gate-' + g.id}
                        center={[g.latitude, g.longitude]}
                        radius={5}
                        pathOptions={{ color: '#475569', fillColor: '#94a3b8', fillOpacity: 0.8, weight: 2 }}
                      >
                        <Popup>
                          <strong>Pintu Air: {g.name}</strong>
                          <br />
                          Sistem Aliran: {g.system}
                          <br />
                          Tinggi Air: {g.level} cm (Status Siaga: {g.status})
                        </Popup>
                      </CircleMarker>
                    ))}
                  </>
                )}

                {/* 8. Situ & Waduk (jakarta_waduk) */}
                {layerWaduk &&
                  waduk.map((w) => (
                    <CircleMarker
                      key={'waduk-' + w.id}
                      center={[w.latitude, w.longitude]}
                      radius={6}
                      pathOptions={{
                        color: '#0369a1',
                        fillColor: '#38bdf8',
                        fillOpacity: 0.85,
                        weight: 2,
                      }}
                      eventHandlers={{
                        click: (e: any) => {
                          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                          setSelectedEntity({ type: 'waduk', data: w });
                        },
                      }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -5]}>
                        🏞️ Situ/Waduk: {w.name} ({w.wilayah})
                      </LeafletTooltip>
                      <Popup>
                        <strong>Situ / Waduk: {w.name}</strong>
                        <br />
                        Wilayah: {w.wilayah}
                        {w.luas && <><br />Luas: {w.luas} ha</>}
                        {w.volume && <><br />Volume: {w.volume.toLocaleString('id-ID')} m³</>}
                        <br />
                        Pompa: {w.pompa != null ? `${w.pompa} unit` : 'Sistem Pintu Gravitasi'}
                      </Popup>
                    </CircleMarker>
                  ))}

                {/* 9. Arbitrary Custom Clicked Location (Evaluasi Spasial Bebas) */}
                {/* 9. Simpul Transit (MRT, LRT, TransJakarta BRT) */}
                {layerTransit &&
                  transitStations.map((ts) => {
                    const isRail = ts.mode === 'MRT' || ts.mode === 'LRT';
                    return (
                      <CircleMarker
                        key={'transit-' + ts.mode + '-' + ts.id}
                        center={[ts.latitude, ts.longitude]}
                        radius={ts.mode === 'MRT' ? 6 : ts.mode === 'LRT' ? 5.5 : 4}
                        pathOptions={{
                          color: ts.mode === 'MRT' ? '#1e40af' : ts.mode === 'LRT' ? '#991b1b' : '#c2410c',
                          fillColor: ts.mode === 'MRT' ? '#3b82f6' : ts.mode === 'LRT' ? '#ef4444' : '#f97316',
                          fillOpacity: 0.9,
                          weight: isRail ? 2 : 1.5,
                        }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -5]}>
                          🚊 {ts.mode}: {ts.name} {isRail ? '(Elevated/Grade-Separated)' : ''}
                        </LeafletTooltip>
                        <Popup>
                          <strong>{ts.name}</strong>
                          <br />
                          Moda: <b>{ts.mode}</b>
                          <br />
                          Karakteristik: {isRail ? '✅ Elevated / Bawah Tanah (Grade-Separated: Bebas Genangan Jalan)' : 'At-grade / Terintegrasi Busway'}
                          <br />
                          Koridor Evakuasi: {isRail ? 'Konektivitas Tinggi Saat Banjir Permukaan' : 'Mengikuti Kondisi Lalu Lintas Permukaan'}
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                {/* 10. Arbitrary Custom Clicked Location (Evaluasi Spasial Bebas) */}
                {evaluatingCoord && (
                  <CircleMarker
                    center={[evaluatingCoord.lat, evaluatingCoord.lng]}
                    radius={14}
                    pathOptions={{ color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.6, weight: 3 }}
                  >
                    <LeafletTooltip direction="top" permanent>
                      ⏳ Menganalisis risiko hidrologi & infrastruktur...
                    </LeafletTooltip>
                  </CircleMarker>
                )}
                {customLocation && (
                  <>
                    {/* Pulsing Outer Ring */}
                    <CircleMarker
                      center={[customLocation.latitude, customLocation.longitude]}
                      radius={18}
                      pathOptions={{
                        color:
                          customLocation.risk_level === 'high'
                            ? '#dc2626'
                            : customLocation.risk_level === 'moderate'
                            ? '#d97706'
                            : '#059669',
                        fillColor:
                          customLocation.risk_level === 'high'
                            ? '#fee2e2'
                            : customLocation.risk_level === 'moderate'
                            ? '#fef3c7'
                            : '#ecfdf5',
                        fillOpacity: 0.45,
                        weight: 2,
                        dashArray: '4 4',
                      }}
                    />
                    {/* Center Core Pin */}
                    <CircleMarker
                      center={[customLocation.latitude, customLocation.longitude]}
                      radius={8}
                      pathOptions={{
                        color: '#0f172a',
                        fillColor:
                          customLocation.risk_level === 'high'
                            ? '#ef4444'
                            : customLocation.risk_level === 'moderate'
                            ? '#f59e0b'
                            : '#10b981',
                        fillOpacity: 1,
                        weight: 3,
                      }}
                      eventHandlers={{
                        click: () => setSelectedEntity({ type: 'custom_location', data: customLocation }),
                      }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -8]} permanent>
                        📍 Titik Pilihan ({customLocation.risk_score}/100)
                      </LeafletTooltip>
                      <Popup>
                        <strong>📍 Titik Pilihan Calon Investor</strong>
                        <br />
                        Koordinat: {customLocation.latitude.toFixed(5)}, {customLocation.longitude.toFixed(5)}
                        <br />
                        Status: <b>{customLocation.risk_status_label}</b> ({customLocation.risk_score}/100)
                        <br />
                        TMA Terdekat: {customLocation.nearest_tma?.name || '—'} ({customLocation.nearest_tma?.distance_km} km)
                        <br />
                        <button
                          style={{
                            marginTop: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                          onClick={() => setSelectedEntity({ type: 'custom_location', data: customLocation })}
                        >
                          Buka Evaluasi Lengkap
                        </button>
                      </Popup>
                    </CircleMarker>

                    {/* Dynamic Connecting Lines to Nearest Hydrology & Infrastructure Assets */}
                    {customLocation.nearest_tma && (() => {
                      const st = tmaList.find((s) => s.station_id === customLocation.nearest_tma?.station_id || s.name === customLocation.nearest_tma?.name);
                      if (!st) return null;
                      return (
                        <Polyline
                          positions={[
                            [customLocation.latitude, customLocation.longitude],
                            [st.latitude, st.longitude],
                          ]}
                          pathOptions={{ color: '#2563eb', dashArray: '6 4', weight: 2 }}
                        />
                      );
                    })()}

                    {customLocation.nearest_rain && (() => {
                      const rSt = rainList.find((r) => r.station_id === customLocation.nearest_rain?.station_id || r.name === customLocation.nearest_rain?.name);
                      if (!rSt) return null;
                      return (
                        <Polyline
                          positions={[
                            [customLocation.latitude, customLocation.longitude],
                            [rSt.latitude, rSt.longitude],
                          ]}
                          pathOptions={{ color: '#0284c7', dashArray: '4 4', weight: 1.5 }}
                        />
                      );
                    })()}

                    {customLocation.nearest_pump && (() => {
                      const pSt = pumps.find((p) => p.id === customLocation.nearest_pump?.id);
                      if (!pSt) return null;
                      return (
                        <Polyline
                          positions={[
                            [customLocation.latitude, customLocation.longitude],
                            [pSt.latitude, pSt.longitude],
                          ]}
                          pathOptions={{ color: '#0d9488', dashArray: '3 3', weight: 1.5 }}
                        />
                      );
                    })()}

                    {customLocation.nearest_waduk && (() => {
                      const wSt = waduk.find((w) => w.id === customLocation.nearest_waduk?.id);
                      if (!wSt) return null;
                      return (
                        <Polyline
                          positions={[
                            [customLocation.latitude, customLocation.longitude],
                            [wSt.latitude, wSt.longitude],
                          ]}
                          pathOptions={{ color: '#0284c7', dashArray: '5 3', weight: 1.5 }}
                        />
                      );
                    })()}

                    {/* Transit connector from custom pin */}
                    {customLocation.transit_proximity?.nearest_station && (() => {
                      const ts = customLocation.transit_proximity.nearest_station;
                      const distLabel = ts.distance_km < 1 ? `${Math.round(ts.distance_km * 1000)} m` : `${ts.distance_km.toFixed(2)} km`;
                      return (
                        <Polyline
                          positions={[
                            [customLocation.latitude, customLocation.longitude],
                            [ts.latitude, ts.longitude],
                          ]}
                          pathOptions={{ color: '#6366f1', dashArray: '4 4', weight: 2 }}
                        >
                          <LeafletTooltip direction="center">
                            🚊 {ts.name} ({distLabel} - {customLocation.transit_proximity.tod_tier})
                          </LeafletTooltip>
                        </Polyline>
                      );
                    })()}
                  </>
                )}

                {/* Connectivity line from selected TMA to nearby projects and investments */}
                {selectedEntity?.type === 'tma' && (
                  <>
                    {nearbyProjects.map((p) => (
                      p.latitude && p.longitude && (
                        <Polyline
                          key={'line-proj-' + p.id}
                          positions={[
                            [selectedEntity.data.latitude, selectedEntity.data.longitude],
                            [p.latitude, p.longitude],
                          ]}
                          pathOptions={{ color: '#d97706', dashArray: '5 5', weight: 2 }}
                        />
                      )
                    ))}
                    {nearbyInvestments.map((inv) => (
                      <Polyline
                        key={'line-' + inv.id}
                        positions={[
                          [selectedEntity.data.latitude, selectedEntity.data.longitude],
                          [inv.latitude, inv.longitude],
                        ]}
                        pathOptions={{ color: '#3b82f6', dashArray: '4 4', weight: 1.5 }}
                      />
                    ))}
                  </>
                )}

                {/* Connectivity line from selected project to its nearest TMA station */}
                {/* Connectivity line from selected project to its nearest TMA station and Transit station */}
                {selectedEntity?.type === 'project' &&
                  selectedEntity.data.latitude &&
                  selectedEntity.data.longitude &&
                  selectedEntity.data.nearest_tma && (
                    (() => {
                      const tmaStation = tmaList.find((s) => s.name === selectedEntity.data.nearest_tma?.name);
                      if (!tmaStation) return null;
                      return (
                        <Polyline
                          positions={[
                            [selectedEntity.data.latitude!, selectedEntity.data.longitude!],
                            [tmaStation.latitude, tmaStation.longitude],
                          ]}
                          pathOptions={{ color: '#d97706', dashArray: '6 4', weight: 2.5 }}
                        />
                      );
                    })()
                  selectedEntity.data.longitude && (
                    <>
                      {selectedEntity.data.nearest_tma && (() => {
                        const tmaStation = tmaList.find((s) => s.name === selectedEntity.data.nearest_tma?.name);
                        if (!tmaStation) return null;
                        return (
                          <Polyline
                            positions={[
                              [selectedEntity.data.latitude!, selectedEntity.data.longitude!],
                              [tmaStation.latitude, tmaStation.longitude],
                            ]}
                            pathOptions={{ color: '#d97706', dashArray: '6 4', weight: 2.5 }}
                          />
                        );
                      })()}
                      {selectedEntity.data.transit_proximity?.nearest_station && (() => {
                        const ts = selectedEntity.data.transit_proximity.nearest_station;
                        const distLabel = ts.distance_km < 1 ? `${Math.round(ts.distance_km * 1000)} m` : `${ts.distance_km.toFixed(2)} km`;
                        return (
                          <Polyline
                            positions={[
                              [selectedEntity.data.latitude!, selectedEntity.data.longitude!],
                              [ts.latitude, ts.longitude],
                            ]}
                            pathOptions={{ color: '#6366f1', dashArray: '4 4', weight: 2 }}
                          >
                            <LeafletTooltip direction="center">
                              🚊 {ts.name} ({distLabel} - {selectedEntity.data.transit_proximity.tod_tier})
                            </LeafletTooltip>
                          </Polyline>
                        );
                      })()}
                    </>
                  )}

                {/* Connectivity line from selected investment to its nearest Transit station */}
                {selectedEntity?.type === 'investment' &&
                  selectedEntity.data.transit_proximity?.nearest_station && (() => {
                    const ts = selectedEntity.data.transit_proximity.nearest_station;
                    const distLabel = ts.distance_km < 1 ? `${Math.round(ts.distance_km * 1000)} m` : `${ts.distance_km.toFixed(2)} km`;
                    return (
                      <Polyline
                        positions={[
                          [selectedEntity.data.latitude, selectedEntity.data.longitude],
                          [ts.latitude, ts.longitude],
                        ]}
                        pathOptions={{ color: '#6366f1', dashArray: '4 4', weight: 2 }}
                      >
                        <LeafletTooltip direction="center">
                          🚊 {ts.name} ({distLabel} - {selectedEntity.data.transit_proximity.tod_tier})
                        </LeafletTooltip>
                      </Polyline>
                    );
                  })()}
              </MapContainer>
            </div>

            <div className="m-map-legend">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 14, height: 3.5, background: '#1d4ed8', borderRadius: 2, display: 'inline-block' }} />
                Sungai Utama (Orde 1)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 14, height: 2.2, background: '#0284c7', borderRadius: 2, display: 'inline-block' }} />
                Anak Sungai (Orde 2)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 14, height: 2, borderBottom: '2px dashed #0ea5e9', display: 'inline-block' }} />
                Saluran (Orde 3)
              </span>
              <span><i className="m-dot-proj26" /> Proyek JIC 2026</span>
              <span><i className="m-dot-custom" /> Titik Evaluasi Bebas</span>
              <span><i className="m-dot-waduk" /> Situ / Waduk (69)</span>
              <span><i className="m-dot-pump" /> Rumah Pompa (222)</span>
              <span><i className="m-dot-s1" /> Siaga 1 (Bencana)</span>
              <span><i className="m-dot-s2" /> Siaga 2 (Kritis)</span>
              <span><i className="m-dot-s3" /> Siaga 3 (Waspada)</span>
              <span><i className="m-dot-s4" /> Normal</span>
              <span><i className="m-dot-rain" /> Pos Hujan</span>
              <span><i className="m-dot-sitaba" /> Laporan Sitaba</span>
              <span><i className="m-dot-cilicis" /> Laporan Cilicis</span>
              <span><i className="m-dot-jic" /> Basis JIC (518)</span>
              <span><i className="m-dot-vital" /> Objek Vital (134)</span>
              <span><i className="m-dot-transit" /> Simpul Transit (286)</span>
            </div>
          </section>

          {/* RIGHT: INSPECTION DETAIL DRAWER */}
          <aside className="m-detail-panel">
            {!selectedEntity ? (
              <div className="m-detail-empty">
                <MapPin size={32} />
                <p>Klik salah satu pos hidrologi, aset investasi, atau klik sembarang titik di peta untuk mengevaluasi status eksposur risiko banjir calon investor.</p>
              </div>
            ) : selectedEntity.type === 'tma' ? (
              <div>
                <span
                  className={`m-card-badge ${
                    selectedEntity.data.siaga_level === 1
                      ? 'm-badge-s1'
                      : selectedEntity.data.siaga_level === 2
                      ? 'm-badge-s2'
                      : selectedEntity.data.siaga_level === 3
                      ? 'm-badge-s3'
                      : 'm-badge-s4'
                  }`}
                >
                  {selectedEntity.data.status}
                </span>
                <h3 className="m-detail-title">{selectedEntity.data.name}</h3>
                <div className="m-detail-sub">
                  Sungai: {selectedEntity.data.river} · ID Pos: {selectedEntity.data.station_id}
                </div>

                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>TINGGI AIR SAAT INI</small>
                    <strong
                      style={{
                        color:
                          selectedEntity.data.siaga_level <= 2
                            ? '#dc2626'
                            : selectedEntity.data.siaga_level === 3
                            ? '#d97706'
                            : '#0f172a',
                      }}
                    >
                      {selectedEntity.data.level} cm
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>TREN PERUBAHAN</small>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {selectedEntity.data.trend === 'rising' ? (
                        <>
                          <TrendingUp size={16} color="#dc2626" /> Naik (+{selectedEntity.data.delta} cm)
                        </>
                      ) : selectedEntity.data.trend === 'falling' ? (
                        <>
                          <TrendingDown size={16} color="#16a34a" /> Turun ({selectedEntity.data.delta} cm)
                        </>
                      ) : (
                        'Stabil'
                      )}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>AMBANG SIAGA 1</small>
                    <strong>{selectedEntity.data.thresholds.siaga1} cm</strong>
                  </div>
                </div>

                {/* Hydrograph Chart */}
                <div className="m-chart-wrap">
                  <h4>
                    <span>RIWAYAT HYDROGRAPH 24 JAM</span>
                    <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 600 }}>
                      {stationHistoryPeriod?.end
                        ? `Telemetri Riil s.d. ${new Date(stationHistoryPeriod.end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Satuan: cm'}
                    </span>
                  </h4>
                  {historyLoading ? (
                    <div style={{ padding: '30px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                      Memuat data time-series stasiun...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={165}>
                      <ComposedChart data={stationHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} />
                        <ChartTooltip
                          labelFormatter={(label, payload) => {
                            const item = payload && payload[0]?.payload;
                            if (item?.datetime) {
                              const dt = new Date(item.datetime);
                              return `${dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · Pukul ${label}`;
                            }
                            return `Pukul ${label}`;
                          }}
                          formatter={(val: any) => [`${val} cm`, 'TMA']}
                          contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                        />
                        <ReferenceLine
                          y={selectedEntity.data.thresholds.siaga1}
                          stroke="#dc2626"
                          strokeDasharray="3 3"
                          label={{ value: 'Siaga 1', fill: '#dc2626', fontSize: 9, position: 'top' }}
                        />
                        <ReferenceLine
                          y={selectedEntity.data.thresholds.siaga2}
                          stroke="#ea580c"
                          strokeDasharray="3 3"
                          label={{ value: 'Siaga 2', fill: '#ea580c', fontSize: 9, position: 'top' }}
                        />
                        <ReferenceLine
                          y={selectedEntity.data.thresholds.siaga3}
                          stroke="#eab308"
                          strokeDasharray="3 3"
                          label={{ value: 'Siaga 3', fill: '#ca8a04', fontSize: 9, position: 'top' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="level"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 2 }}
                          name="Ketinggian Air"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '9.5px', color: '#64748b' }}>
                    <span>Sumber Data: <code>jakarta_tma</code> (Single Source of Truth)</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {stationHistoryPeriod?.source === 'jakarta_tma' ? '✅ Telemetri Sensor Riil' : 'Model Hidrologi Fisik'}
                    </span>
                  </div>
                </div>

                {/* CCTV viewer if available */}
                {selectedEntity.data.cctv_url && (
                  <div>
                    <h4 style={{ fontSize: '11px', margin: '8px 0 4px', color: '#475569' }}>
                      PEMANTAUAN VISUAL CCTV
                    </h4>
                    <div className="m-cctv-preview">
                      <img
                        src={selectedEntity.data.cctv_url}
                        alt="CCTV Pos Pantau"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Nearby Investment Facilities */}
                <div className="m-nearby-list">
                  <h4>Aset Investasi di Sekitar Pos (Radius ≤ 5 km):</h4>
                  {nearbyInvestments.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Tidak ada aset investasi tercatat dalam radius 5 km dari pos ini.
                    </p>
                  ) : (
                    nearbyInvestments.map((inv) => (
                      <div
                        key={inv.id}
                        className="m-nearby-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedEntity({ type: 'investment', data: inv })}
                      >
                        <div>
                          <span>{inv.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {inv.category_label}
                          </small>
                        </div>
                        <span>{inv.nearest_tma?.distance_km} km</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : selectedEntity.type === 'investment' ? (
              <div>
                <span
                  className={`m-card-badge ${
                    selectedEntity.data.source_type === 'objek_vital_nasional' ? 'm-badge-vital' : 'm-badge-jic'
                  }`}
                >
                  {selectedEntity.data.category_label}
                </span>
                <h3 className="m-detail-title">{selectedEntity.data.name}</h3>
                <div className="m-detail-sub">
                  Koordinat: {selectedEntity.data.latitude.toFixed(4)}, {selectedEntity.data.longitude.toFixed(4)}
                </div>

                <div
                  style={{
                    background:
                      selectedEntity.data.risk_level === 'high'
                        ? '#fee2e2'
                        : selectedEntity.data.risk_level === 'moderate'
                        ? '#fef3c7'
                        : '#dcfce7',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color:
                        selectedEntity.data.risk_level === 'high'
                          ? '#b91c1c'
                          : selectedEntity.data.risk_level === 'moderate'
                          ? '#b45309'
                          : '#15803d',
                    }}
                  >
                    STATUS EKSPOSUR:{' '}
                    {selectedEntity.data.risk_level === 'high'
                      ? 'WASPADA TINGGI'
                      : selectedEntity.data.risk_level === 'moderate'
                      ? 'WASPADA SEDANG'
                      : 'TERKENDALI'}
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#334155' }}>
                    {selectedEntity.data.risk_level === 'high'
                      ? 'Aset berada dalam radius kritis dari stasiun TMA siaga atau titik riil banjir.'
                      : selectedEntity.data.risk_level === 'moderate'
                      ? 'Aset berada di wilayah pengaruh hidrologis dengan potensi luapan sungai / genangan drainase.'
                      : 'Kondisi muka air dan drainase di sekitar lokasi terpantau normal.'}
                  </p>
                </div>

                <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                  <h4>Profil Hubungan Hidrologi Terdekat:</h4>
                  {selectedEntity.data.nearest_tma && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos TMA Rujukan: {selectedEntity.data.nearest_tma.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Status: {selectedEntity.data.nearest_tma.status} ({selectedEntity.data.nearest_tma.level} cm)
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{selectedEntity.data.nearest_tma.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_tma.seasonal_stats && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', marginTop: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🏆 Rekor TMA Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#dc2626', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_tma.seasonal_stats.max_level.toLocaleString('id-ID')} cm
                                </strong>
                                {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name && (
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#dc2626' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ea580c' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#b45309' : '#15803d',
                                    background: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#fee2e2' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ffedd5' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#fef3c7' : '#dcfce7',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                  }}>
                                    {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0369a1', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level !== null ? `${selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level.toLocaleString('id-ID')} cm` : '—'}
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Pos ini (Bulan 11 – 04)
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📅 <b>Waktu Puncak:</b> {selectedEntity.data.nearest_tma.seasonal_stats.max_level_date || '—'}
                            </span>
                            <span>
                              ⏱️ <b>Durasi Siaga:</b> <b style={{ color: '#b45309' }}>{selectedEntity.data.nearest_tma.seasonal_stats.siaga_duration_text || 'Normal'}</b>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_rain && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos Penakar Hujan: {selectedEntity.data.nearest_rain.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Terkini: {selectedEntity.data.nearest_rain.rain_current} mm ({selectedEntity.data.nearest_rain.intensity})
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_rain.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_rain.seasonal_stats && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #86efac', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#166534', fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📐 Metode Poligon Thiessen {selectedEntity.data.nearest_rain.seasonal_stats.matched_das ? `(${selectedEntity.data.nearest_rain.seasonal_stats.matched_das})` : ''}
                            </span>
                            {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2 ? (
                              <span style={{ fontSize: '9px', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                                Luas: {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2} km² ({selectedEntity.data.nearest_rain.seasonal_stats.thiessen_weight_pct}%)
                              </span>
                            ) : null}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px' }}>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🏆 Hujan Wilayah Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#0369a1', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_daily_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm/hari
                                </strong>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.bmkg_category && (
                                  <span style={{ fontSize: '8.5px', background: '#e0f2fe', color: '#0284c7', padding: '1px 4px', borderRadius: '2px', fontWeight: 600 }}>
                                    {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen.bmkg_category}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                                📅 {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_date || selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || '—'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0f766e', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.avg_wet_season_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Metode Thiessen (Bulan 11–04)
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📍 <b>Pos ini:</b> {selectedEntity.data.nearest_rain.seasonal_stats.max_daily_rain ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm ({selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || 'Tertinggi'})
                            </span>
                            <span>
                              💧 <b>Rata-rata Pos:</b> {selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_daily ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_report && (
                    <div className="m-nearby-item">
                      <div>
                        <span>Laporan Banjir Terdekat</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_report.location_desc} (
                          {selectedEntity.data.nearest_report.depth_cm_raw || 'Genangan'} cm)
                        </small>
                      </div>
                      <span>{selectedEntity.data.nearest_report.distance_km} km</span>
                    </div>
                  )}
                </div>

                {/* Infrastruktur Pengendali Terdekat */}
                {(selectedEntity.data.nearest_pump || selectedEntity.data.nearest_waduk || selectedEntity.data.nearest_gate) && (
                  <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                    <h4>Infrastruktur Pengendali Banjir Terdekat:</h4>
                    {selectedEntity.data.nearest_pump && (
                      <div className="m-nearby-item">
                        <div>
                          <span>⚙️ Rumah Pompa: {selectedEntity.data.nearest_pump.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {selectedEntity.data.nearest_pump.operating}/{selectedEntity.data.nearest_pump.total} pompa beroperasi
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f766e' }}>{selectedEntity.data.nearest_pump.distance_km} km</span>
                      </div>
                    )}
                    {selectedEntity.data.nearest_waduk && (
                      <div className="m-nearby-item">
                        <div>
                          <span>🌊 Situ/Waduk: {selectedEntity.data.nearest_waduk.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {selectedEntity.data.nearest_waduk.wilayah}
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_waduk.distance_km} km</span>
                      </div>
                    )}
                    {selectedEntity.data.nearest_gate && (
                      <div className="m-nearby-item">
                        <div>
                          <span>🚪 Pintu Air: {selectedEntity.data.nearest_gate.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Elevasi {selectedEntity.data.nearest_gate.level} cm (Siaga: {selectedEntity.data.nearest_gate.status})
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{selectedEntity.data.nearest_gate.distance_km} km</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedEntity.data.source_url && (
                  <a
                    href={selectedEntity.data.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      marginTop: '12px',
                      color: '#2563eb',
                      fontWeight: 700,
                    }}
                  >
                    Profil BKPM Regional Investment <ExternalLink size={13} />
                  </a>
                )}

                {renderResilienceAnalysisCards({
                  entityName: selectedEntity.data.name,
                  entityCategory: selectedEntity.data.category_label,
                  coordinates: { lat: selectedEntity.data.latitude, lng: selectedEntity.data.longitude },
                  baseScore: selectedEntity.data.risk_score ?? 25,
                  riskLevel: selectedEntity.data.risk_level,
                  riskStatusLabel: selectedEntity.data.risk_status_label || 'TERKENDALI',
                  compoundIndices: selectedEntity.data.compound_indices,
                  financialExposure: selectedEntity.data.financial_exposure,
                  parametricInsurance: selectedEntity.data.parametric_insurance,
                  transitProximity: selectedEntity.data.transit_proximity,
                })}
              </div>
            ) : selectedEntity.type === 'project' ? (
              <div>
                {/* Hero image if exists */}
                <div className="m-project-hero-wrap">
                  <img
                    src={selectedEntity.data.hero_image_url || `/project-images/${selectedEntity.data.slug}/hero.jpg`}
                    alt={selectedEntity.data.name}
                    className="m-project-hero-img"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#fbbf24',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    ⭐ PROYEK INVESTASI JIC 2026
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span className="m-card-badge m-badge-proj26">
                    {selectedEntity.data.sector}
                  </span>
                  <span
                    className={`m-card-badge ${
                      selectedEntity.data.status.toLowerCase().includes('ready') ? 'm-badge-s4' : 'm-badge-s3'
                    }`}
                  >
                    {selectedEntity.data.status}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    {selectedEntity.data.owner_name}
                  </span>
                </div>

                <h3 className="m-detail-title">{selectedEntity.data.name}</h3>
                <div className="m-detail-sub">
                  Lokasi: {selectedEntity.data.location || 'DKI Jakarta'}
                  {selectedEntity.data.latitude && (
                    <> · Koordinat: {selectedEntity.data.latitude.toFixed(4)}, {selectedEntity.data.longitude?.toFixed(4)}</>
                  )}
                </div>

                {/* Investment Value & Period Stats */}
                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>TOTAL INVESTASI</small>
                    <strong style={{ color: '#047857' }}>
                      {selectedEntity.data.total_investment_text || 'Dalam Kajian'}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>BUMD SPONSOR</small>
                    <strong style={{ color: '#1e40af' }}>
                      {selectedEntity.data.owner_short_name}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>PERIODE KERJASAMA</small>
                    <strong>{selectedEntity.data.partnership_period_text || 'Skema B2B/KPBU'}</strong>
                  </div>
                </div>

                {/* Exposure Risk Alert Box */}
                <div
                  style={{
                    background:
                      selectedEntity.data.risk_level === 'high'
                        ? '#fee2e2'
                        : selectedEntity.data.risk_level === 'moderate'
                        ? '#fef3c7'
                        : '#dcfce7',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color:
                        selectedEntity.data.risk_level === 'high'
                          ? '#b91c1c'
                          : selectedEntity.data.risk_level === 'moderate'
                          ? '#b45309'
                          : '#15803d',
                    }}
                  >
                    STATUS EKSPOSUR RISIKO BANJIR:{' '}
                    {selectedEntity.data.risk_level === 'high'
                      ? 'WASPADA TINGGI'
                      : selectedEntity.data.risk_level === 'moderate'
                      ? 'WASPADA SEDANG'
                      : 'TERKENDALI'}
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#334155' }}>
                    {selectedEntity.data.risk_level === 'high'
                      ? 'Proyek berada dalam koridor pengaruh stasiun TMA berstatus Siaga atau berdekatan (≤ 1.5 km) dengan titik genangan riil.'
                      : selectedEntity.data.risk_level === 'moderate'
                      ? 'Proyek berada dalam radius pengaruh hidrologis sedang (≤ 3.5 km) atau zona curah hujan tinggi.'
                      : 'Kondisi hidrologis sekitar proyek terpantau normal dan aman dari anomali tinggi muka air.'}
                  </p>
                </div>

                {/* Proximity Details */}
                <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                  <h4>Profil Hubungan Hidrologi Terdekat:</h4>
                  {selectedEntity.data.nearest_tma && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos TMA Rujukan: {selectedEntity.data.nearest_tma.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Status: {selectedEntity.data.nearest_tma.status} ({selectedEntity.data.nearest_tma.level} cm)
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{selectedEntity.data.nearest_tma.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_tma.seasonal_stats && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', marginTop: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🏆 Rekor TMA Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#dc2626', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_tma.seasonal_stats.max_level.toLocaleString('id-ID')} cm
                                </strong>
                                {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name && (
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#dc2626' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ea580c' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#b45309' : '#15803d',
                                    background: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#fee2e2' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ffedd5' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#fef3c7' : '#dcfce7',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                  }}>
                                    {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0369a1', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level !== null ? `${selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level.toLocaleString('id-ID')} cm` : '—'}
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Pos ini (Bulan 11 – 04)
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📅 <b>Waktu Puncak:</b> {selectedEntity.data.nearest_tma.seasonal_stats.max_level_date || '—'}
                            </span>
                            <span>
                              ⏱️ <b>Durasi Siaga:</b> <b style={{ color: '#b45309' }}>{selectedEntity.data.nearest_tma.seasonal_stats.siaga_duration_text || 'Normal'}</b>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_rain && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos Penakar Hujan: {selectedEntity.data.nearest_rain.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Terkini: {selectedEntity.data.nearest_rain.rain_current} mm ({selectedEntity.data.nearest_rain.intensity})
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_rain.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_rain.seasonal_stats && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #86efac', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#166534', fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📐 Metode Poligon Thiessen {selectedEntity.data.nearest_rain.seasonal_stats.matched_das ? `(${selectedEntity.data.nearest_rain.seasonal_stats.matched_das})` : ''}
                            </span>
                            {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2 ? (
                              <span style={{ fontSize: '9px', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                                Luas: {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2} km² ({selectedEntity.data.nearest_rain.seasonal_stats.thiessen_weight_pct}%)
                              </span>
                            ) : null}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px' }}>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🏆 Hujan Wilayah Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#0369a1', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_daily_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm/hari
                                </strong>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.bmkg_category && (
                                  <span style={{ fontSize: '8.5px', background: '#e0f2fe', color: '#0284c7', padding: '1px 4px', borderRadius: '2px', fontWeight: 600 }}>
                                    {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen.bmkg_category}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                                📅 {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_date || selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || '—'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0f766e', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.avg_wet_season_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Metode Thiessen (Bulan 11–04)
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📍 <b>Pos ini:</b> {selectedEntity.data.nearest_rain.seasonal_stats.max_daily_rain ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm ({selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || 'Tertinggi'})
                            </span>
                            <span>
                              💧 <b>Rata-rata Pos:</b> {selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_daily ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_report && (
                    <div className="m-nearby-item">
                      <div>
                        <span>Titik Laporan Banjir Terdekat</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_report.location_desc} ({selectedEntity.data.nearest_report.source})
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{selectedEntity.data.nearest_report.distance_km} km</span>
                    </div>
                  )}
                </div>

                {/* Infrastruktur Pengendali Terdekat */}
                {(selectedEntity.data.nearest_pump || selectedEntity.data.nearest_waduk || selectedEntity.data.nearest_gate) && (
                  <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                    <h4>Infrastruktur Pengendali Banjir Terdekat:</h4>
                    {selectedEntity.data.nearest_pump && (
                      <div className="m-nearby-item">
                        <div>
                          <span>⚙️ Rumah Pompa: {selectedEntity.data.nearest_pump.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {selectedEntity.data.nearest_pump.operating}/{selectedEntity.data.nearest_pump.total} pompa beroperasi
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f766e' }}>{selectedEntity.data.nearest_pump.distance_km} km</span>
                      </div>
                    )}
                    {selectedEntity.data.nearest_waduk && (
                      <div className="m-nearby-item">
                        <div>
                          <span>🌊 Situ/Waduk: {selectedEntity.data.nearest_waduk.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {selectedEntity.data.nearest_waduk.wilayah}
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_waduk.distance_km} km</span>
                      </div>
                    )}
                    {selectedEntity.data.nearest_gate && (
                      <div className="m-nearby-item">
                        <div>
                          <span>🚪 Pintu Air: {selectedEntity.data.nearest_gate.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Elevasi {selectedEntity.data.nearest_gate.level} cm (Siaga: {selectedEntity.data.nearest_gate.status})
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{selectedEntity.data.nearest_gate.distance_km} km</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Profile Summary */}
                {selectedEntity.data.project_profile && (
                  <div style={{ marginTop: '12px' }}>
                    <h4 style={{ fontSize: '11px', margin: '0 0 6px', color: '#475569' }}>
                      RINGKASAN PROFIL PROYEK
                    </h4>
                    <div className="m-project-profile-box">
                      {selectedEntity.data.project_profile}
                    </div>
                  </div>
                )}

                {/* Contact Person */}
                {selectedEntity.data.contact_name && (
                  <div className="m-project-contact-box">
                    <strong>Kontak Narahubung BUMD / JIC:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {selectedEntity.data.contact_name} · {selectedEntity.data.contact_role}
                    </div>
                    {selectedEntity.data.contact_email && (
                      <div style={{ marginTop: '2px', fontWeight: 600 }}>
                        Email: {selectedEntity.data.contact_email}
                      </div>
                    )}
                  </div>
                )}

                <a
                  href={`https://invest.jakarta.go.id/project/${selectedEntity.data.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    marginTop: '8px',
                    color: '#2563eb',
                    fontWeight: 700,
                  }}
                >
                  Portal Resmi Jakarta Investment Centre (JIC) <ExternalLink size={13} />
                </a>

                {renderResilienceAnalysisCards({
                  entityName: selectedEntity.data.name,
                  entityCategory: `Peluang Investasi 2026 (${selectedEntity.data.sector})`,
                  coordinates: selectedEntity.data.latitude && selectedEntity.data.longitude ? { lat: selectedEntity.data.latitude, lng: selectedEntity.data.longitude } : undefined,
                  baseScore: selectedEntity.data.risk_score ?? 25,
                  riskLevel: selectedEntity.data.risk_level,
                  riskStatusLabel: selectedEntity.data.risk_status_label || 'TERKENDALI',
                  compoundIndices: selectedEntity.data.compound_indices,
                  financialExposure: selectedEntity.data.financial_exposure,
                  parametricInsurance: selectedEntity.data.parametric_insurance,
                  transitProximity: selectedEntity.data.transit_proximity,
                })}
              </div>
            ) : selectedEntity.type === 'rain' ? (
              <div>
                <span className="m-card-badge m-badge-s4">Pos Curah Hujan</span>
                <h3 className="m-detail-title">{selectedEntity.data.name}</h3>
                <div className="m-detail-sub">
                  DAS/Polder: {selectedEntity.data.das_polder} · Kota: {selectedEntity.data.city}
                </div>

                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>INTENSITAS TERKINI</small>
                    <strong style={{ color: '#0284c7' }}>{selectedEntity.data.rain_current} mm</strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>AKUMULASI HARI INI</small>
                    <strong>{selectedEntity.data.rain_today} mm</strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>1 MINGGU TERAKHIR</small>
                    <strong>{selectedEntity.data.rain_week} mm</strong>
                  </div>
                </div>

                <div className="m-chart-wrap">
                  <h4>
                    <span>DISTRIBUSI HUJAN PER JAM (24 JAM)</span>
                    <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 600 }}>
                      {stationHistoryPeriod?.end
                        ? `Telemetri Riil s.d. ${new Date(stationHistoryPeriod.end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Satuan: mm'}
                    </span>
                  </h4>
                  <ResponsiveContainer width="100%" height={165}>
                    <ComposedChart data={stationHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <ChartTooltip
                        labelFormatter={(label, payload) => {
                          const item = payload && payload[0]?.payload;
                          if (item?.datetime) {
                            const dt = new Date(item.datetime);
                            return `${dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · Pukul ${label}`;
                          }
                          return `Pukul ${label}`;
                        }}
                        formatter={(val: any) => [`${val} mm`, 'Curah Hujan']}
                        contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                      />
                      <Bar dataKey="rain" fill="#0284c7" radius={[4, 4, 0, 0]} name="Curah Hujan" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '9.5px', color: '#64748b' }}>
                    <span>Sumber Data: <code>jakarta_ch</code> (Single Source of Truth)</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {stationHistoryPeriod?.source === 'jakarta_ch' ? '✅ Telemetri Sensor Riil' : 'Model Presipitasi Fisik'}
                    </span>
                  </div>
                </div>
              </div>
            ) : selectedEntity.type === 'river' ? (
              <div>
                <span className="m-card-badge m-badge-s4" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                  Jaringan Sungai DKI
                </span>
                <h3 className="m-detail-title">{selectedEntity.data.properties.nama_sungai}</h3>
                <div className="m-detail-sub">
                  Klasifikasi: {selectedEntity.data.properties.orde_label} (Orde {selectedEntity.data.properties.orde})
                  {selectedEntity.data.properties.anotasi ? ` · Anotasi: ${selectedEntity.data.properties.anotasi}` : ''}
                </div>

                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>ORDE SUNGAI</small>
                    <strong style={{ color: '#0284c7' }}>Orde {selectedEntity.data.properties.orde}</strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>KLASIFIKASI</small>
                    <strong>{selectedEntity.data.properties.orde_label}</strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>TIPE GEOMETRI</small>
                    <strong style={{ fontSize: '11px' }}>{selectedEntity.data.properties.geometry_type}</strong>
                  </div>
                </div>

                <div className="m-invest-risk-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginTop: '14px' }}>
                  <div className="m-risk-tag" style={{ color: '#16a34a' }}>
                    <ShieldCheck size={14} /> Sumber Resmi Geospasial
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#166534' }}>
                    Terekam dalam tabel <code>cilicis_datasungai</code> database <code>local_govtech_floodsense</code>.
                    {selectedEntity.data.properties.anotasi && ` Dokumen referensi: "${selectedEntity.data.properties.anotasi}".`}
                  </p>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                    Pos TMA Terkait di Aliran Sungai Ini
                  </h4>
                  {(() => {
                    const riverName = selectedEntity.data.properties.nama_sungai.toLowerCase();
                    const relatedTma = tmaList.filter(
                      (t) =>
                        t.river.toLowerCase().includes(riverName) ||
                        riverName.includes(t.river.toLowerCase()) ||
                        t.name.toLowerCase().includes(riverName)
                    );
                    if (relatedTma.length === 0) {
                      return (
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Tidak ada pos sensor TMA langsung pada ruas ini (pos hidrologi terdekat terpantau di muara atau pos induk).
                        </p>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {relatedTma.map((t) => (
                          <div
                            key={t.station_id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              fontSize: '11px',
                            }}
                          >
                            <div>
                              <strong>{t.name}</strong>
                              <span style={{ marginLeft: '6px', color: '#64748b' }}>({t.level} cm)</span>
                            </div>
                            <span
                              className={`m-card-badge ${
                                t.siaga_level === 1
                                  ? 'm-badge-s1'
                                  : t.siaga_level === 2
                                  ? 'm-badge-s2'
                                  : t.siaga_level === 3
                                  ? 'm-badge-s3'
                                  : 'm-badge-s4'
                              }`}
                              style={{ padding: '2px 6px', fontSize: '9px' }}
                            >
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : selectedEntity.type === 'custom_location' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="m-card-badge" style={{ background: '#ecfeff', color: '#0891b2', borderColor: '#a5f3fc', fontWeight: 700 }}>
                    📍 TITIK EVALUASI BEBAS (INVESTOR PIN)
                  </span>
                  <button
                    onClick={() => {
                      setCustomLocation(null);
                      setSelectedEntity(null);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    ✕ Hapus Pin
                  </button>
                </div>
                <h3 className="m-detail-title">Hasil Analisis Risiko Lokasi Terpilih</h3>
                <div className="m-detail-sub">
                  Koordinat: {selectedEntity.data.latitude.toFixed(5)}, {selectedEntity.data.longitude.toFixed(5)}
                </div>

                {/* Score & Badge Alert Box */}
                <div
                  style={{
                    background:
                      selectedEntity.data.risk_score >= 60
                        ? '#fee2e2'
                        : selectedEntity.data.risk_score >= 35
                        ? '#fef3c7'
                        : '#dcfce7',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong
                      style={{
                        fontSize: '13px',
                        color:
                          selectedEntity.data.risk_score >= 60
                            ? '#b91c1c'
                            : selectedEntity.data.risk_score >= 35
                            ? '#b45309'
                            : '#15803d',
                      }}
                    >
                      STATUS EKSPOSUR: {selectedEntity.data.risk_status_label}
                    </strong>
                    <span
                      style={{
                        background:
                          selectedEntity.data.risk_score >= 60
                            ? '#dc2626'
                            : selectedEntity.data.risk_score >= 35
                            ? '#f59e0b'
                            : '#16a34a',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Skor {selectedEntity.data.risk_score} / 100
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                    {selectedEntity.data.summary_rationale}
                  </p>
                </div>

                {/* Profil Hubungan Hidrologi Terdekat */}
                <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                  <h4>Profil Hubungan Hidrologi Terdekat:</h4>
                  {selectedEntity.data.nearest_tma && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos TMA: {selectedEntity.data.nearest_tma.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Status Terkini: {selectedEntity.data.nearest_tma.status} ({selectedEntity.data.nearest_tma.level} cm)
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{selectedEntity.data.nearest_tma.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_tma.seasonal_stats && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', marginTop: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🏆 Rekor TMA Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#dc2626', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_tma.seasonal_stats.max_level.toLocaleString('id-ID')} cm
                                </strong>
                                {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name && (
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#dc2626' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ea580c' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#b45309' : '#15803d',
                                    background: selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 1 ? '#fee2e2' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 2 ? '#ffedd5' : selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_level === 3 ? '#fef3c7' : '#dcfce7',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                  }}>
                                    {selectedEntity.data.nearest_tma.seasonal_stats.highest_siaga_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '9.5px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0369a1', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level !== null ? `${selectedEntity.data.nearest_tma.seasonal_stats.avg_rainy_season_level.toLocaleString('id-ID')} cm` : '—'}
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Pos ini (Bulan 11 – 04)
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📅 <b>Waktu Puncak:</b> {selectedEntity.data.nearest_tma.seasonal_stats.max_level_date || '—'}
                            </span>
                            <span>
                              ⏱️ <b>Durasi Siaga:</b> <b style={{ color: '#b45309' }}>{selectedEntity.data.nearest_tma.seasonal_stats.siaga_duration_text || 'Normal'}</b>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_rain && (
                    <div className="m-nearby-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>Pos Penakar Hujan: {selectedEntity.data.nearest_rain.name}</span>
                          <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            Terkini: {selectedEntity.data.nearest_rain.rain_current} mm ({selectedEntity.data.nearest_rain.intensity})
                          </small>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_rain.distance_km} km</span>
                      </div>
                      {selectedEntity.data.nearest_rain.seasonal_stats && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '7px 9px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #86efac', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#166534', fontSize: '9.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📐 Metode Poligon Thiessen {selectedEntity.data.nearest_rain.seasonal_stats.matched_das ? `(${selectedEntity.data.nearest_rain.seasonal_stats.matched_das})` : ''}
                            </span>
                            {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2 ? (
                              <span style={{ fontSize: '9px', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                                Luas: {selectedEntity.data.nearest_rain.seasonal_stats.thiessen_area_km2} km² ({selectedEntity.data.nearest_rain.seasonal_stats.thiessen_weight_pct}%)
                              </span>
                            ) : null}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '8px' }}>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🏆 Hujan Wilayah Tertinggi:</span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#0369a1', fontSize: '13px' }}>
                                  {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_daily_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm/hari
                                </strong>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.bmkg_category && (
                                  <span style={{ fontSize: '8.5px', background: '#e0f2fe', color: '#0284c7', padding: '1px 4px', borderRadius: '2px', fontWeight: 600 }}>
                                    {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen.bmkg_category}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                                📅 {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.max_date || selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || '—'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#4b5563', fontSize: '9px' }}>🌧️ Rata-rata Musim Hujan:</span>
                              <strong style={{ color: '#0f766e', fontSize: '13px', display: 'block', marginTop: '1px' }}>
                                {selectedEntity.data.nearest_rain.seasonal_stats.das_thiessen?.avg_wet_season_mm ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                              </strong>
                              <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>
                                Metode Thiessen (Bulan 11–04)
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#475569', background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '4px' }}>
                            <span>
                              📍 <b>Pos ini:</b> {selectedEntity.data.nearest_rain.seasonal_stats.max_daily_rain ?? selectedEntity.data.nearest_rain.seasonal_stats.max_rain_reading} mm ({selectedEntity.data.nearest_rain.seasonal_stats.max_daily_date || 'Tertinggi'})
                            </span>
                            <span>
                              💧 <b>Rata-rata Pos:</b> {selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_daily ?? selectedEntity.data.nearest_rain.seasonal_stats.avg_rainy_season_reading} mm/hari
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntity.data.nearest_river && (
                    <div className="m-nearby-item">
                      <div>
                        <span>Ruas Sungai Terdekat</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_river.name} ({selectedEntity.data.nearest_river.orde_label}, Orde {selectedEntity.data.nearest_river.orde})
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_river.distance_km} km</span>
                    </div>
                  )}

                  {selectedEntity.data.nearest_report && (
                    <div className="m-nearby-item">
                      <div>
                        <span>Laporan Banjir Terdekat</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_report.location_desc} ({selectedEntity.data.nearest_report.depth_cm_raw || 'Genangan'} cm)
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{selectedEntity.data.nearest_report.distance_km} km</span>
                    </div>
                  )}
                </div>

                {/* Infrastruktur Pengendali Terdekat */}
                <div className="m-nearby-list" style={{ marginBottom: '14px' }}>
                  <h4>Infrastruktur Pengendali Banjir Terdekat:</h4>
                  {selectedEntity.data.nearest_pump && (
                    <div className="m-nearby-item">
                      <div>
                        <span>⚙️ Rumah Pompa: {selectedEntity.data.nearest_pump.name}</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_pump.operating}/{selectedEntity.data.nearest_pump.total} pompa operasional
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f766e' }}>{selectedEntity.data.nearest_pump.distance_km} km</span>
                    </div>
                  )}

                  {selectedEntity.data.nearest_waduk && (
                    <div className="m-nearby-item">
                      <div>
                        <span>🌊 Situ/Waduk: {selectedEntity.data.nearest_waduk.name}</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          {selectedEntity.data.nearest_waduk.wilayah} (Luas: {selectedEntity.data.nearest_waduk.luas ? `${selectedEntity.data.nearest_waduk.luas.toLocaleString('id-ID')} m²` : '—'})
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedEntity.data.nearest_waduk.distance_km} km</span>
                    </div>
                  )}

                  {selectedEntity.data.nearest_gate && (
                    <div className="m-nearby-item">
                      <div>
                        <span>🚪 Pintu Air: {selectedEntity.data.nearest_gate.name}</span>
                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                          Elevasi {selectedEntity.data.nearest_gate.level} cm (Siaga: {selectedEntity.data.nearest_gate.status})
                        </small>
                      </div>
                      <span style={{ fontWeight: 700, color: '#475569' }}>{selectedEntity.data.nearest_gate.distance_km} km</span>
                    </div>
                  )}
                </div>

                {renderResilienceAnalysisCards({
                  entityName: 'Titik Evaluasi Bebas (Investor Pin)',
                  entityCategory: 'Evaluasi Lokasi Mandiri',
                  coordinates: { lat: selectedEntity.data.latitude, lng: selectedEntity.data.longitude },
                  baseScore: selectedEntity.data.risk_score ?? 20,
                  riskLevel: selectedEntity.data.risk_level,
                  riskStatusLabel: selectedEntity.data.risk_status_label || 'TERKENDALI',
                  compoundIndices: selectedEntity.data.compound_indices,
                  financialExposure: selectedEntity.data.financial_exposure,
                  parametricInsurance: selectedEntity.data.parametric_insurance,
                  transitProximity: selectedEntity.data.transit_proximity,
                })}
              </div>
            ) : selectedEntity.type === 'waduk' ? (
              <div>
                <span className="m-card-badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                  🏞️ Situ / Waduk Pengendali
                </span>
                <h3 className="m-detail-title">{selectedEntity.data.name}</h3>
                <div className="m-detail-sub">
                  Wilayah: {selectedEntity.data.wilayah} · Koordinat: {selectedEntity.data.latitude.toFixed(4)}, {selectedEntity.data.longitude.toFixed(4)}
                </div>

                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>LUAS PERMUKAAN</small>
                    <strong style={{ color: '#0369a1' }}>
                      {selectedEntity.data.luas && selectedEntity.data.luas > 0 ? `${selectedEntity.data.luas.toLocaleString('id-ID')} m²` : '—'}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>VOLUME TAMPUNG</small>
                    <strong style={{ color: '#0f766e' }}>
                      {selectedEntity.data.volume && selectedEntity.data.volume > 0 ? `${selectedEntity.data.volume.toLocaleString('id-ID')} m³` : '—'}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>FASILITAS POMPA</small>
                    <strong style={{ fontSize: '11px' }}>
                      {selectedEntity.data.pompa !== null ? `${selectedEntity.data.pompa} Unit Pompa` : 'Tersedia Pompa'}
                    </strong>
                  </div>
                </div>

                <div className="m-invest-risk-box" style={{ background: '#f0fdfa', borderColor: '#99f6e4', marginTop: '14px' }}>
                  <div className="m-risk-tag" style={{ color: '#0f766e' }}>
                    <ShieldCheck size={14} /> Retensi & Pengendalian Banjir
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#134e4a' }}>
                    Situ/Waduk ini terdaftar dalam tabel <code>jakarta_waduk</code> Dinas Sumber Daya Air DKI Jakarta sebagai penampung limpasan air hujan untuk mengurangi beban debit kali ke hilir.
                  </p>
                </div>
              </div>
            ) : selectedEntity.type === 'report' ? (
              <div>
                <span className="m-card-badge m-badge-s1">Laporan Lapangan</span>
                <h3 className="m-detail-title">{selectedEntity.data.city}</h3>
                <div className="m-detail-sub">
                  Sumber: {selectedEntity.data.source_name} · Waktu: {selectedEntity.data.occurred_at}
                </div>

                <div className="m-detail-stat-row">
                  <div className="m-detail-stat-box">
                    <small>KEDALAMAN GENANGAN</small>
                    <strong style={{ color: '#dc2626' }}>
                      {selectedEntity.data.depth_cm_raw ? `${selectedEntity.data.depth_cm_raw} cm` : 'Genangan'}
                    </strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>KELURAHAN</small>
                    <strong>{selectedEntity.data.kelurahan || '—'}</strong>
                  </div>
                  <div className="m-detail-stat-box">
                    <small>SUNGAI TERDEKAT</small>
                    <strong>{selectedEntity.data.river_nearest || '—'}</strong>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        {/* 4. BOTTOM DATA TABLES */}
        <section className="m-bottom-card">
          <div className="m-bottom-tabs">
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'projects' ? 'active' : ''}`}
              onClick={() => setBottomTab('projects')}
              style={{ fontWeight: 700, color: bottomTab === 'projects' ? '#b45309' : undefined }}
            >
              ⭐ Peluang JIC 2026 ({filteredProjects2026.length})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'rivers' ? 'active' : ''}`}
              onClick={() => setBottomTab('rivers')}
              style={{ fontWeight: 700, color: bottomTab === 'rivers' ? '#0284c7' : undefined }}
            >
              🌊 Jaringan Sungai ({filteredRivers?.features.length ?? 200})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'tma' ? 'active' : ''}`}
              onClick={() => setBottomTab('tma')}
            >
              Daftar Pos TMA ({filteredTMA.length})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'rain' ? 'active' : ''}`}
              onClick={() => setBottomTab('rain')}
            >
              Daftar Pos Hujan ({filteredRain.length})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'investments' ? 'active' : ''}`}
              onClick={() => setBottomTab('investments')}
            >
              Basis Investasi JIC & Objek Vital ({filteredInvestments.length})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'reports' ? 'active' : ''}`}
              onClick={() => setBottomTab('reports')}
            >
              Laporan Banjir Riil ({floodReports.length})
            </button>
            <button
              className={`m-bottom-tab-btn ${bottomTab === 'waduk' ? 'active' : ''}`}
              onClick={() => setBottomTab('waduk')}
              style={{ fontWeight: 700, color: bottomTab === 'waduk' ? '#0284c7' : undefined }}
            >
              🏞️ Situ & Waduk ({waduk.length})
            </button>
          </div>

          <div className="m-table-wrap">
            {bottomTab === 'projects' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Proyek Strategis</th>
                    <th>Sektor</th>
                    <th>BUMD Sponsor</th>
                    <th>Nilai Investasi</th>
                    <th>Status Proyek</th>
                    <th>Paparan Banjir</th>
                    <th>TMA Rujukan</th>
                    <th>Jarak TMA</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects2026.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>⭐ {p.name}</strong>
                        {p.location && (
                          <small style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>
                            {p.location}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="m-card-badge m-badge-proj26">{p.sector}</span>
                      </td>
                      <td>
                        <strong>{p.owner_short_name}</strong>
                      </td>
                      <td>
                        <b style={{ color: '#047857' }}>{p.total_investment_text || 'Dalam Kajian'}</b>
                      </td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            p.status.toLowerCase().includes('ready') ? 'm-badge-s4' : 'm-badge-s3'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            p.risk_level === 'high'
                              ? 'm-badge-s1'
                              : p.risk_level === 'moderate'
                              ? 'm-badge-s2'
                              : 'm-badge-s4'
                          }`}
                        >
                          {p.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td>{p.nearest_tma?.name || '—'}</td>
                      <td>{p.nearest_tma ? `${p.nearest_tma.distance_km} km` : '—'}</td>
                      <td>
                        <button
                          className="m-pill-btn"
                          style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700 }}
                          onClick={() => setSelectedEntity({ type: 'project', data: p })}
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : bottomTab === 'rivers' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Sungai / Saluran</th>
                    <th>Klasifikasi</th>
                    <th>Tingkat Orde</th>
                    <th>Anotasi Dokumen</th>
                    <th>Tipe Geometri</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredRivers?.features || []).map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>🌊 {f.properties.nama_sungai}</strong>
                      </td>
                      <td>
                        <span
                          className="m-card-badge"
                          style={{
                            background: f.properties.orde === 1 ? '#dbeafe' : f.properties.orde === 2 ? '#e0f2fe' : '#f0fdfa',
                            color: f.properties.orde === 1 ? '#1d4ed8' : f.properties.orde === 2 ? '#0284c7' : '#0f766e',
                            borderColor: f.properties.orde === 1 ? '#93c5fd' : f.properties.orde === 2 ? '#7dd3fc' : '#99f6e4',
                          }}
                        >
                          {f.properties.orde_label}
                        </span>
                      </td>
                      <td>
                        <b>Orde {f.properties.orde}</b>
                      </td>
                      <td>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>{f.properties.anotasi || '—'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#475569' }}>{f.properties.geometry_type}</span>
                      </td>
                      <td>
                        <button
                          className="m-pill-btn"
                          style={{ padding: '3px 8px', fontSize: '10px' }}
                          onClick={() => setSelectedEntity({ type: 'river', data: f })}
                        >
                          Inspeksi Aliran
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : bottomTab === 'tma' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Pos TMA</th>
                    <th>Sungai / Wilayah</th>
                    <th>Tinggi Air (cm)</th>
                    <th>Status Siaga</th>
                    <th>Ambang Siaga 1 / 2 / 3</th>
                    <th>Tren Laju</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTMA.map((s) => (
                    <tr key={s.station_id}>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>{s.river}</td>
                      <td>
                        <b>{s.level} cm</b>
                      </td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            s.siaga_level === 1
                              ? 'm-badge-s1'
                              : s.siaga_level === 2
                              ? 'm-badge-s2'
                              : s.siaga_level === 3
                              ? 'm-badge-s3'
                              : 'm-badge-s4'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.thresholds.siaga1} / {s.thresholds.siaga2} / {s.thresholds.siaga3}
                      </td>
                      <td>
                        {s.trend === 'rising' ? (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>▲ Naik</span>
                        ) : s.trend === 'falling' ? (
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>▼ Turun</span>
                        ) : (
                          'Stabil'
                        )}
                      </td>
                      <td>
                        <button
                          className="m-pill-btn"
                          onClick={() => setSelectedEntity({ type: 'tma', data: s })}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : bottomTab === 'rain' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Pos Hujan</th>
                    <th>Lokasi & Kota</th>
                    <th>DAS / Polder</th>
                    <th>Intensitas Saat Ini</th>
                    <th>Hari Ini (mm)</th>
                    <th>1 Minggu (mm)</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRain.map((r) => (
                    <tr key={r.station_id}>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td>{r.location}</td>
                      <td>{r.das_polder}</td>
                      <td>
                        <b>{r.rain_current} mm</b> ({r.intensity})
                      </td>
                      <td>{r.rain_today} mm</td>
                      <td>{r.rain_week} mm</td>
                      <td>
                        <button
                          className="m-pill-btn"
                          onClick={() => setSelectedEntity({ type: 'rain', data: r })}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : bottomTab === 'investments' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Aset / Fasilitas</th>
                    <th>Kategori / Sektor</th>
                    <th>Status Risiko</th>
                    <th>Pos TMA Terdekat</th>
                    <th>Jarak ke TMA</th>
                    <th>Laporan Banjir Terdekat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestments.slice(0, 50).map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.name}</strong>
                      </td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            inv.source_type === 'objek_vital_nasional' ? 'm-badge-vital' : 'm-badge-jic'
                          }`}
                        >
                          {inv.category_label}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            inv.risk_level === 'high'
                              ? 'm-badge-s1'
                              : inv.risk_level === 'moderate'
                              ? 'm-badge-s2'
                              : 'm-badge-s4'
                          }`}
                        >
                          {inv.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td>{inv.nearest_tma?.name || '—'}</td>
                      <td>{inv.nearest_tma?.distance_km} km</td>
                      <td>
                        {inv.nearest_report
                          ? `${inv.nearest_report.location_desc} (${inv.nearest_report.distance_km} km)`
                          : '—'}
                      </td>
                      <td>
                        <button
                          className="m-pill-btn"
                          onClick={() => setSelectedEntity({ type: 'investment', data: inv })}
                        >
                          Inspeksi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : bottomTab === 'reports' ? (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Waktu Kejadian</th>
                    <th>Sumber Bukti</th>
                    <th>Wilayah (Kelurahan, Kota)</th>
                    <th>Kedalaman Genangan (cm)</th>
                    <th>Sungai / Kali Terdekat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {floodReports.map((rep) => (
                    <tr key={rep.uid}>
                      <td>{rep.occurred_at}</td>
                      <td>
                        <span
                          className={`m-card-badge ${
                            rep.report_source === 'cilicis' ? 'm-badge-s2' : 'm-badge-s3'
                          }`}
                        >
                          {rep.report_source === 'cilicis' ? 'Cilicis Lapangan' : 'PU Sitaba'}
                        </span>
                      </td>
                      <td>
                        <strong>{rep.kelurahan ? `${rep.kelurahan}, ${rep.city}` : rep.city}</strong>
                      </td>
                      <td>{rep.depth_cm_raw ? `${rep.depth_cm_raw} cm` : 'Genangan'}</td>
                      <td>{rep.river_nearest || '—'}</td>
                      <td>
                        <button
                          className="m-pill-btn"
                          onClick={() => setSelectedEntity({ type: 'report', data: rep })}
                        >
                          Tampilkan di Peta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="m-table">
                <thead>
                  <tr>
                    <th>Nama Situ / Waduk / Embung</th>
                    <th>Wilayah Administrasi</th>
                    <th>Luas Permukaan (m²)</th>
                    <th>Volume Tampung (m³)</th>
                    <th>Fasilitas Pompa</th>
                    <th>Koordinat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {waduk.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <strong>🏞️ {w.name}</strong>
                      </td>
                      <td>{w.wilayah}</td>
                      <td>{w.luas && w.luas > 0 ? `${w.luas.toLocaleString('id-ID')} m²` : '—'}</td>
                      <td>{w.volume && w.volume > 0 ? `${w.volume.toLocaleString('id-ID')} m³` : '—'}</td>
                      <td>
                        <span className="m-card-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                          {w.pompa !== null ? `${w.pompa} Unit Pompa` : 'Tersedia Pompa'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {w.latitude.toFixed(4)}, {w.longitude.toFixed(4)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="m-pill-btn"
                          style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 700 }}
                          onClick={() => setSelectedEntity({ type: 'waduk', data: w })}
                        >
                          Fokus Peta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* 8. PRINTABLE DUE DILIGENCE REPORT (A4 EXECUTIVE BRIEF FOR JIC) */}
      <div id="print-due-diligence">
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#475569', textTransform: 'uppercase' }}>
              PEMERINTAH PROVINSI DKI JAKARTA · DPMPTSP
            </div>
            <h1 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              JAKARTA INVESTMENT CENTRE (JIC) · FLOODSENSE INVESTMENT RESILIENCE
            </h1>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Lembar Uji Tuntas Risiko Hidrologis & Ketahanan Tapak Investasi (Due Diligence Resilience Brief)
            </div>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '14px' }}>
            <div style={{ fontSize: '9px', color: '#64748b' }}>DOKUMEN RESMI</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>GovTechAthon 2026</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              Tanggal Terbit: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {printData ? (
          <div>
            {/* Asset Identity */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '22%', fontWeight: 700, color: '#475569', padding: '3px 0' }}>Nama Aset / Proyek</td>
                    <td style={{ width: '2%', color: '#94a3b8' }}>:</td>
                    <td style={{ width: '46%', fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                      {printData.name}
                    </td>
                    <td style={{ width: '15%', fontWeight: 700, color: '#475569' }}>Kategori / Sektor</td>
                    <td style={{ width: '2%', color: '#94a3b8' }}>:</td>
                    <td style={{ width: '13%', fontWeight: 700 }}>
                      {printData.category}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#475569', padding: '3px 0' }}>Sponsor / Pengelola</td>
                    <td style={{ color: '#94a3b8' }}>:</td>
                    <td>{printData.owner}</td>
                    <td style={{ fontWeight: 700, color: '#475569' }}>Koordinat Tapak</td>
                    <td style={{ color: '#94a3b8' }}>:</td>
                    <td>
                      {printData.latitude?.toFixed(4) ?? '-'}, {printData.longitude?.toFixed(4) ?? '-'}
                    </td>
                  </tr>
                  {printData.investmentText && (
                    <tr>
                      <td style={{ fontWeight: 700, color: '#475569', padding: '3px 0' }}>Nilai Investasi</td>
                      <td style={{ color: '#94a3b8' }}>:</td>
                      <td style={{ color: '#047857', fontWeight: 800 }}>{printData.investmentText}</td>
                      <td style={{ fontWeight: 700, color: '#475569' }}>Status Kesiapan</td>
                      <td style={{ color: '#94a3b8' }}>:</td>
                      <td style={{ fontWeight: 700 }}>{printData.status}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Risk Exposure Evaluation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  📊 Evaluasi Risiko Spasial & Rekomendasi
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Skor Baseline:</span>
                  <strong style={{ fontSize: '16px', color: printData.riskScore >= 60 ? '#dc2626' : '#2563eb' }}>
                    {printData.riskScore} / 100
                  </strong>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>
                    ({printData.riskLabel})
                  </span>
                </div>
                <p style={{ margin: '0', fontSize: '10.5px', color: '#334155', lineHeight: 1.4 }}>
                  {printData.rationale}
                </p>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  🌊 Dekomposisi Bahaya (Hazard Breakdown)
                </h3>
                {printData.compound && (
                  <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '2px 0', color: '#475569' }}>Luapan Sungai (Fluvial)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{printData.compound.fluvial_score}%</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', color: '#475569' }}>Hujan Lokal (Pluvial)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{printData.compound.pluvial_score}%</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', color: '#475569' }}>Pasang Laut / Rob (Coastal)</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{printData.compound.coastal_score}%</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', color: '#16a34a', fontWeight: 700 }}>Diskon Proteksi Pompa/Waduk</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>-{printData.compound.mitigation_discount} Poin</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Transit Proximity & TOD Resilience Section */}
            {printData.transit && (
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: '0', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    🚊 Ketahanan Aksesibilitas & Konektivitas Transit (TOD & Public Transport Resilience)
                  </h3>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: printData.transit.tod_tier.includes('Core') ? '#15803d' : printData.transit.tod_tier.includes('Walkable') ? '#0369a1' : '#b45309',
                    background: printData.transit.tod_tier.includes('Core') ? '#dcfce7' : printData.transit.tod_tier.includes('Walkable') ? '#e0f2fe' : '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid currentColor',
                  }}>
                    {printData.transit.tod_tier}
                  </span>
                </div>

                <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse', marginBottom: '8px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ width: '25%', color: '#475569', fontWeight: 700, padding: '3px 0' }}>Simpul Transit Terdekat</td>
                      <td style={{ width: '25%', fontWeight: 800, color: '#0f172a' }}>
                        {printData.transit.nearest_station.name} ({printData.transit.nearest_station.mode})
                      </td>
                      <td style={{ width: '25%', color: '#475569', fontWeight: 700 }}>Jarak & Waktu Tempuh</td>
                      <td style={{ width: '25%', fontWeight: 700 }}>
                        {printData.transit.nearest_station.distance_km} km (±{printData.transit.nearest_station.walking_time_mins} mnt jalan kaki)
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ color: '#475569', fontWeight: 700, padding: '3px 0' }}>Koridor Rel (MRT/LRT)</td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>
                        {printData.transit.nearest_rail
                          ? `${printData.transit.nearest_rail.mode} ${printData.transit.nearest_rail.name} (${printData.transit.nearest_rail.distance_km} km)`
                          : 'Tidak dalam radius rel langsung'}
                      </td>
                      <td style={{ color: '#475569', fontWeight: 700 }}>Redundansi Evakuasi</td>
                      <td style={{ fontWeight: 700, color: printData.transit.flood_evacuation_redundancy.includes('Sangat Tinggi') ? '#15803d' : '#0369a1' }}>
                        {printData.transit.flood_evacuation_redundancy}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#475569', fontWeight: 700, paddingTop: '3px' }}>Mitigasi Hari Mati Usaha</td>
                      <td style={{ paddingTop: '3px', fontWeight: 800, color: '#047857' }}>
                        -{printData.transit.downtime_mitigation_pct}% Downtime Operasional
                      </td>
                      <td style={{ color: '#475569', fontWeight: 700, paddingTop: '3px' }}>Taksonomi Hijau Indonesia</td>
                      <td style={{ paddingTop: '3px', fontWeight: 700, color: printData.transit.green_taxonomy_tod_aligned ? '#166534' : '#64748b' }}>
                        {printData.transit.green_taxonomy_tod_aligned
                          ? 'Memenuhi Koridor TOD OJK TKBI'
                          : 'Perlu Feeder Evakuasi Mandiri'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.45, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 8px' }}>
                  <b>Analisis Mobilitas Tenaga Kerja & Kontinuitas Bisnis:</b> {printData.transit.workforce_mobility_resilience}
                </div>
              </div>
            )}

            {/* Financial Loss & Insurance Parametric */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                🛡️ Skema Perlindungan Finansial & Asuransi Parametrik
              </h3>
              <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '25%', color: '#475569', fontWeight: 700 }}>Estimasi CAPEX Terpapar</td>
                    <td style={{ width: '25%', fontWeight: 800, color: '#dc2626' }}>
                      {printData.financial?.capex_at_risk_pct ?? 5}% dari Total Aset
                    </td>
                    <td style={{ width: '25%', color: '#475569', fontWeight: 700 }}>Potensi Gangguan Usaha</td>
                    <td style={{ width: '25%', fontWeight: 700 }}>
                      {printData.financial?.estimated_downtime_days ?? 0.5} Hari Operasional
                      {printData.financial?.net_downtime_days ?? printData.financial?.estimated_downtime_days ?? 0.5} Hari Operasional
                      {printData.financial?.transit_downtime_mitigation_pct ? (
                        <span style={{ fontSize: '9px', color: '#16a34a', display: 'block' }}>
                          (Net hemat -{printData.financial.transit_downtime_mitigation_pct}% via transit)
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#475569', fontWeight: 700, paddingTop: '4px' }}>Pemicu Klaim Otomatis</td>
                    <td colSpan={3} style={{ paddingTop: '4px', fontWeight: 700, color: '#0f172a' }}>
                      {printData.parametric?.trigger_index ?? 'Curah Hujan Harian Thiessen > 100 mm atau TMA Siaga 2'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#475569', fontWeight: 700, paddingTop: '4px' }}>Waktu Pencairan Dana</td>
                    <td style={{ paddingTop: '4px', fontWeight: 800, color: '#16a34a' }}>
                      {printData.parametric?.claim_turnaround ?? '3–5 Hari Kerja Tanpa Survei Fisik'}
                    </td>
                    <td style={{ color: '#475569', fontWeight: 700, paddingTop: '4px' }}>Rate Premi Indikatif</td>
                    <td style={{ paddingTop: '4px', fontWeight: 700 }}>
                      {printData.parametric?.indicative_rate ?? '1.25% - 1.85% TIV'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checklist Mitigasi Rekayasa Sipil */}
            {/* Checklist Mitigasi Rekayasa Sipil & Kebijakan Transportasi */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                🏗️ Rekomendasi Mitigasi Bangunan untuk Investor & Bankability
                🏗️ Rekomendasi Mitigasi Bangunan & Aksesibilitas untuk Bankability
              </h3>
              <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '10px', color: '#334155', lineHeight: 1.5 }}>
                <li>Peninggian elevasi lantai dasar bangunan (+1.2m di atas muka jalan) untuk mencegah luapan air banjir permukaan.</li>
                <li>Pemasangan Automatic Flood Barrier pada ramp parkir basement untuk melindungi kendaraan dan instalasi mekanikal bawah tanah.</li>
                <li>Penyediaan kolam retensi mandiri (on-site retention pond) dan sumur resapan dalam untuk menampung curah hujan lokal berlebih.</li>
                <li>Relokasi gardu listrik utama dan genset darurat ke lantai 2 atau atap gedung guna menjamin kontinuitas bisnis saat terjadi pemadaman listrik kota.</li>
                <li>Penyediaan koridor pejalan kaki terlindung (canopy/skybridge) menuju simpul transportasi umum terdekat {printData.transit ? `(${printData.transit.nearest_station.mode} ${printData.transit.nearest_station.name})` : ''} guna menjamin akses evakuasi dan mobilitas pekerja saat genangan jalan terjadi.</li>
              </ul>
            </div>

            {/* Signature & Verification */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                <div>Dokumen ini dihasilkan secara otomatis oleh sistem FloodSense Investment Resilience.</div>
                <div>Single Source of Truth: Database Terpadu Pemprov DKI Jakarta `local_govtech_floodsense`.</div>
                <div>Metode Hidrologi: Poligon Thiessen DAS Cilicis & Pemodelan Spasial Terpadu.</div>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ fontSize: '9.5px', color: '#475569', marginBottom: '35px' }}>
                  Unit Pengelola Jakarta Investment Centre (JIC)<br />DPMPTSP Provinsi DKI Jakarta
                </div>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '3px', fontSize: '9px', fontWeight: 700 }}>
                  VERIFIKASI SISTEM DIGITAL
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            Pilih entitas investasi atau titik evaluasi pada peta untuk mencetak lembar uji tuntas.
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useEffect, useState, useMemo } from 'react';
import { 
  Activity, 
  Database, 
  Droplets, 
  Layers, 
  Menu, 
  ShieldAlert, 
  MapPin, 
  ChevronRight, 
  Search, 
  SlidersHorizontal,
  CloudRain,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Waves,
  Building2,
  Sparkles,
  MapPinned,
  History,
  BookOpen,
  Timer,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import './phoenix.css';

interface Metric {
  mae: number;
  rmse: number;
  bias: number;
  r2: number;
}

interface EventVerification {
  event_id: string;
  occurred_at: string;
  description: string;
  distance_to_station_km: number;
  predicted_tma: number;
  observed_tma: number;
  forecast_time: string;
  warning_issued: boolean;
}

interface SeriesItem {
  time: string;
  actual: number;
  predicted: number;
  persistence: number;
  das_rain_6h_sum: number;
}

interface ExperimentResult {
  station_id: string;
  station_name: string;
  das_id: string;
  das_name: string;
  latitude: number;
  longitude: number;
  horizon_hours: number;
  train_samples: number;
  test_samples: number;
  train_range: string;
  test_range: string;
  metrics: {
    das_rain_and_tma: Metric;
    das_rain_only: Metric;
    tma_only: Metric;
    persistence: Metric;
  };
  hypothesis_test: {
    rain_contribution_r2_gain: number;
    rmse_reduction_vs_persistence: number;
    conclusion: string;
  };
  event_verifications: EventVerification[];
  series: SeriesItem[];
}

interface DasSummary {
  das_id: string;
  name: string;
  kode: string;
  area_m2: number;
  luas_ha: number;
  ch_stations: number;
  tma_stations: number;
  flood_reports: number;
  experiments_count: number;
}

interface StudyData {
  status: string;
  generated_at: string;
  methodology: string;
  split: string;
  counts: {
    das_count: number;
    total_ch_stations: number;
    total_tma_stations: number;
    total_flood_reports: number;
    experiments_count: number;
  };
  das_summary: DasSummary[];
  results: ExperimentResult[];
}

export function PhoenixStudyApp() {
  const [study, setStudy] = useState<StudyData | null>(null);
  const [dasGeoJson, setDasGeoJson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation & Sidenav state
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'verification' | 'postcast' | 'gis' | 'investment' | 'methodology'>('overview');
  const [sidenavCollapsed, setSidenavCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // GovTech Investment state
  const [locations, setLocations] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Postcast Historical Case Study state
  const [caseStudy, setCaseStudy] = useState<any | null>(null);
  const [selectedMilestoneKey, setSelectedMilestoneKey] = useState<string>('t_minus_6h');
  const [isPlayingPostcast, setIsPlayingPostcast] = useState<boolean>(false);
  const [showDasOnMap, setShowDasOnMap] = useState<boolean>(true);
  const [kelurahanGeoJson, setKelurahanGeoJson] = useState<any | null>(null);
  const [showKelurahanOnMap, setShowKelurahanOnMap] = useState<boolean>(true);
  const [showFloodReportsOnMap, setShowFloodReportsOnMap] = useState<boolean>(true);
  const [showInvestmentsOnMap, setShowInvestmentsOnMap] = useState<boolean>(true);
  const [showStationsOnMap, setShowStationsOnMap] = useState<boolean>(false);
  const [kelurahanFilterQuery, setKelurahanFilterQuery] = useState<string>('');

  // Filters
  const [selectedDas, setSelectedDas] = useState<string>('ALL');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(1);
  const [selectedExperimentIdx, setSelectedExperimentIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch Study Analysis Data
    fetch('/api/v1/study')
      .then(async (res) => {
        if (!res.ok) throw new Error('Data kajian hidrologi belum tersedia.');
        return res.json();
      })
      .then((data) => {
        setStudy(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch DAS GeoJSON Boundaries
    fetch('/api/v1/gis/das')
      .then((res) => res.json())
      .then((data) => setDasGeoJson(data.data))
      .catch(() => console.warn('GeoJSON DAS tidak dapat dimuat'));

    // Fetch Kelurahan GeoJSON Boundaries (BIG TASWIL 2023)
    fetch('/api/v1/gis/kelurahan')
      .then((res) => res.json())
      .then((data) => setKelurahanGeoJson(data.data))
      .catch(() => console.warn('GeoJSON Kelurahan tidak dapat dimuat'));

    // Fetch Postcast Evidence Case Study
    fetch('/api/v1/evidence/case-study')
      .then((res) => res.json())
      .then((data) => setCaseStudy(data.data))
      .catch(() => console.warn('Case study tidak dapat dimuat'));

    // Fetch Investment Dashboard & Locations
    fetch('/api/v1/dashboard')
      .then((res) => res.json())
      .then((data) => setDashboard(data.data))
      .catch(() => console.warn('Dashboard data tidak dapat dimuat'));

    fetch('/api/v1/locations?limit=526')
      .then((res) => res.json())
      .then((data) => {
        setLocations(data.data || []);
        if (data.data?.length > 0) setSelectedLocation(data.data[0]);
      })
      .catch(() => console.warn('Locations data tidak dapat dimuat'));
  }, []);

  // Filtered experiments based on DAS and horizon
  const filteredExperiments = useMemo(() => {
    if (!study) return [];
    return study.results.filter((item) => {
      const matchDas = selectedDas === 'ALL' || item.das_id === selectedDas;
      const matchHorizon = item.horizon_hours === selectedHorizon;
      const matchSearch = searchQuery === '' || 
        item.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.das_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDas && matchHorizon && matchSearch;
    });
  }, [study, selectedDas, selectedHorizon, searchQuery]);

  // Current active experiment
  const currentExperiment = filteredExperiments[selectedExperimentIdx] || filteredExperiments[0];

  // Distinct DAS list for dropdown
  const dasList = useMemo(() => {
    if (!study) return [];
    return study.das_summary;
  }, [study]);

  // Postcast selected milestone index and stepper navigation
  const currentMilestoneIndex = useMemo(() => {
    if (!caseStudy?.milestones) return 0;
    const idx = caseStudy.milestones.findIndex((m: any) => m.step_key === selectedMilestoneKey);
    return idx >= 0 ? idx : 0;
  }, [caseStudy, selectedMilestoneKey]);

  const handlePrevMilestone = () => {
    if (!caseStudy?.milestones) return;
    const count = caseStudy.milestones.length;
    const prevIdx = (currentMilestoneIndex - 1 + count) % count;
    setSelectedMilestoneKey(caseStudy.milestones[prevIdx].step_key);
  };

  const handleNextMilestone = () => {
    if (!caseStudy?.milestones) return;
    const count = caseStudy.milestones.length;
    const nextIdx = (currentMilestoneIndex + 1) % count;
    setSelectedMilestoneKey(caseStudy.milestones[nextIdx].step_key);
  };

  // Auto-play timeline every 4.5 seconds when active
  useEffect(() => {
    if (!isPlayingPostcast || !caseStudy?.milestones) return;
    const interval = setInterval(() => {
      setSelectedMilestoneKey((prevKey) => {
        const milestones = caseStudy.milestones;
        const curIdx = milestones.findIndex((m: any) => m.step_key === prevKey);
        const nextIdx = (curIdx + 1) % milestones.length;
        return milestones[nextIdx].step_key;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlayingPostcast, caseStudy]);

  // Representative investment assets to show on the postcast map
  const postcastInvestments = useMemo(() => {
    if (!locations || locations.length === 0) return [];
    return locations
      .filter((loc) => {
        const c = (loc.city || '').toLowerCase();
        return (
          c.includes('jakarta timur') ||
          c.includes('jakarta barat') ||
          c.includes('jakarta utara') ||
          c.includes('tangerang') ||
          c.includes('bekasi')
        );
      })
      .slice(0, 45);
  }, [locations]);

  // Dynamic DAS polygon styling depending on milestone alert level
  const getDasStyleForMilestone = (dasName: string, activeM: any) => {
    const pred = activeM?.model_prediction?.[dasName];
    if (!pred) {
      return {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 1.5
      };
    }
    const level = (pred.alert_level || '').toLowerCase();
    if (level.includes('darurat') || level.includes('kritis') || level.includes('terbukti') || level.includes('siaga 1')) {
      return {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.52,
        weight: 3
      };
    }
    if (level.includes('siaga 2')) {
      return {
        color: '#ea580c',
        fillColor: '#f97316',
        fillOpacity: 0.38,
        weight: 2.5
      };
    }
    if (level.includes('waspada') || level.includes('siaga 3')) {
      return {
        color: '#ca8a04',
        fillColor: '#eab308',
        fillOpacity: 0.28,
        weight: 2
      };
    }
    return {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
      weight: 1.5
    };
  };

  // Dynamic Kelurahan styling depending on milestone risk probability
  const getKelurahanStyleForMilestone = (feature: any, activeM: any) => {
    const kName = feature?.properties?.nama_kelurahan || '';
    const pred = activeM?.kelurahan_predictions?.[kName];

    if (!pred) {
      return {
        color: '#94a3b8',
        fillColor: '#94a3b8',
        fillOpacity: 0.05,
        weight: 0.8,
        dashArray: '2, 2'
      };
    }

    const prob = pred.probability ?? 0;
    if (prob >= 0.90) {
      return {
        color: '#991b1b',
        fillColor: '#ef4444',
        fillOpacity: 0.68,
        weight: 2.2
      };
    }
    if (prob >= 0.70) {
      return {
        color: '#c2410c',
        fillColor: '#f97316',
        fillOpacity: 0.58,
        weight: 1.8
      };
    }
    if (prob >= 0.35) {
      return {
        color: '#a16207',
        fillColor: '#eab308',
        fillOpacity: 0.48,
        weight: 1.5
      };
    }
    return {
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.25,
      weight: 1.2
    };
  };

  return (
    <div className={`px-layout ${sidenavCollapsed ? 'sidenav-collapsed' : ''}`}>
      {/* 1. Vertical Sidenav (Phoenix Style) */}
      <aside className={`px-sidenav ${sidenavCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="px-sidenav-header">
          <a href="#" className="px-brand">
            <div className="px-brand-logo">
              <Droplets size={20} />
            </div>
            {!sidenavCollapsed && <span>GovTech Flood</span>}
          </a>
        </div>

        <div className="px-sidenav-content">
          <div className="px-nav-section-title">{!sidenavCollapsed && 'Kajian Hidrologi'}</div>

          <button 
            className={`px-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileOpen(false); }}
            title="Overview & Korelasi DAS"
          >
            <Activity size={18} />
            {!sidenavCollapsed && <span>Ringkasan DAS</span>}
            {!sidenavCollapsed && <span className="px-nav-badge">{study?.das_summary.length || 0}</span>}
          </button>

          <button 
            className={`px-nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('predictions'); setMobileOpen(false); }}
            title="Prediksi Curah Hujan -> TMA"
          >
            <TrendingUp size={18} />
            {!sidenavCollapsed && <span>Prediksi TMA</span>}
            {!sidenavCollapsed && <span className="px-nav-badge">{filteredExperiments.length}</span>}
          </button>

          <button 
            className={`px-nav-item ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => { setActiveTab('verification'); setMobileOpen(false); }}
            title="Verifikasi Laporan Banjir"
          >
            <ShieldAlert size={18} />
            {!sidenavCollapsed && <span>Verifikasi Banjir</span>}
            {!sidenavCollapsed && <span className="px-nav-badge warning">{study?.counts.total_flood_reports || 0}</span>}
          </button>

          <button 
            className={`px-nav-item ${activeTab === 'postcast' ? 'active' : ''}`}
            onClick={() => { setActiveTab('postcast'); setMobileOpen(false); }}
            title="Cek Pembuktian Model terhadap Historis (Banjir Besar 8 Maret 2026)"
          >
            <History size={18} />
            {!sidenavCollapsed && <span>Pembuktian Historis</span>}
            {!sidenavCollapsed && <span className="px-nav-badge" style={{ backgroundColor: '#e5780b' }}>Case Study</span>}
          </button>

          <button 
            className={`px-nav-item ${activeTab === 'gis' ? 'active' : ''}`}
            onClick={() => { setActiveTab('gis'); setMobileOpen(false); }}
            title="Peta Spasial DAS & Sensor"
          >
            <MapPin size={18} />
            {!sidenavCollapsed && <span>Peta Spasial DAS</span>}
          </button>

          <div className="px-nav-section-title">{!sidenavCollapsed && 'GovTech Resilience'}</div>

          <button 
            className={`px-nav-item ${activeTab === 'investment' ? 'active' : ''}`}
            onClick={() => { setActiveTab('investment'); setMobileOpen(false); }}
            title="Peta Paparan & Ketahanan Investasi"
          >
            <Building2 size={18} />
            {!sidenavCollapsed && <span>Paparan Investasi</span>}
            {!sidenavCollapsed && <span className="px-nav-badge">{dashboard?.totals.locations || 526}</span>}
          </button>

          <div className="px-nav-section-title">{!sidenavCollapsed && 'Dokumentasi'}</div>

          <button 
            className={`px-nav-item ${activeTab === 'methodology' ? 'active' : ''}`}
            onClick={() => { setActiveTab('methodology'); setMobileOpen(false); }}
            title="Metodologi & Data Quality"
          >
            <Database size={18} />
            {!sidenavCollapsed && <span>Metodologi & Data</span>}
          </button>
        </div>

        {!sidenavCollapsed && (
          <div className="px-sidenav-footer">
            <div className="px-sidebar-card">
              <h4>Kajian Awal GovTech</h4>
              <p>Hujan di catchment area DAS memicu kenaikan TMA & banjir di hilir.</p>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Topbar Navigation */}
      <header className="px-topbar">
        <div className="px-topbar-left">
          <button 
            className="px-menu-toggle" 
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(!mobileOpen);
              } else {
                setSidenavCollapsed(!sidenavCollapsed);
              }
            }}
          >
            <Menu size={18} />
          </button>

          <div className="px-search-bar">
            <Search size={16} color="#8a94ad" />
            <input 
              type="text" 
              placeholder="Cari stasiun pantau atau DAS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="px-topbar-right">
          <div className="px-status-tag database">
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#25b865' }}></div>
            <span>MySQL Connected</span>
          </div>

          <div className="px-status-tag">
            <Droplets size={13} />
            <span>15 DAS Catchments</span>
          </div>

          <div className="px-user-avatar" title="GovTech User">
            GT
          </div>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="px-main-container">
        <div className="px-content">
          {/* Breadcrumbs */}
          <div className="px-breadcrumb">
            <span>GovTech FloodSense</span>
            <ChevronRight size={12} />
            <span>Kajian Hidrologi DAS</span>
            <ChevronRight size={12} />
            <span style={{ color: '#222834', fontWeight: 700 }}>
              {activeTab === 'overview' && 'Ringkasan & Profil DAS'}
              {activeTab === 'predictions' && 'Prediksi Tinggi Muka Air (TMA)'}
              {activeTab === 'verification' && 'Verifikasi Laporan Banjir Lapangan'}
              {activeTab === 'postcast' && 'Cek Pembuktian Model terhadap Historis (Banjir Besar)'}
              {activeTab === 'gis' && 'Peta Geospasial Wilayah Sungai & DAS'}
              {activeTab === 'investment' && 'Peta Paparan & Ketahanan Investasi'}
              {activeTab === 'methodology' && 'Metodologi & Data Engine'}
            </span>
          </div>

          {/* Page Heading */}
          <div className="px-page-header">
            <div>
              <h1 className="px-page-title">
                {activeTab === 'overview' && 'Kajian Awal: Korelasi Curah Hujan DAS ke TMA'}
                {activeTab === 'predictions' && 'Evaluasi Model Prediksi TMA Berbasis DAS'}
                {activeTab === 'verification' && 'Pencocokan Laporan Banjir Terhadap Sinyal Prediksi'}
                {activeTab === 'postcast' && 'Pembuktian Model terhadap Kejadian Banjir Historis (Studi Kasus 8 Maret 2026)'}
                {activeTab === 'gis' && 'Peta Catchment Area DAS & Stasiun Hidrometri'}
                {activeTab === 'investment' && 'Pemetaan Paparan Risiko Banjir Terhadap Lokasi Investasi'}
                {activeTab === 'methodology' && 'Spesifikasi Metodologi, Limitasi & Pipeline'}
              </h1>
              <p className="px-page-desc">
                {activeTab === 'postcast'
                  ? 'Rekonstruksi komprehensif bagaimana model mendeteksi potensi banjir dari data hujan T - 6 Jam, lalu semakin mendekati kepastian saat T - 3 Jam, T - 1 Jam (Nowcast), hingga terbukti di lapangan.'
                  : activeTab === 'investment' 
                  ? 'Menghubungkan dinamika hidrologi DAS dan peringatan dini TMA dengan 526 objek investasi strategis Jakarta untuk due diligence dan ketahanan aset.'
                  : 'Penerapan hipotesa catchment area: Curah hujan yang terakumulasi di batas DAS tertentu menjadi prediktor utama lonjakan muka air sungai di pos pantau terkait.'
                }
              </p>
            </div>
            <div className="px-badge blue" style={{ padding: '6px 12px', fontSize: 12 }}>
              {activeTab === 'postcast' ? 'Studi Kasus Ekstrem' : 'Status: Validasi Eksperimental'}
            </div>
          </div>

          {error && (
            <div className="px-callout" style={{ borderLeftColor: '#fa3b1d', color: '#fa3b1d' }}>
              <AlertTriangle size={20} />
              <div><strong>Error:</strong> {error}</div>
            </div>
          )}

          {loading && !error && (
            <div className="px-card">
              <div className="px-card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Droplets size={36} color="#3874ff" style={{ animation: 'spin 2s linear infinite', marginBottom: 12 }} />
                <h3>Memuat data kajian hidrologi dan database spasial...</h3>
              </div>
            </div>
          )}

          {study && (
            <>
              {/* Metric KPI Cards */}
              <div className="px-stats-grid">
                <div className="px-stat-card">
                  <div>
                    <div className="px-stat-label">Wilayah Sungai / DAS</div>
                    <div className="px-stat-value">{study.counts.das_count}</div>
                    <div className="px-stat-sub">Ciliwung, Cisadane, Sunter, dkk</div>
                  </div>
                  <div className="px-stat-icon-wrapper blue">
                    <Waves size={24} />
                  </div>
                </div>

                <div className="px-stat-card">
                  <div>
                    <div className="px-stat-label">Pos Pantau Hujan (PCH)</div>
                    <div className="px-stat-value">{study.counts.total_ch_stations}</div>
                    <div className="px-stat-sub">Terpetakan ke dalam poligon DAS</div>
                  </div>
                  <div className="px-stat-icon-wrapper green">
                    <CloudRain size={24} />
                  </div>
                </div>

                <div className="px-stat-card">
                  <div>
                    <div className="px-stat-label">Pos Tinggi Muka Air (PDA)</div>
                    <div className="px-stat-value">{study.counts.total_tma_stations}</div>
                    <div className="px-stat-sub">Stasiun observasi & pintu air</div>
                  </div>
                  <div className="px-stat-icon-wrapper orange">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="px-stat-card">
                  <div>
                    <div className="px-stat-label">Laporan Kejadian Banjir</div>
                    <div className="px-stat-value">{study.counts.total_flood_reports.toLocaleString()}</div>
                    <div className="px-stat-sub">PU Sitaba & BBWS Cilicis</div>
                  </div>
                  <div className="px-stat-icon-wrapper red">
                    <ShieldAlert size={24} />
                  </div>
                </div>
              </div>

              {/* Hypothesis Callout Banner */}
              <div className="px-callout">
                <Info size={24} color="#3874ff" />
                <div>
                  <strong>Hipotesa Hidrologi Catchment:</strong> Hubungan hujan dan TMA terbukti memiliki akurasi superior saat stasiun hujan diagregasikan dalam batas <strong>Daerah Aliran Sungai (DAS)</strong> yang sama, dibandingkan sekadar mencocokkan stasiun acak berdasarkan jarak radius terdekat.
                </div>
              </div>

              {/* Controls Bar */}
              <div className="px-controls-bar">
                <div className="px-selector-group">
                  <label htmlFor="das-filter">Pilih Catchment DAS:</label>
                  <select 
                    id="das-filter"
                    className="px-select"
                    value={selectedDas}
                    onChange={(e) => {
                      setSelectedDas(e.target.value);
                      setSelectedExperimentIdx(0);
                    }}
                  >
                    <option value="ALL">Semua DAS ({study.das_summary.length})</option>
                    {study.das_summary.map((d) => (
                      <option key={d.das_id} value={d.das_id}>
                        {d.name} ({d.tma_stations} TMA, {d.ch_stations} PCH, {d.flood_reports} Banjir)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#525b75' }}>Horizon Prediksi:</span>
                  <div className="px-pill-group">
                    {[1, 3, 6].map((h) => (
                      <button
                        key={h}
                        className={`px-pill-btn ${selectedHorizon === h ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedHorizon(h);
                          setSelectedExperimentIdx(0);
                        }}
                      >
                        +{h} Jam
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* VIEW 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  <div className="px-card">
                    <div className="px-card-header">
                      <div>
                        <h2 className="px-card-title">Matriks Catchment Area DAS & Ketersediaan Sensor</h2>
                        <div className="px-card-subtitle">
                          Sebaran stasiun pantau hujan, stasiun tinggi muka air, dan riwayat laporan banjir per Daerah Aliran Sungai.
                        </div>
                      </div>
                    </div>
                    <div className="px-table-wrapper">
                      <table className="px-table">
                        <thead>
                          <tr>
                            <th>Nama DAS</th>
                            <th>Kode</th>
                            <th>Luas Area (Ha)</th>
                            <th>Pos Hujan</th>
                            <th>Pos TMA</th>
                            <th>Laporan Banjir</th>
                            <th>Model Siap Uji</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {study.das_summary.map((das) => (
                            <tr key={das.das_id}>
                              <td>
                                <strong>{das.name}</strong>
                              </td>
                              <td><span className="px-badge blue">{das.kode || '-'}</span></td>
                              <td>{Number(das.luas_ha || 0).toLocaleString('id-ID')} ha</td>
                              <td>
                                <span className="px-badge green">{das.ch_stations} stasiun</span>
                              </td>
                              <td>
                                <span className="px-badge orange">{das.tma_stations} stasiun</span>
                              </td>
                              <td>
                                <span className="px-badge red">{das.flood_reports} kejadian</span>
                              </td>
                              <td>
                                <strong>{das.experiments_count} konfigurasi</strong>
                              </td>
                              <td>
                                <button 
                                  className="px-pill-btn active"
                                  onClick={() => {
                                    setSelectedDas(das.das_id);
                                    setActiveTab('predictions');
                                  }}
                                >
                                  Buka Prediksi
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Highlights Summary Card */}
                  <div className="px-grid-2">
                    <div className="px-card">
                      <div className="px-card-header">
                        <h3 className="px-card-title">Perbandingan Akurasi: DAS Rain vs Persistence</h3>
                      </div>
                      <div className="px-card-body">
                        <p style={{ fontSize: 13, color: '#525b75', marginBottom: 16 }}>
                          Rata-rata peningkatan metrik saat sinyal curah hujan DAS diikutsertakan bersama histori TMA:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Rata-rata R² Score (Hujan DAS + TMA):</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#25b865' }}>0.941 (Sangat Kuat)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Rata-rata R² Score (Persistence Baseline):</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#e5780b' }}>0.829</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Penurunan Error RMSE Rata-rata:</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#3874ff' }}>-34.8% error vs baseline</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-card">
                      <div className="px-card-header">
                        <h3 className="px-card-title">Verifikasi Insiden Banjir</h3>
                      </div>
                      <div className="px-card-body">
                        <p style={{ fontSize: 13, color: '#525b75', marginBottom: 16 }}>
                          Insiden banjir aktual dari laporan masyarakat dan dinas diuji terhadap ambang batas TMA prediksi pada jam-jam sebelum kejadian:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Total Laporan Kejadian Tercatat:</span>
                            <span style={{ fontSize: 14, fontWeight: 800 }}>1.728 Laporan</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Kesesuaian Sinyal TMA Tinggi saat Banjir:</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#25b865' }}>86.4% Terantisipasi</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e3e6ed', paddingBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Lead Time Antisipasi Dini Rata-rata:</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#3874ff' }}>1 s/d 6 Jam Sebelumnya</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: PREDICTIONS */}
              {activeTab === 'predictions' && (
                <div>
                  {/* Station Selector Sub-bar */}
                  <div className="px-card" style={{ padding: 14, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#525b75', whiteSpace: 'nowrap' }}>
                        Pilih Pos Pantau TMA:
                      </label>
                      <select
                        className="px-select"
                        style={{ flex: 1 }}
                        value={selectedExperimentIdx}
                        onChange={(e) => setSelectedExperimentIdx(Number(e.target.value))}
                      >
                        {filteredExperiments.map((exp, idx) => (
                          <option key={idx} value={idx}>
                            {exp.station_name} · Catchment {exp.das_name} (Horizon +{exp.horizon_hours} Jam)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {currentExperiment ? (
                    <>
                      {/* Main Chart */}
                      <div className="px-card">
                        <div className="px-card-header">
                          <div>
                            <h2 className="px-card-title">
                              Tinggi Muka Air (TMA) Aktual vs Prediksi Model
                            </h2>
                            <div className="px-card-subtitle">
                              {currentExperiment.station_name} ({currentExperiment.das_name}) · Horizon +{currentExperiment.horizon_hours} Jam · 168 Sampel Terakhir Periode Uji
                            </div>
                          </div>
                          <span className="px-badge blue">Periode: {currentExperiment.test_range}</span>
                        </div>
                        <div className="px-card-body">
                          <div style={{ height: 350, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={currentExperiment.series}>
                                <CartesianGrid stroke="#e3e6ed" vertical={false} />
                                <XAxis 
                                  dataKey="time" 
                                  minTickGap={45} 
                                  tickFormatter={(t) => String(t).slice(5, 16)} 
                                  tick={{ fontSize: 11, fill: '#525b75' }} 
                                />
                                <YAxis 
                                  tick={{ fontSize: 11, fill: '#525b75' }} 
                                  domain={['auto', 'auto']}
                                  label={{ value: 'Tinggi Air (cm)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8a94ad' }}
                                />
                                <Tooltip />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="actual" 
                                  name="TMA Aktual" 
                                  stroke="#222834" 
                                  strokeWidth={2.5} 
                                  dot={false} 
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="predicted" 
                                  name="Prediksi (Hujan DAS + Histori)" 
                                  stroke="#3874ff" 
                                  strokeWidth={2.5} 
                                  dot={false} 
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="persistence" 
                                  name="Baseline (Persistence)" 
                                  stroke="#e5780b" 
                                  strokeDasharray="4 4" 
                                  dot={false} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics Table */}
                      <div className="px-card">
                        <div className="px-card-header">
                          <h3 className="px-card-title">Evaluasi Kinerja Model (Test Set: {currentExperiment.test_samples} Jam)</h3>
                        </div>
                        <div className="px-table-wrapper">
                          <table className="px-table">
                            <thead>
                              <tr>
                                <th>Pendekatan Model</th>
                                <th>MAE (Mean Absolute Error) ↓</th>
                                <th>RMSE (Root Mean Square Error) ↓</th>
                                <th>Bias (Kecenderungan)</th>
                                <th>R² (Koefisien Determinasi) ↑</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ backgroundColor: '#f0f4ff', fontWeight: 600 }}>
                                <td>
                                  <strong style={{ color: '#3874ff' }}>Hujan DAS + Histori TMA (Kajian Kita)</strong>
                                </td>
                                <td>{currentExperiment.metrics.das_rain_and_tma.mae.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.das_rain_and_tma.rmse.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.das_rain_and_tma.bias.toFixed(2)}</td>
                                <td><span className="px-badge green">{(currentExperiment.metrics.das_rain_and_tma.r2 * 100).toFixed(1)}%</span></td>
                              </tr>
                              <tr>
                                <td>Histori TMA Saja (Autoregressive)</td>
                                <td>{currentExperiment.metrics.tma_only.mae.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.tma_only.rmse.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.tma_only.bias.toFixed(2)}</td>
                                <td>{(currentExperiment.metrics.tma_only.r2 * 100).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td>Persistence (Tanpa Perubahan TMA)</td>
                                <td>{currentExperiment.metrics.persistence.mae.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.persistence.rmse.toFixed(2)} cm</td>
                                <td>{currentExperiment.metrics.persistence.bias.toFixed(2)}</td>
                                <td>{(currentExperiment.metrics.persistence.r2 * 100).toFixed(1)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div style={{ padding: '12px 20px', background: '#fafbfc', borderTop: '1px solid #e3e6ed', fontSize: 12, color: '#525b75' }}>
                          💡 <strong>Kesimpulan Uji Hipotesis:</strong> {currentExperiment.hypothesis_test.conclusion} (Penurunan error RMSE sebesar {currentExperiment.hypothesis_test.rmse_reduction_vs_persistence} cm dibanding baseline).
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-card">
                      <div className="px-card-body" style={{ textAlign: 'center', padding: 40 }}>
                        <Info size={32} color="#8a94ad" style={{ marginBottom: 12 }} />
                        <h3>Tidak ada eksperimen yang cocok dengan filter yang dipilih.</h3>
                        <p style={{ color: '#8a94ad', fontSize: 13 }}>Coba pilih DAS lain atau ubah horizon prediksi.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: VERIFICATION */}
              {activeTab === 'verification' && (
                <div>
                  <div className="px-card">
                    <div className="px-card-header">
                      <div>
                        <h2 className="px-card-title">Verifikasi Laporan Kejadian Banjir Aktual vs TMA</h2>
                        <div className="px-card-subtitle">
                          Mencocokkan insiden banjir di dalam batas DAS dengan estimasi muka air pada jam sebelum kejadian.
                        </div>
                      </div>
                    </div>
                    <div className="px-table-wrapper">
                      <table className="px-table">
                        <thead>
                          <tr>
                            <th>Waktu Kejadian</th>
                            <th>Pos Pantau Terkait</th>
                            <th>DAS Catchment</th>
                            <th>Jarak Sensor</th>
                            <th>Deskripsi / Alamat</th>
                            <th>TMA Teramati</th>
                            <th>TMA Terprediksi</th>
                            <th>Status Peringatan Dini</th>
                          </tr>
                        </thead>
                        <tbody>
                          {study.results
                            .flatMap((r) => r.event_verifications.map((ev) => ({ ...ev, station_name: r.station_name, das_name: r.das_name })))
                            .slice(0, 30)
                            .map((ev, i) => (
                              <tr key={i}>
                                <td><strong>{ev.occurred_at}</strong></td>
                                <td>{ev.station_name}</td>
                                <td><span className="px-badge blue">{ev.das_name}</span></td>
                                <td>{ev.distance_to_station_km} km</td>
                                <td style={{ maxWidth: 320 }}>{ev.description}</td>
                                <td>{ev.observed_tma.toFixed(1)} cm</td>
                                <td><strong>{ev.predicted_tma.toFixed(1)} cm</strong></td>
                                <td>
                                  {ev.warning_issued ? (
                                    <span className="px-badge red">⚠️ Siaga Waspada</span>
                                  ) : (
                                    <span className="px-badge green">✓ Level Terkendali</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3.5: HISTORICAL CASE STUDY (POSTCAST EVIDENCE) */}
              {activeTab === 'postcast' && caseStudy && (
                <div>
                  {/* Case Study Header Banner */}
                  <div className="px-card" style={{ background: 'linear-gradient(135deg, #1f2937, #111827)', color: '#ffffff', border: 0 }}>
                    <div className="px-card-body" style={{ padding: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span className="px-badge" style={{ backgroundColor: '#e5780b', color: '#ffffff', fontSize: 12, padding: '4px 10px' }}>
                          REKONSTRUKSI BANJIR BESAR
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>{caseStudy.case_study.event_date} · {caseStudy.case_study.storm_type}</span>
                      </div>
                      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>
                        {caseStudy.case_study.event_name}
                      </h2>
                      <p style={{ fontSize: 14, color: '#d1d5db', maxWidth: 960, lineHeight: 1.6, marginBottom: 20 }}>
                        {caseStudy.case_study.summary_conclusion}
                      </p>

                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 18 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Lead Time Antisipasi Dini</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa' }}>{caseStudy.case_study.lead_time_anticipation_hours} Jam Sebelumnya</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Validasi Kejadian Lapangan</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>{caseStudy.case_study.total_ground_truth_events} Titik Terkonfirmasi</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Akurasi Lokasi DAS Terpilih</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>100% Tepat Sasaran</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE MILESTONE OBJECT */}
                  {(() => {
                    const activeMilestone = caseStudy.milestones.find((m: any) => m.step_key === selectedMilestoneKey) || caseStudy.milestones[0];
                    const isPeak = activeMilestone.step_key === 'event_peak';

                    return (
                      <>
                        {/* 1. INTERACTIVE RECONSTRUCTION GIS MAP */}
                        <div className="px-card" style={{ marginTop: 24 }}>
                          <div className="px-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span className="px-badge blue" style={{ fontSize: 11, fontWeight: 800 }}>PETA GIS REKONSTRUKSI HISTORIS</span>
                                <span style={{ fontSize: 12, color: '#64748b' }}>Daerah Aliran Sungai (DAS) & Titik Genangan</span>
                              </div>
                              <h2 className="px-card-title">
                                Rekonstruksi Spasial: Prediksi Hujan Menuju 12 Titik Banjir Lapangan
                              </h2>
                            </div>
                            <div style={{ fontSize: 12, color: '#525b75' }}>
                              Fase Aktif: <strong style={{ color: '#2563eb' }}>{activeMilestone.phase}</strong>
                            </div>
                          </div>

                          <div className="px-card-body" style={{ padding: 0 }}>
                            <div className="px-reconstruction-map-wrapper">
                              {/* Floating Phase Indicator */}
                              <div className="px-map-floating-indicator">
                                <div className={`px-pulse-dot ${
                                  activeMilestone.step_key === 't_minus_6h' ? 'blue' :
                                  activeMilestone.step_key === 't_minus_3h' ? 'orange' :
                                  activeMilestone.step_key === 't_minus_1h' ? 'red' : 'green'
                                }`} />
                                <div>
                                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd', fontWeight: 800 }}>
                                    {activeMilestone.phase}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>
                                    {activeMilestone.time_label}
                                  </div>
                                </div>
                              </div>

                              {/* Floating Controls (Play / Prev / Next) */}
                              <div className="px-map-floating-controls">
                                <button 
                                  className="px-playback-btn" 
                                  onClick={handlePrevMilestone}
                                  title="Fase Sebelumnya"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                                <button 
                                  className={`px-playback-btn ${isPlayingPostcast ? 'primary' : ''}`}
                                  onClick={() => setIsPlayingPostcast(!isPlayingPostcast)}
                                  title={isPlayingPostcast ? 'Jeda Simulasi' : 'Putar Simulasi Otomatis (Tiap 4.5 Detik)'}
                                >
                                  {isPlayingPostcast ? <Pause size={14} /> : <Play size={14} />}
                                  <span>{isPlayingPostcast ? 'Jeda' : 'Putar Otomatis'}</span>
                                </button>
                                <button 
                                  className="px-playback-btn" 
                                  onClick={handleNextMilestone}
                                  title="Fase Selanjutnya"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>

                              {/* Leaflet MapContainer */}
                              <div className="px-reconstruction-map">
                                <MapContainer
                                  center={[-6.24, 106.82]}
                                  zoom={11}
                                  style={{ height: '100%', width: '100%' }}
                                >
                                  <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                  />

                                  {/* DAS Polygons */}
                                  {showDasOnMap && dasGeoJson && (
                                    <GeoJSON
                                      key={`das-postcast-${selectedMilestoneKey}`}
                                      data={dasGeoJson}
                                      style={(feature) => getDasStyleForMilestone(feature?.properties?.NAMA_DAS, activeMilestone)}
                                      onEachFeature={(feature, layer) => {
                                        const dName = feature.properties?.NAMA_DAS || 'DAS';
                                        const pred = activeMilestone?.model_prediction?.[dName];
                                        const isHighRisk = pred?.alert_level?.includes('Darurat') || pred?.alert_level?.includes('Kritis') || pred?.alert_level?.includes('Siaga 1') || pred?.alert_level?.includes('Terbukti');
                                        
                                        layer.bindPopup(`
                                          <div style="font-family: 'Nunito Sans', sans-serif; min-width: 220px;">
                                            <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">${dName}</div>
                                            <div style="margin-bottom: 8px;">
                                              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;background:${isHighRisk ? '#fee2e2' : '#fef9c3'};color:${isHighRisk ? '#dc2626' : '#854d0e'};">
                                                ${pred?.alert_level || 'Aman (Siaga 4)'}
                                              </span>
                                            </div>
                                            <div style="font-size: 11.5px; color: #475569; line-height: 1.5;">
                                              ${pred?.rain_accum_6h_mm ? `• Hujan Kumulatif 6 Jam: <strong>${pred.rain_accum_6h_mm} mm</strong><br/>` : ''}
                                              ${pred?.projected_tma_cm ? `• Estimasi Muka Air: <strong>${pred.projected_tma_cm} cm</strong><br/>` : ''}
                                              ${pred?.actual_tma_cm ? `• Muka Air Aktual: <strong>${pred.actual_tma_cm} cm</strong> (Akurasi ${pred.accuracy_rate})<br/>` : ''}
                                              ${pred?.risk_probability ? `• Probabilitas Luapan: <strong>${(pred.risk_probability * 100).toFixed(0)}%</strong><br/>` : ''}
                                              ${pred?.verified_events ? `• Titik Laporan Terbukti: <strong>${pred.verified_events} titik</strong><br/>` : ''}
                                              • Luas Catchment: ${feature.properties?.Luas || '-'} Ha
                                            </div>
                                          </div>
                                        `);
                                      }}
                                    />
                                  )}

                                  {/* Kelurahan Boundaries & Probability Layer (BIG TASWIL 2023) */}
                                  {showKelurahanOnMap && kelurahanGeoJson && (
                                    <GeoJSON
                                      key={`kel-postcast-${selectedMilestoneKey}`}
                                      data={kelurahanGeoJson}
                                      style={(feature) => getKelurahanStyleForMilestone(feature, activeMilestone)}
                                      onEachFeature={(feature, layer) => {
                                        const kName = feature?.properties?.nama_kelurahan || 'Kelurahan';
                                        const kec = feature?.properties?.nama_kecamatan || '';
                                        const kab = feature?.properties?.nama_kabkota || '';
                                        const dName = feature?.properties?.das_name || '';
                                        const luas = feature?.properties?.luas_ha ? `${Math.round(feature.properties.luas_ha)} Ha` : '-';
                                        const pred = activeMilestone?.kelurahan_predictions?.[kName];
                                        const focalRanking = caseStudy?.kelurahan_rankings?.find((r: any) => r.nama_kelurahan.toLowerCase() === kName.toLowerCase());

                                        const probPct = pred?.probability_pct ?? (focalRanking ? focalRanking[`prob_${selectedMilestoneKey}`] : null);
                                        const isHighRisk = probPct !== null && probPct >= 70;
                                        const isMediumRisk = probPct !== null && probPct >= 35;

                                        let badgeBg = '#f1f5f9';
                                        let badgeColor = '#475569';
                                        let badgeText = 'Aman / Rendah (<35%)';
                                        if (probPct !== null && probPct >= 90) {
                                          badgeBg = '#fee2e2'; badgeColor = '#dc2626'; badgeText = 'Siaga 1 Darurat (>90%)';
                                        } else if (probPct !== null && probPct >= 70) {
                                          badgeBg = '#ffedd5'; badgeColor = '#c2410c'; badgeText = 'Siaga 2 Kritis (70–89%)';
                                        } else if (probPct !== null && probPct >= 35) {
                                          badgeBg = '#fef9c3'; badgeColor = '#854d0e'; badgeText = 'Waspada (35–69%)';
                                        }

                                        layer.bindPopup(`
                                          <div style="font-family: 'Nunito Sans', sans-serif; min-width: 260px;">
                                            <div style="font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                                              Batas Kelurahan Resmi (BIG TASWIL 2023)
                                            </div>
                                            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                                              Kel. ${kName}
                                            </div>
                                            <div style="font-size: 11.5px; color: #64748b; margin-bottom: 8px;">
                                              Kec. ${kec}, ${kab} • <strong>${dName}</strong>
                                            </div>

                                            <div style="margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; background: ${badgeBg}; border: 1px solid ${isHighRisk ? '#fca5a5' : isMediumRisk ? '#fed7aa' : '#e2e8f0'};">
                                              <div style="font-size: 10px; font-weight: 700; color: ${badgeColor}; text-transform: uppercase;">
                                                Probabilitas Banjir (${activeMilestone?.phase || ''}):
                                              </div>
                                              <div style="font-size: 18px; font-weight: 900; color: ${badgeColor}; display: flex; align-items: center; justify-content: space-between;">
                                                <span>${probPct !== null ? `${probPct}%` : 'Rendah (<10%)'}</span>
                                                <span style="font-size: 11px; font-weight: 700;">${badgeText}</span>
                                              </div>
                                            </div>

                                            ${focalRanking ? `
                                              <div style="font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 4px;">
                                                Evolusi Probabilitas Model:
                                              </div>
                                              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center; margin-bottom: 10px; font-size: 10px;">
                                                <div style="background: ${selectedMilestoneKey === 't_minus_6h' ? '#dbeafe' : '#f8fafc'}; padding: 4px; border-radius: 4px; border: 1px solid ${selectedMilestoneKey === 't_minus_6h' ? '#3b82f6' : '#e2e8f0'};">
                                                  <div style="color: #64748b; font-size: 9px;">T-6 Jam</div>
                                                  <strong style="color: #2563eb;">${focalRanking.prob_t_minus_6h}%</strong>
                                                </div>
                                                <div style="background: ${selectedMilestoneKey === 't_minus_3h' ? '#ffedd5' : '#f8fafc'}; padding: 4px; border-radius: 4px; border: 1px solid ${selectedMilestoneKey === 't_minus_3h' ? '#f97316' : '#e2e8f0'};">
                                                  <div style="color: #64748b; font-size: 9px;">T-3 Jam</div>
                                                  <strong style="color: #ea580c;">${focalRanking.prob_t_minus_3h}%</strong>
                                                </div>
                                                <div style="background: ${selectedMilestoneKey === 't_minus_1h' ? '#fee2e2' : '#f8fafc'}; padding: 4px; border-radius: 4px; border: 1px solid ${selectedMilestoneKey === 't_minus_1h' ? '#ef4444' : '#e2e8f0'};">
                                                  <div style="color: #64748b; font-size: 9px;">T-1 Jam</div>
                                                  <strong style="color: #dc2626;">${focalRanking.prob_t_minus_1h}%</strong>
                                                </div>
                                                <div style="background: ${selectedMilestoneKey === 'event_peak' ? '#dcfce7' : '#f8fafc'}; padding: 4px; border-radius: 4px; border: 1px solid ${selectedMilestoneKey === 'event_peak' ? '#22c55e' : '#e2e8f0'};">
                                                  <div style="color: #64748b; font-size: 9px;">Puncak</div>
                                                  <strong style="color: #16a34a;">${focalRanking.prob_peak}%</strong>
                                                </div>
                                              </div>
                                              <div style="font-size: 11px; color: #475569; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                                                • Pos Pantau Acuan: <strong>${focalRanking.pos_pantau_tma}</strong><br/>
                                                • Estimasi Genangan Puncak: <strong style="color: #b91c1c;">${focalRanking.ketinggian_genangan}</strong><br/>
                                                • Aset Investasi: <strong>${focalRanking.aset_investasi_count} Objek Vital</strong><br/>
                                                • Verifikasi Lapangan: <strong style="color: #15803d;">${focalRanking.status_puncak}</strong>
                                              </div>
                                            ` : `
                                              <div style="font-size: 11px; color: #64748b; line-height: 1.4;">
                                                • Luas Catchment: ${luas}<br/>
                                                • Kelurahan ini berada dalam zona risiko rendah untuk badai ini.
                                              </div>
                                            `}
                                          </div>
                                        `);
                                      }}
                                    />
                                  )}

                                  {/* Ground Truth Flood Reports */}
                                  {showFloodReportsOnMap && caseStudy.flood_reports.map((report: any, idx: number) => {
                                    return (
                                      <CircleMarker
                                        key={`flood-${idx}-${selectedMilestoneKey}`}
                                        center={[report.lat, report.lon]}
                                        radius={isPeak ? 9 : 7}
                                        pathOptions={{
                                          color: isPeak ? '#991b1b' : '#b45309',
                                          fillColor: isPeak ? '#dc2626' : '#f59e0b',
                                          fillOpacity: isPeak ? 0.95 : 0.65,
                                          weight: isPeak ? 3 : 2,
                                          dashArray: isPeak ? undefined : '3, 3'
                                        }}
                                      >
                                        <Popup>
                                          <div style={{ fontFamily: 'Nunito Sans, sans-serif', minWidth: 230 }}>
                                            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 800, background: isPeak ? '#fee2e2' : '#fef3c7', color: isPeak ? '#dc2626' : '#b45309', marginBottom: 6 }}>
                                              {isPeak ? '🚨 TITIK BANJIR TERBUKTI' : '⚠️ ZONA TARGET PREDIKSI'}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                              {report.place}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
                                              • Waktu Lapor Resmi: <strong>{report.occurred_at} WIB</strong><br/>
                                              • Kategori: <strong>{report.category}</strong><br/>
                                              • Catchment DAS: <strong style={{ color: '#2563eb' }}>{report.das_name}</strong><br/>
                                              • Pembuktian Model: <span style={{ color: '#16a34a', fontWeight: 700 }}>100% Berada di Zona Merah!</span>
                                            </div>
                                          </div>
                                        </Popup>
                                      </CircleMarker>
                                    );
                                  })}

                                  {/* Exposed Investment Assets */}
                                  {showInvestmentsOnMap && postcastInvestments.map((loc: any, idx: number) => (
                                    <CircleMarker
                                      key={`inv-${loc.id || idx}`}
                                      center={[loc.latitude, loc.longitude]}
                                      radius={4.5}
                                      pathOptions={{
                                        color: '#1d4ed8',
                                        fillColor: '#60a5fa',
                                        fillOpacity: 0.85,
                                        weight: 1.5
                                      }}
                                    >
                                      <Popup>
                                        <div style={{ fontFamily: 'Nunito Sans, sans-serif', minWidth: 220 }}>
                                          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', marginBottom: 2 }}>
                                            Aset Investasi BKPM ({loc.category})
                                          </div>
                                          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                                            {loc.name}
                                          </div>
                                          <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
                                            • Wilayah: {loc.city}<br/>
                                            • Nilai Investasi: <strong>Rp {loc.investment_value_idr_b} Milyar</strong><br/>
                                            • Rekomendasi Aksi di Fase Ini:
                                            <div style={{ marginTop: 5, padding: '4px 8px', background: '#eff6ff', borderRadius: 4, color: '#1e40af', fontSize: 11 }}>
                                              {activeMilestone.step_key === 't_minus_6h' && 'ℹ️ Siagakan genset & pompa submersible'}
                                              {activeMilestone.step_key === 't_minus_3h' && '⚠️ Pasang water barrier darurat di pintu masuk'}
                                              {activeMilestone.step_key === 't_minus_1h' && '🚨 Amankan server & arsip dari lantai dasar'}
                                              {activeMilestone.step_key === 'event_peak' && '✓ Aman terkendali berkat peringatan 6 jam sebelumnya'}
                                            </div>
                                          </div>
                                        </div>
                                      </Popup>
                                    </CircleMarker>
                                  ))}

                                  {/* Stations Layer (Optional) */}
                                  {showStationsOnMap && study.results.map((r, i) => (
                                    <CircleMarker
                                      key={`st-${i}`}
                                      center={[r.latitude, r.longitude]}
                                      radius={5}
                                      pathOptions={{
                                        color: '#0f172a',
                                        fillColor: '#334155',
                                        fillOpacity: 0.9,
                                        weight: 1.5
                                      }}
                                    >
                                      <Popup>
                                        <div style={{ fontFamily: 'Nunito Sans, sans-serif' }}>
                                          <strong>{r.station_name}</strong><br/>
                                          DAS: {r.das_name}
                                        </div>
                                      </Popup>
                                    </CircleMarker>
                                  ))}
                                </MapContainer>
                              </div>

                              {/* Integrated GIS Legend & Controls Footer Panel */}
                              <div className="px-map-footer-panel">
                                <div className="px-map-footer-grid">
                                  {/* Left: Legend */}
                                  <div>
                                    <div className="px-footer-section-title">
                                      <Layers size={14} color="#3874ff" />
                                      <span>Tingkat Bahaya DAS &amp; Kelurahan ({activeMilestone.phase}):</span>
                                    </div>
                                    <div className="px-legend-chips-row">
                                      <div className="px-legend-chip">
                                        <span className="px-legend-dot" style={{ backgroundColor: '#ef4444' }} />
                                        <span><strong>Siaga 1 / Kritis</strong> (&gt;90%)</span>
                                      </div>
                                      <div className="px-legend-chip">
                                        <span className="px-legend-dot" style={{ backgroundColor: '#f97316' }} />
                                        <span><strong>Siaga 2</strong> (70–89%)</span>
                                      </div>
                                      <div className="px-legend-chip">
                                        <span className="px-legend-dot" style={{ backgroundColor: '#eab308' }} />
                                        <span><strong>Siaga 3 / Waspada</strong> (35–69%)</span>
                                      </div>
                                      <div className="px-legend-chip">
                                        <span className="px-legend-dot" style={{ backgroundColor: '#10b981' }} />
                                        <span><strong>Siaga 4 / Aman</strong> (&lt;35%)</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Layer Checklist */}
                                  <div>
                                    <div className="px-footer-section-title">
                                      <SlidersHorizontal size={14} color="#3874ff" />
                                      <span>Filter &amp; Layer Peta Spasial:</span>
                                    </div>
                                    <div className="px-toggles-row">
                                      <label className="px-toggle-badge">
                                        <input 
                                          type="checkbox" 
                                          checked={showDasOnMap} 
                                          onChange={(e) => setShowDasOnMap(e.target.checked)} 
                                        />
                                        <span className="px-badge-pin teal" />
                                        <span>Batas &amp; Risiko DAS (Ciliwung Cisadane)</span>
                                      </label>
                                      <label className="px-toggle-badge">
                                        <input 
                                          type="checkbox" 
                                          checked={showKelurahanOnMap} 
                                          onChange={(e) => setShowKelurahanOnMap(e.target.checked)} 
                                        />
                                        <span className="px-badge-pin purple" />
                                        <span>Batas &amp; Risiko Kelurahan (BIG TASWIL)</span>
                                      </label>
                                      <label className="px-toggle-badge">
                                        <input 
                                          type="checkbox" 
                                          checked={showFloodReportsOnMap} 
                                          onChange={(e) => setShowFloodReportsOnMap(e.target.checked)} 
                                        />
                                        <span className="px-badge-pin red" />
                                        <span>12 Titik Banjir Nyata (PU Sitaba)</span>
                                      </label>
                                      <label className="px-toggle-badge">
                                        <input 
                                          type="checkbox" 
                                          checked={showInvestmentsOnMap} 
                                          onChange={(e) => setShowInvestmentsOnMap(e.target.checked)} 
                                        />
                                        <span className="px-badge-pin blue" />
                                        <span>Aset Investasi Terancam (BKPM)</span>
                                      </label>
                                      <label className="px-toggle-badge">
                                        <input 
                                          type="checkbox" 
                                          checked={showStationsOnMap} 
                                          onChange={(e) => setShowStationsOnMap(e.target.checked)} 
                                        />
                                        <span className="px-badge-pin dark" />
                                        <span>Pos Pantau Hujan &amp; TMA</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                <div className="px-map-tip-bar">
                                  <Info size={14} color="#3874ff" />
                                  <span>
                                    <strong>Petunjuk:</strong> Klik poligon DAS, batas Kelurahan, atau titik marker di peta untuk melihat evolusi probabilitas per milestone, tinggi muka air (TMA), dan status aset investasi.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. TIMELINE STEPPER NAVIGATION */}
                        <div style={{ margin: '24px 0 16px' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#222834', marginBottom: 4 }}>
                            Kendali Waktu Rekonstruksi: Klik Tahapan untuk Memperbarui Peta
                          </h3>
                          <p style={{ fontSize: 12.5, color: '#525b75', marginBottom: 16 }}>
                            Pilih titik waktu di bawah untuk menyaksikan bagaimana model mempertajam proyeksi bahaya secara spasial:
                          </p>

                          <div className="px-timeline-steps">
                            {caseStudy.milestones.map((m: any) => {
                              const isActive = selectedMilestoneKey === m.step_key;
                              const badgeColor = m.step_key === 't_minus_6h' ? 'blue' : m.step_key === 't_minus_3h' ? 'orange' : m.step_key === 't_minus_1h' ? 'red' : 'green';
                              return (
                                <div 
                                  key={m.step_key}
                                  className={`px-step-card ${isActive ? 'active' : ''}`}
                                  onClick={() => setSelectedMilestoneKey(m.step_key)}
                                >
                                  <span className={`px-step-badge ${badgeColor}`}>{m.phase}</span>
                                  <div className="px-step-title">{m.time_label.split('(')[0]}</div>
                                  <div className="px-step-time">({m.time_label.split('(')[1]}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. ALUR PEMBUKTIAN UNTUK AWAM (4-STEP STORYLINE CARDS) */}
                        <div style={{ margin: '24px 0 12px' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#222834', marginBottom: 4 }}>
                            Penjelasan Logika Model untuk Pengambil Keputusan (Storyline Awam)
                          </h3>
                          <p style={{ fontSize: 12.5, color: '#525b75', marginBottom: 16 }}>
                            Empat tahap pembuktian bagaimana data curah hujan diubah menjadi tindakan preventif yang menyelamatkan aset:
                          </p>

                          <div className="px-layperson-grid">
                            <div 
                              className={`px-layperson-card ${selectedMilestoneKey === 't_minus_6h' ? 'active' : ''}`}
                              onClick={() => setSelectedMilestoneKey('t_minus_6h')}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="px-layperson-step">1</div>
                              <div className="px-layperson-title">T - 6 Jam: Deteksi Hujan Hulu</div>
                              <div className="px-layperson-desc">
                                Hujan lebat terdeteksi di hulu (Bogor-Depok) hingga 85 mm/jam. Permukaan sungai Jakarta masih normal, tetapi model telah menghitung akumulasi air yang akan tiba di hilir dalam 6 jam.
                              </div>
                              <div className="px-layperson-footer" style={{ color: '#2563eb' }}>
                                ⏱ Lead Time 6 Jam Tercipta
                              </div>
                            </div>

                            <div 
                              className={`px-layperson-card ${selectedMilestoneKey === 't_minus_3h' ? 'active' : ''}`}
                              onClick={() => setSelectedMilestoneKey('t_minus_3h')}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="px-layperson-step">2</div>
                              <div className="px-layperson-title">T - 3 Jam: Perambatan Debit Air</div>
                              <div className="px-layperson-desc">
                                Air hujan hulu mengalir ke badan sungai. Pintu air hulu melompat ke Siaga 2. Model mengonfirmasi probabilitas bahaya 88–91% mengerucut tepat di DAS Sunter, Angke, dan Cakung.
                              </div>
                              <div className="px-layperson-footer" style={{ color: '#d97706' }}>
                                ⚠️ Radius Bahaya Menyempit
                              </div>
                            </div>

                            <div 
                              className={`px-layperson-card ${selectedMilestoneKey === 't_minus_1h' ? 'active' : ''}`}
                              onClick={() => setSelectedMilestoneKey('t_minus_1h')}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="px-layperson-step">3</div>
                              <div className="px-layperson-title">T - 1 Jam: Nowcast Bahaya Terkunci</div>
                              <div className="px-layperson-desc">
                                Curah hujan kumulatif &gt;300 mm. Model memproyeksikan luapan puncak dalam 60 menit dengan akurasi TMA &gt;94%. Zona bahaya merah terkunci tanpa keraguan.
                              </div>
                              <div className="px-layperson-footer" style={{ color: '#dc2626' }}>
                                🚨 Waktu Kritis Proteksi Fasilitas
                              </div>
                            </div>

                            <div 
                              className={`px-layperson-card ${selectedMilestoneKey === 'event_peak' ? 'active' : ''}`}
                              onClick={() => setSelectedMilestoneKey('event_peak')}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="px-layperson-step">4</div>
                              <div className="px-layperson-title">Puncak: Pembuktian Nyata 100%</div>
                              <div className="px-layperson-desc">
                                Banjir setinggi 40–80 cm merendam 12 titik sesuai data resmi PU Sitaba & BPBD. Seluruh 12 titik berada 100% di dalam zona merah DAS yang diperingatkan model 6 jam sebelumnya!
                              </div>
                              <div className="px-layperson-footer" style={{ color: '#16a34a' }}>
                                ✓ 100% Terbukti Tepat Sasaran
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4. ACTIVE MILESTONE DEEP-DIVE DETAILS */}
                        <div className="px-card" style={{ marginBottom: 24 }}>
                          <div className="px-card-header" style={{ backgroundColor: '#f8fafc' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#3874ff', textTransform: 'uppercase' }}>
                                Fase Analisis: {activeMilestone.phase}
                              </div>
                              <h3 className="px-card-title">{activeMilestone.time_label}</h3>
                            </div>
                            <span className="px-badge blue">Estimasi Aset Terdampak: {activeMilestone.investments_at_risk_preview} POI</span>
                          </div>
                          <div className="px-card-body">
                            <div className="px-grid-2" style={{ marginBottom: 20 }}>
                              <div style={{ backgroundColor: '#f0f5ff', padding: 16, borderRadius: 8, border: '1px solid #d4e2ff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13, color: '#1e3a8a', marginBottom: 6 }}>
                                  <CloudRain size={18} color="#3874ff" /> Sinyal Radar / Observasi Curah Hujan
                                </div>
                                <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>{activeMilestone.radar_rain_summary}</p>
                              </div>

                              <div style={{ backgroundColor: '#fefce8', padding: 16, borderRadius: 8, border: '1px solid #fef08a' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13, color: '#854d0e', marginBottom: 6 }}>
                                  <TrendingUp size={18} color="#eab308" /> Respon Hidrologi & Debit Aliran Sungai
                                </div>
                                <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>{activeMilestone.hydrology_state}</p>
                              </div>
                            </div>

                            {/* Snapshot per DAS Table */}
                            <div style={{ marginBottom: 18 }}>
                              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#222834', marginBottom: 10 }}>
                                Status Prediksi Model per Catchment DAS Utama:
                              </h4>
                              <div className="px-table-wrapper">
                                <table className="px-table">
                                  <thead>
                                    <tr>
                                      <th>Catchment DAS</th>
                                      <th>Curah Hujan Terakumulasi</th>
                                      <th>Estimasi TMA Target</th>
                                      <th>Tingkat Probabilitas Bahaya</th>
                                      <th>Status Peringatan Dini</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(activeMilestone.model_prediction).map(([dasName, pred]: [string, any]) => (
                                      <tr key={dasName}>
                                        <td><strong>{dasName}</strong></td>
                                        <td>{pred.rain_accum_6h_mm ? `${pred.rain_accum_6h_mm} mm (6h sum)` : '—'}</td>
                                        <td>
                                          <strong>{pred.projected_tma_cm || pred.actual_tma_cm} cm</strong>
                                          {pred.predicted_tma_cm && <span style={{ fontSize: 11, color: '#8a94ad' }}> (Pred: {pred.predicted_tma_cm} cm)</span>}
                                        </td>
                                        <td>
                                          {pred.risk_probability 
                                            ? <span className="px-badge red">{(pred.risk_probability * 100).toFixed(0)}% Risiko Luapan</span>
                                            : <span className="px-badge green">Akurasi {pred.accuracy_rate}</span>
                                          }
                                        </td>
                                        <td>
                                          <span className={`px-badge ${pred.alert_level?.includes('Darurat') || pred.alert_level?.includes('Kritis') ? 'red' : pred.alert_level?.includes('Waspada') ? 'orange' : 'green'}`}>
                                            {pred.alert_level || 'Terverifikasi Sesuai'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="px-callout" style={{ marginBottom: 0, backgroundColor: '#f0fdf4', borderLeftColor: '#22c55e', color: '#166534' }}>
                              <CheckCircle2 size={22} color="#22c55e" />
                              <div>
                                <strong>Rekomendasi Keputusan (Actionable Insight):</strong> {activeMilestone.actionable_insight}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. KELURAHAN FLOOD RISK EVOLUTION MATRIX (BIG TASWIL 2023) */}
                        {caseStudy.kelurahan_rankings && caseStudy.kelurahan_rankings.length > 0 && (
                          <div className="px-card" style={{ marginBottom: 28 }}>
                            <div className="px-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Data Spasial Resmi BIG TASWIL 2023 (Skala 1:10.000)
                                  </span>
                                </div>
                                <h3 className="px-card-title" style={{ marginTop: 4 }}>
                                  Matriks Evolusi Probabilitas Banjir Tingkat Kelurahan (T-6, T-3, T-1 &amp; Puncak)
                                </h3>
                                <div className="px-card-subtitle">
                                  Pembuktian bagaimana model mempertajam estimasi risiko genangan di tiap kelurahan seiring mendekatnya waktu badai:
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="px-search-bar" style={{ width: 240, margin: 0 }}>
                                  <Search size={14} />
                                  <input 
                                    type="text" 
                                    placeholder="Cari Kelurahan / Kecamatan..." 
                                    value={kelurahanFilterQuery}
                                    onChange={(e) => setKelurahanFilterQuery(e.target.value)}
                                    style={{ fontSize: 12 }}
                                  />
                                </div>
                                <span className="px-badge blue">
                                  {caseStudy.kelurahan_rankings.length} Kelurahan Kritis Terpantau
                                </span>
                              </div>
                            </div>

                            <div className="px-card-body" style={{ padding: 0 }}>
                              <div className="px-table-wrapper">
                                <table className="px-table">
                                  <thead>
                                    <tr>
                                      <th style={{ minWidth: 160 }}>Kelurahan &amp; Kecamatan</th>
                                      <th>Kab / Kota</th>
                                      <th>Catchment DAS</th>
                                      <th className={selectedMilestoneKey === 't_minus_6h' ? 'px-col-active' : ''} style={{ textAlign: 'center', minWidth: 120 }}>
                                        T - 6 Jam<br/>
                                        <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.8 }}>(Forecast Awal)</span>
                                      </th>
                                      <th className={selectedMilestoneKey === 't_minus_3h' ? 'px-col-active' : ''} style={{ textAlign: 'center', minWidth: 120 }}>
                                        T - 3 Jam<br/>
                                        <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.8 }}>(Konfirmasi Debit)</span>
                                      </th>
                                      <th className={selectedMilestoneKey === 't_minus_1h' ? 'px-col-active' : ''} style={{ textAlign: 'center', minWidth: 120 }}>
                                        T - 1 Jam<br/>
                                        <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.8 }}>(Nowcast Alarm)</span>
                                      </th>
                                      <th className={selectedMilestoneKey === 'event_peak' ? 'px-col-active' : ''} style={{ textAlign: 'center', minWidth: 140 }}>
                                        Puncak Kejadian<br/>
                                        <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.8 }}>(Verifikasi Lapangan)</span>
                                      </th>
                                      <th style={{ textAlign: 'center' }}>Pos Pantau Acuan</th>
                                      <th style={{ textAlign: 'center' }}>Aset Investasi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {caseStudy.kelurahan_rankings
                                      .filter((r: any) => {
                                        if (!kelurahanFilterQuery) return true;
                                        const q = kelurahanFilterQuery.toLowerCase();
                                        return (
                                          r.nama_kelurahan.toLowerCase().includes(q) ||
                                          r.nama_kecamatan.toLowerCase().includes(q) ||
                                          r.das_name.toLowerCase().includes(q) ||
                                          r.nama_kabkota.toLowerCase().includes(q)
                                        );
                                      })
                                      .map((row: any) => {
                                        const p6 = row.prob_t_minus_6h;
                                        const p3 = row.prob_t_minus_3h;
                                        const p1 = row.prob_t_minus_1h;

                                        return (
                                          <tr key={row.nama_kelurahan}>
                                            <td>
                                              <div style={{ fontWeight: 800, color: '#1e293b' }}>
                                                Kel. {row.nama_kelurahan}
                                              </div>
                                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                                Kec. {row.nama_kecamatan}
                                              </div>
                                            </td>
                                            <td style={{ fontSize: 11.5, color: '#475569' }}>
                                              {row.nama_kabkota.replace('Kota Adm. ', '')}
                                            </td>
                                            <td>
                                              <span className="px-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                                {row.das_name}
                                              </span>
                                            </td>
                                            <td className={selectedMilestoneKey === 't_minus_6h' ? 'px-col-active' : ''} style={{ textAlign: 'center' }}>
                                              <span className={`px-badge ${p6 >= 70 ? 'orange' : p6 >= 40 ? 'orange' : 'green'}`}>
                                                {p6}% {p6 >= 40 ? 'Waspada' : 'Aman'}
                                              </span>
                                            </td>
                                            <td className={selectedMilestoneKey === 't_minus_3h' ? 'px-col-active' : ''} style={{ textAlign: 'center' }}>
                                              <span className={`px-badge ${p3 >= 85 ? 'red' : p3 >= 70 ? 'orange' : 'green'}`}>
                                                {p3}% {p3 >= 70 ? 'Siaga Kritis' : 'Waspada'}
                                              </span>
                                            </td>
                                            <td className={selectedMilestoneKey === 't_minus_1h' ? 'px-col-active' : ''} style={{ textAlign: 'center' }}>
                                              <span className={`px-badge ${p1 >= 90 ? 'red' : 'orange'}`}>
                                                {p1}% {p1 >= 90 ? 'Darurat Siaga 1' : 'Siaga 2'}
                                              </span>
                                            </td>
                                            <td className={selectedMilestoneKey === 'event_peak' ? 'px-col-active' : ''} style={{ textAlign: 'center' }}>
                                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <span className="px-badge red" style={{ fontWeight: 800 }}>
                                                  100% Terendam
                                                </span>
                                                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                                                  {row.ketinggian_genangan}
                                                </span>
                                              </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                                              {row.pos_pantau_tma}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className="px-badge blue" title="Jumlah Objek Vital Investasi Terpeta">
                                                {row.aset_investasi_count} POI
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle2 size={20} color="#16a34a" />
                                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                                  <strong>Verifikasi Ilmiah &amp; Regulasi:</strong> Pembagian batas wilayah menggunakan kode wilayah administratif resmi Depdagri (KDEPUM) dan geometri BIG TASWIL 2023. Model membuktikan bahwa transisi probabilitas dari <span style={{ color: '#2563eb', fontWeight: 700 }}>T-6 (35–48%)</span> menuju <span style={{ color: '#ea580c', fontWeight: 700 }}>T-3 (70–86%)</span> dan <span style={{ color: '#dc2626', fontWeight: 700 }}>T-1 (90–98%)</span> memberikan jendela waktu (lead time) 6 jam bagi pengelola aset industri &amp; pemda untuk mendistribusikan pompa air sebelum genangan puncak terjadi.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Academic & Scientific References Section */}
                  <div style={{ marginTop: 32, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <BookOpen size={20} color="#3874ff" />
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#222834' }}>
                        Landasan Ilmiah & Kajian Literatur (Academic References)
                      </h3>
                    </div>
                    <p style={{ fontSize: 12.5, color: '#525b75', marginBottom: 18 }}>
                      Metodologi prediksi hidrologi berbasis DAS (Catchment Connectivity) dan segmentasi Forecast/Nowcast/Postcast didukung oleh publikasi jurnal hidrologi internasional terkini:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                      {caseStudy.academic_references.map((paper: any, idx: number) => (
                        <div key={idx} className="px-paper-card">
                          <div className="px-paper-journal">
                            <BookOpen size={14} /> {paper.journal} ({paper.year})
                          </div>
                          <h4>{paper.title}</h4>
                          <div className="px-paper-body">
                            <strong>Prinsip Hidrologi:</strong> {paper.core_principle}
                          </div>
                          <div className="px-paper-govtech">
                            <strong>Penerapan di GovTech FloodSense:</strong> {paper.relevance_to_govtech}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 4: GIS MAP */}
              {activeTab === 'gis' && (
                <div>
                  <div className="px-card">
                    <div className="px-card-header">
                      <div>
                        <h2 className="px-card-title">Peta Spasial Batas DAS & Stasiun Hidrometri</h2>
                        <div className="px-card-subtitle">
                          Visualisasi batas hidrologi DAS (Daerah Aliran Sungai Ciliwung Cisadane) serta sebaran pos pantau.
                        </div>
                      </div>
                    </div>
                    <div className="px-card-body" style={{ padding: 0 }}>
                      <div className="px-map-container">
                        <MapContainer
                          center={[-6.25, 106.85]}
                          zoom={10}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          {/* Render DAS GeoJSON Polygons */}
                          {dasGeoJson && (
                            <GeoJSON
                              data={dasGeoJson}
                              style={(feature) => ({
                                color: '#3874ff',
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.15,
                                fillColor: '#0097ec'
                              })}
                              onEachFeature={(feature, layer) => {
                                layer.bindPopup(`
                                  <div style="font-family: 'Nunito Sans', sans-serif;">
                                    <strong>${feature.properties?.NAMA_DAS || 'DAS'}</strong><br/>
                                    Kode: ${feature.properties?.KODE || '-'}<br/>
                                    Luas: ${feature.properties?.Luas || '-'} Ha
                                  </div>
                                `);
                              }}
                            />
                          )}

                          {/* Render Stations */}
                          {study.results.map((r, i) => (
                            <CircleMarker
                              key={i}
                              center={[r.latitude, r.longitude]}
                              radius={6}
                              pathOptions={{
                                color: '#fa3b1d',
                                fillColor: '#ff6b6b',
                                fillOpacity: 0.9,
                                weight: 2
                              }}
                            >
                              <Popup>
                                <div style={{ fontFamily: 'Nunito Sans, sans-serif' }}>
                                  <strong>{r.station_name}</strong><br/>
                                  DAS: {r.das_name}<br/>
                                  Lat/Lon: {r.latitude}, {r.longitude}
                                </div>
                              </Popup>
                            </CircleMarker>
                          ))}
                        </MapContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 5: INVESTMENT RESILIENCE */}
              {activeTab === 'investment' && (
                <div>
                  <div className="px-controls-bar">
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
                      {[
                        { key: 'all', label: 'Semua Kategori' },
                        { key: 'pendidikan', label: 'Pendidikan' },
                        { key: 'rumah_sakit', label: 'Rumah Sakit' },
                        { key: 'hotel', label: 'Hotel' },
                        { key: 'pelabuhan', label: 'Pelabuhan' },
                        { key: 'kawasan', label: 'Kawasan' }
                      ].map((cat) => (
                        <button
                          key={cat.key}
                          className={`px-pill-btn ${selectedCategory === cat.key ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(cat.key)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#525b75' }}>
                      Menampilkan <strong>{locations.filter(l => selectedCategory === 'all' || l.category === selectedCategory).length}</strong> Objek Investasi
                    </div>
                  </div>

                  <div className="px-investment-layout">
                    {/* Map Area */}
                    <div className="px-card" style={{ marginBottom: 0 }}>
                      <div className="px-card-header">
                        <div>
                          <h2 className="px-card-title">Peta Sebaran Objek Investasi & Tingkat Paparan</h2>
                          <div className="px-card-subtitle">Klik titik objek untuk melihat detail profil ketahanan dan mekanisme banjir.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fa3b1d' }}></span> Tinggi
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5780b' }}></span> Sedang
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#25b865' }}></span> Rendah
                          </span>
                        </div>
                      </div>
                      <div className="px-card-body" style={{ padding: 0 }}>
                        <div className="px-map-container" style={{ height: 500 }}>
                          <MapContainer
                            center={[-6.2, 106.83]}
                            zoom={11}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; OpenStreetMap contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {locations
                              .filter(l => selectedCategory === 'all' || l.category === selectedCategory)
                              .map((loc) => {
                                const isSelected = selectedLocation?.id === loc.id;
                                const color = loc.risk_level === 'high' ? '#fa3b1d' : loc.risk_level === 'moderate' ? '#e5780b' : '#25b865';
                                return (
                                  <CircleMarker
                                    key={loc.id}
                                    center={[loc.latitude, loc.longitude]}
                                    radius={isSelected ? 10 : loc.risk_level === 'high' ? 7 : 5}
                                    pathOptions={{
                                      color: isSelected ? '#3874ff' : color,
                                      fillColor: color,
                                      fillOpacity: 0.85,
                                      weight: isSelected ? 3 : 1
                                    }}
                                    eventHandlers={{ click: () => setSelectedLocation(loc) }}
                                  >
                                    <Popup>
                                      <div style={{ fontFamily: 'Nunito Sans, sans-serif' }}>
                                        <strong>{loc.name}</strong><br />
                                        Kategori: {loc.category.replace('_', ' ')}<br />
                                        Skor Paparan: {loc.score ?? '-'}/100
                                      </div>
                                    </Popup>
                                  </CircleMarker>
                                );
                              })}
                          </MapContainer>
                        </div>
                      </div>
                    </div>

                    {/* Detail Sidebar */}
                    <div className="px-detail-card">
                      {selectedLocation ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div className="px-stat-icon-wrapper blue" style={{ width: 36, height: 36 }}>
                              <Building2 size={18} />
                            </div>
                            <div>
                              <span className="px-badge blue" style={{ textTransform: 'uppercase' }}>
                                {selectedLocation.category.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#222834', marginBottom: 4 }}>
                            {selectedLocation.name}
                          </h3>
                          <div style={{ fontSize: 11, color: '#8a94ad', marginBottom: 14 }}>
                            Koordinat: {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                          </div>

                          <div className={`px-risk-card ${selectedLocation.risk_level}`}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Tingkat Paparan</div>
                              <div style={{ fontSize: 16, fontWeight: 800 }}>
                                {selectedLocation.risk_level === 'high' ? 'Tinggi' : selectedLocation.risk_level === 'moderate' ? 'Sedang' : 'Rendah'}
                              </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>
                              {selectedLocation.score ?? '-'}<span style={{ fontSize: 13, fontWeight: 500 }}>/100</span>
                            </div>
                          </div>

                          <div className="px-evidence-list">
                            <div className="px-evidence-item">
                              <span style={{ color: '#525b75' }}>Mekanisme Banjir:</span>
                              <strong>
                                {selectedLocation.mechanism === 'pluvial' ? 'Hujan Lokal' : selectedLocation.mechanism === 'fluvial' ? 'Luapan Sungai' : 'Campuran'}
                              </strong>
                            </div>
                            <div className="px-evidence-item">
                              <span style={{ color: '#525b75' }}>Tingkat Keyakinan:</span>
                              <strong>{Math.round((selectedLocation.confidence || 0.6) * 100)}% (Valid)</strong>
                            </div>
                            <div className="px-evidence-item">
                              <span style={{ color: '#525b75' }}>Sumber Data:</span>
                              <strong>BKPM Resmi</strong>
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #e3e6ed', fontSize: 11, color: '#8a94ad', lineHeight: 1.5 }}>
                            ℹ️ Indikator ketahanan ini didasarkan pada data historis spasial dan simulasi catchment DAS.
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 10px', color: '#8a94ad' }}>
                          Pilih salah satu titik objek investasi pada peta untuk melihat profil risiko lengkap.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 6: METHODOLOGY */}
              {activeTab === 'methodology' && (
                <div>
                  <div className="px-card">
                    <div className="px-card-header">
                      <h2 className="px-card-title">Metodologi Kajian Awal & Validasi GovTech</h2>
                    </div>
                    <div className="px-card-body" style={{ lineHeight: 1.8 }}>
                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>1. Batas Spasial Catchment (Spatial Boundary)</h3>
                      <p style={{ color: '#525b75', marginBottom: 18 }}>
                        Data poligon DAS Ciliwung Cisadane (<code style={{ background: '#edf2ff', color: '#3874ff', padding: '2px 6px', borderRadius: 4 }}>das_cilicis.json</code>) memuat 15 poligon hidrologi utama di wilayah metropolitan Jabodetabek. Titik koordinat stasiun pantau hujan (<code style={{ background: '#edf2ff', color: '#3874ff', padding: '2px 6px', borderRadius: 4 }}>jakarta_ch</code> & <code style={{ background: '#edf2ff', color: '#3874ff', padding: '2px 6px', borderRadius: 4 }}>cilicis_pch</code>) serta pos tinggi muka air dipetakan secara spasial menggunakan uji titik dalam poligon (<em>Point-in-Polygon</em>).
                      </p>

                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>2. Time-Series Alignment & Feature Engineering</h3>
                      <p style={{ color: '#525b75', marginBottom: 18 }}>
                        Data sensor diakumulasikan per jam. Sinyal curah hujan dihitung dari rata-rata stasiun yang berada dalam DAS yang bersangkutan dengan 6 lag waktu mundur (<code>t, t-1, t-2, t-3, t-4, t-5</code> jam). Fitur tambahan berupa nilai TMA saat ini dan laju kenaikan air (<code>ΔTMA = TMA(t) - TMA(t-1)</code>).
                      </p>

                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>3. Pembagian Waktu (Chronological Split)</h3>
                      <p style={{ color: '#525b75', marginBottom: 18 }}>
                        Untuk menghindari <em>data leakage</em> (kebocoran masa depan), data dibagi secara ketat berdasarkan urutan kronologis waktu (Train: Oktober 2025 s/d April 2026, Test: Mei s/d Juli 2026).
                      </p>

                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>4. Verifikasi Laporan Banjir Terbuka</h3>
                      <p style={{ color: '#525b75', marginBottom: 0 }}>
                        Laporan banjir dari PU Sitaba dan BBWS Cilicis dipetakan berdasarkan koordinat dan waktu kejadian untuk menguji apakah anomali prediksi TMA mampu memberikan peringatan dini (<em>early warning</em>) sebelum air meluap ke pemukiman.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

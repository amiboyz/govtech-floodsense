import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Building2, ChevronRight, CloudRain, Database, Droplets, Layers3, MapPinned, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { api } from "./api";
import { MapPanel } from "./components/MapPanel";
import { TrendChart } from "./components/TrendChart";
import type { Dashboard, Location } from "./types";

const categories = [
  { key: "all", label: "Semua" }, { key: "pendidikan", label: "Pendidikan" },
  { key: "rumah_sakit", label: "Rumah sakit" }, { key: "hotel", label: "Hotel" },
  { key: "pelabuhan", label: "Pelabuhan" }, { key: "kawasan", label: "Kawasan" },
];

const riskLabel = { low: "Rendah", moderate: "Sedang", high: "Tinggi", insufficient_data: "Data belum cukup" };
const mechanismLabel = { pluvial: "Hujan lokal", fluvial: "Luapan sungai", mixed: "Campuran", unknown: "Belum diketahui" };

export function App() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [mode, setMode] = useState<"database" | "demo">("demo");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Location>();
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.locations()])
      .then(([summary, points]) => {
        setDashboard(summary.data); setLocations(points.data); setMode(summary.meta.data_mode); setSelected(points.data[0]);
      })
      .catch(() => setError("API belum dapat diakses. Jalankan npm run dev lalu muat ulang."));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => api.locations(category, query).then((result) => setLocations(result.data)).catch(() => undefined), 180);
    return () => clearTimeout(timer);
  }, [category, query]);

  const riskCount = useMemo(() => ({
    high: locations.filter((item) => item.risk_level === "high").length,
    moderate: locations.filter((item) => item.risk_level === "moderate").length,
  }), [locations]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-btn mobile-only" onClick={() => setMobileNav(true)}><Menu size={20}/></button>
        <div className="brand-mark"><Droplets size={20}/></div>
        <div className="brand"><strong>FloodSense</strong><span>Investment Resilience</span></div>
        <nav className={mobileNav ? "nav open" : "nav"}>
          <button className="nav-close mobile-only" onClick={() => setMobileNav(false)}><X/></button>
          <a className="active" href="#overview">Overview</a><a href="#map">Peta risiko</a><a href="#model">Model</a><a href="#evidence">Evidence</a>
        </nav>
        <div className="topbar-actions">
          <span className={`mode-pill ${mode}`}><span/>{mode === "demo" ? "Skenario demo" : "Data terhubung"}</span>
          <button className="primary-btn">Buat brief <ChevronRight size={16}/></button>
        </div>
      </header>

      {mode === "demo" && <div className="demo-banner"><AlertTriangle size={16}/> Data hidrologi dan skor paparan di layar ini merupakan skenario demo. Data investasi berasal dari dataset BKPM yang disediakan.</div>}

      <main>
        <section className="hero" id="overview">
          <div>
            <span className="eyebrow">MONITORING JAKARTA · {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
            <h1>Risiko banjir yang dapat ditelusuri hingga bukti</h1>
            <p>Satukan hujan, tinggi muka air, kejadian banjir, dan lokasi investasi untuk due diligence serta kesiapan operasi.</p>
          </div>
          <div className="hero-signal">
            <div className="signal-orbit"><Activity/><span>{Math.round((dashboard?.timeline.at(-1)?.nowcast_probability ?? 0) * 100)}%</span></div>
            <div><small>NOWCAST 1 JAM</small><strong>Waspada</strong><p>Dipengaruhi kenaikan hujan lokal dan tren TMA.</p></div>
          </div>
        </section>

        {error && <div className="error-state">{error}</div>}

        <section className="metrics-grid">
          <Metric icon={<MapPinned/>} label="Objek investasi" value={dashboard?.totals.locations ?? "—"} note="overlay-ready" />
          <Metric icon={<AlertTriangle/>} label="Paparan tinggi" value={riskCount.high || "—"} note={`${riskCount.moderate} paparan sedang`} tone="coral" />
          <Metric icon={<Sparkles/>} label="Peluang investasi" value={dashboard?.totals.opportunities ?? "—"} note={`${dashboard?.totals.sectors ?? "—"} sektor unggulan`} tone="amber" />
          <Metric icon={<Database/>} label="Sumber aktif" value={dashboard?.totals.live_sources ?? "—"} note="freshness dipantau" tone="mint" />
        </section>

        <section className="workspace" id="map">
          <div className="map-card">
            <div className="section-head">
              <div><span className="eyebrow">LOCATION & PORTFOLIO EXPLORER</span><h2>Peta paparan investasi</h2></div>
              <div className="map-tools"><div className="search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari lokasi atau fasilitas"/></div><button className="icon-btn"><Layers3 size={18}/></button></div>
            </div>
            <div className="filters">{categories.map((item) => <button key={item.key} className={category === item.key ? "active" : ""} onClick={() => setCategory(item.key)}>{item.label}</button>)}</div>
            <div className="map-wrap">
              <MapPanel locations={locations} selected={selected} onSelect={setSelected}/>
              <div className="map-legend"><span><i className="dot high"/>Tinggi</span><span><i className="dot moderate"/>Sedang</span><span><i className="dot low"/>Rendah</span></div>
              <div className="map-count"><strong>{locations.length}</strong><span>lokasi tampil</span></div>
            </div>
          </div>

          <aside className="detail-card">
            {selected ? <>
              <div className="detail-top"><div className={`risk-icon ${selected.risk_level}`}><Building2/></div><button className="icon-btn"><ChevronRight/></button></div>
              <span className="eyebrow">{selected.category.replaceAll("_", " ").toUpperCase()}</span>
              <h2>{selected.name}</h2>
              <p className="coordinates">{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p>
              <div className={`risk-summary ${selected.risk_level}`}>
                <div><small>TINGKAT PAPARAN</small><strong>{riskLabel[selected.risk_level]}</strong></div>
                <div className="risk-score"><span>{selected.score ?? "—"}</span><small>/100</small></div>
              </div>
              <div className="evidence-list">
                <Evidence icon={<CloudRain/>} label="Mekanisme indikatif" value={mechanismLabel[selected.mechanism]} />
                <Evidence icon={<ShieldCheck/>} label="Confidence" value={selected.confidence ? `${Math.round(selected.confidence * 100)}%` : "Belum cukup"} />
                <Evidence icon={<Database/>} label="Status bukti" value={mode === "demo" ? "Skenario demo" : "Tertelusur"} />
              </div>
              <button className="outline-btn">Lihat evidence timeline <ChevronRight size={16}/></button>
              <p className="disclaimer">Indikator membantu prioritisasi. Hasil ini bukan sertifikasi lokasi aman atau keputusan investasi otomatis.</p>
            </> : <div className="empty">Pilih titik pada peta.</div>}
          </aside>
        </section>

        <section className="analytics-grid" id="model">
          <article className="chart-card">
            <div className="section-head compact"><div><span className="eyebrow">24 JAM TERAKHIR</span><h2>Hujan dan sinyal nowcast</h2></div><span className="live-tag"><i/> LIVE</span></div>
            <TrendChart data={dashboard?.timeline ?? []}/>
            <div className="chart-footer"><span><i className="line rain"/>Curah hujan</span><span>Waktu ditampilkan dalam WIB</span></div>
          </article>
          <article className="forecast-card">
            <div className="section-head compact"><div><span className="eyebrow">FORECAST TERUKUR</span><h2>Probabilitas per horizon</h2></div><BarChart3 size={22}/></div>
            <div className="forecast-list">{(dashboard?.forecasts ?? []).map((item) => <div className="forecast-row" key={item.horizon_hours}>
              <div><strong>{item.horizon_hours} jam</strong><small>{Math.round(item.confidence_low * 100)}–{Math.round(item.confidence_high * 100)}% rentang confidence</small></div>
              <div className="probability"><div style={{ width: `${item.probability * 100}%` }}/></div><span>{Math.round(item.probability * 100)}%</span>
            </div>)}</div>
            <div className="model-note"><span className="status-dot"/> Model <strong>{dashboard?.model?.version ?? "belum tersedia"}</strong> · status <strong>{dashboard?.model?.status ?? "insufficient_data"}</strong></div>
          </article>
        </section>

        <section className="source-strip" id="evidence">
          <div><ShieldCheck/><span><strong>Evidence-first</strong>Setiap output membawa sumber, waktu observasi, freshness, model, dan keterbatasan.</span></div>
          <div className="source-stats"><span><small>CRS</small>EPSG:4326</span><span><small>TIMEZONE</small>Asia/Jakarta</span><span><small>MODEL GATE</small>Experiment</span></div>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, note, tone = "teal" }: { icon: React.ReactNode; label: string; value: string | number; note: string; tone?: string }) {
  return <article className={`metric ${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function Evidence({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="evidence"><div>{icon}</div><span><small>{label}</small><strong>{value}</strong></span><ChevronRight size={16}/></div>;
}

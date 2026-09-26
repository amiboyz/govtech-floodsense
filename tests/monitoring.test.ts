import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeDb } from '../server/db.js';
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
} from '../server/services/monitoring.js';

test('infrastructure monitoring includes pumps, gates, and waduk/situ', async () => {
  const infra = await getMonitoringInfrastructure();
  assert.ok(infra.pumps.length >= 200);
  assert.ok(infra.gates.length >= 15);
  assert.ok(infra.waduk.length >= 60);

  const sampleWaduk = infra.waduk[0];
  assert.ok(sampleWaduk.id);
  assert.ok(sampleWaduk.name);
  assert.ok(Number.isFinite(sampleWaduk.latitude) && Number.isFinite(sampleWaduk.longitude));
});

test('arbitrary location evaluation computes spatial flood exposure, seasonal stats, and infrastructure profile', async () => {
  // Test Monas area (Central Jakarta: -6.1754, 106.8272)
  const evalMonas = await evaluateLocation(-6.1754, 106.8272);
  assert.ok(evalMonas);
  assert.equal(evalMonas.latitude, -6.1754);
  assert.equal(evalMonas.longitude, 106.8272);
  assert.ok(typeof evalMonas.risk_score === 'number');
  assert.ok(evalMonas.risk_score >= 0 && evalMonas.risk_score <= 100);
  assert.ok(['high', 'moderate', 'low'].includes(evalMonas.risk_level));
  assert.ok(evalMonas.risk_status_label);
  assert.ok(evalMonas.summary_rationale);

  // Hydrology connection
  assert.ok(evalMonas.nearest_tma);
  assert.ok(evalMonas.nearest_tma.name);
  assert.ok(evalMonas.nearest_tma.distance_km > 0);
  if (evalMonas.nearest_tma.seasonal_stats) {
    assert.ok(Number.isFinite(evalMonas.nearest_tma.seasonal_stats.max_level));
    assert.ok(Number.isFinite(evalMonas.nearest_tma.seasonal_stats.avg_rainy_season_level));
  }

  assert.ok(evalMonas.nearest_rain);
  assert.ok(evalMonas.nearest_rain.name);
  if (evalMonas.nearest_rain.seasonal_stats) {
    assert.ok(Number.isFinite(evalMonas.nearest_rain.seasonal_stats.max_rain_reading));
    assert.ok(Number.isFinite(evalMonas.nearest_rain.seasonal_stats.avg_rainy_season_reading));
  }

  // River connection
  assert.ok(evalMonas.nearest_river);
  assert.ok(evalMonas.nearest_river.name);

  // Flood control infrastructure connection
  assert.ok(evalMonas.nearest_pump);
  assert.ok(evalMonas.nearest_pump.name);
  assert.ok(evalMonas.nearest_pump.total >= 0);

  assert.ok(evalMonas.nearest_waduk);
  assert.ok(evalMonas.nearest_waduk.name);
  assert.ok(evalMonas.nearest_waduk.distance_km > 0);

  assert.ok(evalMonas.nearest_gate);
  assert.ok(evalMonas.nearest_gate.name);
});

test('monitoring summary provides comprehensive metrics across hydrometeorology & investments', async () => {
  const summary = await getMonitoringSummary();
  assert.ok(summary);
  assert.ok(summary.tma.total >= 50);
  assert.ok(summary.rain.total >= 50);
  assert.ok(summary.investments.total >= 500);
  assert.ok(summary.projects2026.total === 37);
  assert.ok(summary.reports.total >= 100);
  assert.ok(summary.infrastructure.pumps_total >= 10);
  assert.ok(summary.provenance.tma_source.includes('jakarta_tma'));
});

test('tma monitoring returns stations with official siaga thresholds and river coordinates', async () => {
  const list = await getMonitoringTMA();
  assert.ok(list.length > 0);
  for (const s of list) {
    assert.ok(s.station_id);
    assert.ok(s.name);
    assert.ok(Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    assert.ok(Number.isFinite(s.level));
    assert.ok([1, 2, 3, 4].includes(s.siaga_level));
    assert.ok(Number.isFinite(s.thresholds.siaga1) && Number.isFinite(s.thresholds.siaga4));
  }
});

test('investments monitoring enriches assets with nearest hydrological and flood report exposure', async () => {
  const list = await getMonitoringInvestments();
  assert.ok(list.length >= 500);
  for (const inv of list) {
    assert.ok(inv.id);
    assert.ok(inv.name);
    assert.ok(['high', 'moderate', 'low'].includes(inv.risk_level));
    assert.ok(Number.isFinite(inv.latitude) && Number.isFinite(inv.longitude));
    if (inv.nearest_tma) {
      assert.ok(Number.isFinite(inv.nearest_tma.distance_km));
      assert.ok(inv.nearest_tma.distance_km >= 0);
    }
  }
});

test('projects-2026 monitoring returns 37 strategic JIC opportunities with spatial exposure', async () => {
  const projects = await getMonitoringProjects2026();
  assert.equal(projects.length, 37);
  for (const p of projects) {
    assert.ok(p.id);
    assert.ok(p.name);
    assert.ok(p.sector);
    assert.ok(p.status);
    assert.ok(['high', 'moderate', 'low'].includes(p.risk_level));
  }
  const detail = await getMonitoringProjectDetail(1);
  assert.ok(detail);
  assert.equal(detail.name, 'Intermediate Treatment Facility Sunter');
  assert.ok(detail.sections && detail.sections.length > 0);
});

test('station history returns 24-hour time-series for hydrograph visualization without sine wave artifact', async () => {
  const tmaList = await getMonitoringTMA();
  const firstTma = tmaList[0].station_id;
  const tmaRes = await getStationHistory(firstTma, 'tma');
  assert.ok(!tmaRes.error);
  assert.equal(tmaRes.history.length, 24);
  assert.ok(tmaRes.history.every((h: any) => typeof h.hour === 'string' && Number.isFinite(h.level)));
  assert.ok(tmaRes.period && typeof tmaRes.period.source === 'string');

  const rainList = await getMonitoringRain();
  const firstRain = rainList[0].station_id;
  const rainRes = await getStationHistory(firstRain, 'rain');
  assert.ok(!rainRes.error);
  assert.equal(rainRes.history.length, 24);
  assert.ok(rainRes.history.every((h: any) => typeof h.hour === 'string' && Number.isFinite(h.rain)));
  assert.ok(rainRes.period && typeof rainRes.period.source === 'string');
});

test('rivers monitoring returns 200 features with orde classification from cilicis_datasungai', async () => {
  const rivers = await getMonitoringRivers();
  assert.equal(rivers.type, 'FeatureCollection');
  assert.equal(rivers.features.length, 200);
  for (const f of rivers.features) {
    assert.ok(f.id);
    assert.ok(f.properties.nama_sungai);
    assert.ok([1, 2, 3].includes(f.properties.orde));
    assert.ok(f.geometry.coordinates && f.geometry.coordinates.length > 0);
  }
  const orde1 = await getMonitoringRivers({ orde: 1 });
  assert.equal(orde1.features.length, 32);
  const orde2 = await getMonitoringRivers({ orde: 2 });
  assert.equal(orde2.features.length, 94);
});

test('thiessen monitoring returns polygons with areal rainfall and seasonal statistics', async () => {
  const thiessen = await getMonitoringThiessen();
  assert.ok(thiessen.features.length >= 80);
  assert.ok(thiessen.summary);
  assert.ok(thiessen.summary.regional_dki);
  assert.ok(thiessen.summary.regional_dki.max_daily_mm >= 50);
  assert.ok(thiessen.summary.regional_dki.avg_wet_season_mm > 0);
  assert.ok(thiessen.summary.regional_dki.max_date);

  const sample = thiessen.features[0];
  assert.ok(sample.properties.station_id);
  assert.ok(sample.properties.name);
  assert.ok(sample.properties.area_km2 > 0);
  assert.ok(sample.properties.weight_pct > 0);
  assert.ok(sample.properties.das_name);
});

test('compound flood exposure computes fluvial/pluvial/coastal indices, financial metrics, and parametric insurance', async () => {
  const evalResult = await evaluateLocation(-6.1754, 106.8272);
  assert.ok(evalResult.compound_indices);
  assert.ok(Number.isFinite(evalResult.compound_indices.fluvial_score));
  assert.ok(Number.isFinite(evalResult.compound_indices.pluvial_score));
  assert.ok(Number.isFinite(evalResult.compound_indices.coastal_score));
  assert.ok(evalResult.compound_indices.dominant_mechanism);

  assert.ok(evalResult.financial_exposure);
  assert.ok(Number.isFinite(evalResult.financial_exposure.capex_at_risk_pct));
  assert.ok(Number.isFinite(evalResult.financial_exposure.estimated_downtime_days));
  assert.ok(['Tinggi', 'Moderat', 'Rendah'].includes(evalResult.financial_exposure.business_interruption_risk));
  assert.ok(evalResult.financial_exposure.resilience_green_taxonomy);

  assert.ok(evalResult.parametric_insurance);
  assert.ok(evalResult.parametric_insurance.recommended_tier);
  assert.ok(evalResult.parametric_insurance.trigger_index);
  assert.ok(evalResult.parametric_insurance.claim_turnaround);
  assert.ok(evalResult.parametric_insurance.indicative_rate);

  // Check an investment asset
  const investments = await getMonitoringInvestments();
  const sampleInv = investments[0];
  assert.ok(sampleInv.compound_indices);
  assert.ok(sampleInv.financial_exposure);
  assert.ok(sampleInv.parametric_insurance);

  // Check a 2026 project
  const projects = await getMonitoringProjects2026();
  const sampleProj = projects[0];
  assert.ok(sampleProj.compound_indices);
  assert.ok(sampleProj.financial_exposure);
  assert.ok(sampleProj.parametric_insurance);
});

test('public transit proximity evaluates TOD tier, grade-separated rail immunity, and downtime mitigation', async () => {
  const transitList = await getMonitoringTransit();
  assert.equal(transitList.length, 286);

  const mrtList = await getMonitoringTransit('MRT');
  assert.equal(mrtList.length, 13);

  const lrtList = await getMonitoringTransit('LRT');
  assert.equal(lrtList.length, 6);

  const tjList = await getMonitoringTransit('TransJakarta');
  assert.equal(tjList.length, 267);

  // Check Bundaran HI coordinates (-6.1926, 106.8231)
  const evalBHI = await evaluateLocation(-6.1926, 106.8231);
  assert.ok(evalBHI.transit_proximity);
  assert.ok(evalBHI.transit_proximity.nearest_station);
  assert.ok(evalBHI.transit_proximity.nearest_rail);
  assert.equal(evalBHI.transit_proximity.tod_tier, 'TOD Core (< 400m)');
  assert.equal(evalBHI.transit_proximity.green_taxonomy_tod_aligned, true);
  assert.ok(evalBHI.transit_proximity.downtime_mitigation_pct >= 25);
  assert.ok(evalBHI.transit_proximity.flood_evacuation_redundancy.includes('Akses Rel Bebas Banjir'));
  assert.ok(evalBHI.summary_rationale.includes('Konektivitas transit prima'));

  // Check investments enrichment
  const investments = await getMonitoringInvestments();
  assert.ok(investments.length > 0);
  assert.ok(investments[0].transit_proximity);
  assert.ok(Number.isFinite(investments[0].transit_proximity.accessibility_score));

  // Check projects 2026 enrichment
  const projects = await getMonitoringProjects2026();
  assert.equal(projects.length, 37);
  assert.ok(projects[0].transit_proximity);
  assert.ok(projects[0].transit_proximity.nearest_station.name);
  assert.ok(projects[0].financial_exposure);
  assert.ok(Number.isFinite(projects[0].financial_exposure.net_downtime_days));
});

test.after(async () => {
  await closeDb();
});

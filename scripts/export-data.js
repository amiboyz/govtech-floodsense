import fs from 'node:fs/promises';
import {
  getMonitoringSummary,
  getMonitoringTMA,
  getMonitoringRain,
  getMonitoringInvestments,
  getMonitoringProjects2026,
  getMonitoringFloodReports,
  getMonitoringInfrastructure,
  getMonitoringRivers,
  getMonitoringThiessen,
  getMonitoringDas,
  getMonitoringTransit,
} from '../dist/server/services/monitoring.js';

async function exportAll() {
  await fs.mkdir('api/data', { recursive: true });
  console.log('Generating pre-computed dataset for PHP...');

  const [
    summary,
    tma,
    rain,
    investments,
    projects2026,
    reports,
    infra,
    rivers,
    thiessen,
    das,
    transit,
  ] = await Promise.all([
    getMonitoringSummary(),
    getMonitoringTMA(),
    getMonitoringRain(),
    getMonitoringInvestments(),
    getMonitoringProjects2026(),
    getMonitoringFloodReports(),
    getMonitoringInfrastructure(),
    getMonitoringRivers(),
    getMonitoringThiessen(),
    getMonitoringDas(),
    getMonitoringTransit(),
  ]);

  await fs.writeFile('api/data/summary.json', JSON.stringify({ data: summary, meta: { status: 'ok', generated_at: new Date().toISOString() } }));
  await fs.writeFile('api/data/tma.json', JSON.stringify({ data: tma, meta: { count: tma.length, status: 'ok' } }));
  await fs.writeFile('api/data/rain.json', JSON.stringify({ data: rain, meta: { count: rain.length, status: 'ok' } }));
  await fs.writeFile('api/data/investments.json', JSON.stringify({ data: investments, meta: { count: investments.length, status: 'ok' } }));
  await fs.writeFile('api/data/projects-2026.json', JSON.stringify({ data: projects2026, meta: { count: projects2026.length, status: 'ok' } }));
  await fs.writeFile('api/data/flood-reports.json', JSON.stringify({ data: reports, meta: { count: reports.length, status: 'ok' } }));
  await fs.writeFile('api/data/infrastructure.json', JSON.stringify({ data: infra, meta: { count: infra.pumps?.length || 0, status: 'ok' } }));
  await fs.writeFile('api/data/rivers.json', JSON.stringify({ data: rivers, meta: { count: rivers.features?.length || 0, status: 'ok' } }));
  await fs.writeFile('api/data/thiessen.json', JSON.stringify({ data: thiessen, meta: { count: thiessen.features?.length || 0, status: 'ok' } }));
  await fs.writeFile('api/data/das.json', JSON.stringify({ data: das, meta: { count: das.features?.length || 0, status: 'ok' } }));
  await fs.writeFile('api/data/transit.json', JSON.stringify({ data: transit, meta: { count: transit.length, status: 'ok' } }));

  console.log('Successfully updated 11 precomputed endpoints in api/data/');
}

exportAll().catch(console.error);

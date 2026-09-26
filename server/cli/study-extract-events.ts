import fs from 'node:fs/promises';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { config } from '../config.js';

type EvidenceRow = RowDataPacket & {
  uid: string;
  occurred_at: string;
  latitude: string | number;
  longitude: string | number;
  city?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  river_nearest?: string | null;
  depth_cm_raw?: string | null;
  source_name?: string | null;
  report_source: 'sitaba' | 'cilicis';
};

const connection = await mysql.createConnection({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
  dateStrings: true,
  ssl: config.DB_SSL ? {} : undefined,
});

try {
  const [sitaba] = await connection.query<EvidenceRow[]>(`
    SELECT CONCAT('sitaba:', uid) uid,
      DATE_FORMAT(date_time_of_occurrence, '%Y-%m-%d %H:%i:%s') occurred_at,
      point_of_occurrence_lat latitude, point_of_occurrence_lon longitude,
      city, NULL kelurahan, NULL kecamatan, NULL river_nearest,
      NULL depth_cm_raw, 'PU Sitaba' source_name, 'sitaba' report_source
    FROM pu_sitaba_disaster_report
    WHERE disaster_category = 'Banjir'
      AND date_time_of_occurrence >= '2025-10-21'
      AND date_time_of_occurrence < '2026-09-02'
      AND point_of_occurrence_lat BETWEEN -6.6 AND -5.8
      AND point_of_occurrence_lon BETWEEN 106.5 AND 107.2
  `);
  const [cilicis] = await connection.query<EvidenceRow[]>(`
    SELECT CONCAT('cilicis:', id) uid,
      DATE_FORMAT(STR_TO_DATE(CONCAT(tanggal, ' ', TRIM(pukul)), '%Y-%m-%d %H:%i'), '%Y-%m-%d %H:%i:%s') occurred_at,
      ST_Y(geom) latitude, ST_X(geom) longitude,
      kota_kabupaten city, kelurahan, kecamatan,
      sungai_terdekat river_nearest, ketinggian_genangan_cm depth_cm_raw,
      COALESCE(NULLIF(TRIM(sumber), ''), 'Cilicis') source_name,
      'cilicis' report_source
    FROM cilicis_laporan_banjir
    WHERE tanggal >= '2025-10-21' AND tanggal < '2026-09-02'
      AND ST_GeometryType(geom) = 'POINT'
      AND ST_Y(geom) BETWEEN -6.6 AND -5.8
      AND ST_X(geom) BETWEEN 106.5 AND 107.2
      AND TRIM(pukul) REGEXP '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
  `);
  const events = [...sitaba, ...cilicis]
    .filter((row) => row.occurred_at && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)))
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const quality = {
    rows: events.length,
    by_source: { sitaba: sitaba.length, cilicis: cilicis.length },
    note: 'Cross-source rows are retained. Similar time/location does not prove duplicate identity.',
  };
  await fs.mkdir('.build/study', { recursive: true });
  await fs.writeFile('.build/study/events.json', JSON.stringify(events));
  await fs.writeFile('.build/study/events-quality.json', JSON.stringify(quality));
  console.log(JSON.stringify(quality));
} catch (error) {
  console.error('Event extraction failed:', (error as { code?: string }).code ?? 'QUERY_ERROR');
  process.exitCode = 1;
} finally {
  await connection.end();
}

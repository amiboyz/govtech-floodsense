import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Read-only source connection. Never migrate or modify the historical tables.
const c = await mysql.createConnection({host:config.DB_HOST, port:config.DB_PORT, user:config.DB_USERNAME, password:config.DB_PASSWORD, database:config.DB_DATABASE, dateStrings:true, ssl:config.DB_SSL?{}:undefined});
await fs.mkdir('.build/study', {recursive:true});
try {
  const queries: Record<string,string> = {
    rain: `SELECT ID_LOKASI_PEMANTAUAN station_id, MAX(NAMA_LOKASI_PEMANTAUAN) name,
      MAX(LATITUDE) latitude, MAX(LONGITUDE) longitude, MAX(DAS_POLDER) basin,
      DATE_FORMAT(TANGGAL_TERAKHIR,'%Y-%m-%d %H:00:00') hour,
      AVG(KETINGGIAN_TERAKHIR) value, MIN(KETINGGIAN_TERAKHIR) minimum,
      MAX(KETINGGIAN_TERAKHIR) maximum, COUNT(*) copies
      FROM (SELECT ID_LOKASI_PEMANTAUAN, TANGGAL_TERAKHIR,
        MAX(NAMA_LOKASI_PEMANTAUAN) NAMA_LOKASI_PEMANTAUAN, MAX(LATITUDE) LATITUDE,
        MAX(LONGITUDE) LONGITUDE, MAX(DAS_POLDER) DAS_POLDER,
        MAX(KETINGGIAN_TERAKHIR) KETINGGIAN_TERAKHIR
        FROM jakarta_ch WHERE TANGGAL_TERAKHIR >= '2025-10-21' AND TANGGAL_TERAKHIR < '2026-09-02'
        AND KETINGGIAN_TERAKHIR >= 0 GROUP BY ID_LOKASI_PEMANTAUAN,TANGGAL_TERAKHIR
        HAVING MIN(KETINGGIAN_TERAKHIR)=MAX(KETINGGIAN_TERAKHIR)) r
      GROUP BY ID_LOKASI_PEMANTAUAN,DATE_FORMAT(TANGGAL_TERAKHIR,'%Y-%m-%d %H:00:00')`,
    tma: `SELECT ID_PINTU_AIR station_id, MAX(NAMA_PINTU_AIR) name,
      MAX(LATITUDE) latitude, MAX(LONGITUDE) longitude,
      DATE_FORMAT(TANGGAL,'%Y-%m-%d %H:00:00') hour, AVG(TINGGI_AIR) value, COUNT(*) copies
      FROM (SELECT ID_PINTU_AIR,TANGGAL,MAX(NAMA_PINTU_AIR) NAMA_PINTU_AIR,
        MAX(LATITUDE) LATITUDE,MAX(LONGITUDE) LONGITUDE,MAX(TINGGI_AIR) TINGGI_AIR
        FROM jakarta_tma WHERE TANGGAL >= '2025-10-21' AND TANGGAL < '2026-09-02'
        AND TINGGI_AIR IS NOT NULL GROUP BY ID_PINTU_AIR,TANGGAL
        HAVING MIN(TINGGI_AIR)=MAX(TINGGI_AIR)) t
      GROUP BY ID_PINTU_AIR,DATE_FORMAT(TANGGAL,'%Y-%m-%d %H:00:00')`,
    events: `SELECT uid, DATE_FORMAT(date_time_of_occurrence,'%Y-%m-%d %H:%i:%s') occurred_at,
      point_of_occurrence_lat latitude, point_of_occurrence_lon longitude, city
      FROM pu_sitaba_disaster_report WHERE disaster_category='Banjir'
      AND date_time_of_occurrence >= '2025-10-21' AND date_time_of_occurrence < '2026-09-02'
      AND point_of_occurrence_lat BETWEEN -6.6 AND -5.8 AND point_of_occurrence_lon BETWEEN 106.5 AND 107.2`,
  };
  for (const [name,sql] of Object.entries(queries)) {
    const [rows] = await c.query(sql);
    await fs.writeFile(`.build/study/${name}.json`,JSON.stringify(rows));
    console.log(`${name}: ${(rows as unknown[]).length} rows extracted`);
  }
} catch (e) {
  console.error('Study extraction failed:', (e as {code?:string}).code ?? 'QUERY_ERROR');
  process.exitCode=1;
} finally {await c.end();}

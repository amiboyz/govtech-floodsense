import { createReadStream } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { db } from "../db.js";

type CsvRow = Record<string, string>;

async function parseCsv(file: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  await new Promise<void>((resolve, reject) => createReadStream(file)
    .pipe(parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true }))
    .on("data", (row) => rows.push(row))
    .on("end", resolve)
    .on("error", reject));
  return rows;
}

const connection = await db().getConnection();
try {
  await connection.beginTransaction();
  const [sources] = await connection.query<any[]>("SELECT id FROM data_sources WHERE code='bkpm_regional_investment' LIMIT 1");
  if (!sources[0]) throw new Error("Jalankan db:migrate terlebih dahulu.");
  const sourceId = sources[0].id;
  const locations = await parseCsv(path.resolve("docs/data invest/semua_poi_investasi_dki_siap_overlay.csv"));
  for (const row of locations) {
    await connection.execute(`INSERT INTO investment_locations
      (source_id, source_record_id, name, category, province_code, latitude, longitude, source_url, source_retrieved_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), latitude=VALUES(latitude), longitude=VALUES(longitude), source_retrieved_at=VALUES(source_retrieved_at), updated_at=CURRENT_TIMESTAMP`,
    [sourceId, `${row.kategori}:${row.record_no}`, row.nama, row.kategori, row.id_adm_provinsi, Number(row.lat), Number(row.lon), row.source_url, new Date(row.retrieved_at_utc), JSON.stringify({ source_record_no: row.record_no })]);
  }
  const opportunities = await parseCsv(path.resolve("docs/data invest/potensi_investasi_peluang.csv"));
  for (const row of opportunities) {
    await connection.execute(`INSERT INTO investment_opportunities
      (source_opportunity_id, name, city_name, sector, project_year, investment_value_text, irr_text, npv_text, payback_period_text, project_status, description, image_url, source_url, source_retrieved_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), project_status=VALUES(project_status), updated_at=CURRENT_TIMESTAMP`,
    [row.id_peluang, row.nama, row.nama_kabkot, row.nama_sektor_peluang, Number(row.tahun) || null, row.nilai_investasi, row.nilai_irr, row.nilai_npv, row.nilai_pp, row.status_proyek, row.deskripsi, row.image, row.source_url, new Date(row.retrieved_at_utc), JSON.stringify({ status: row.status, project_status_enum: row.project_status_enum })]);
  }
  await connection.commit();
  console.log(`Import selesai: ${locations.length} lokasi dan ${opportunities.length} peluang.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await db().end();
}

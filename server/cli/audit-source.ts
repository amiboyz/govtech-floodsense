import mysql, { type RowDataPacket } from "mysql2/promise";
import { config } from "../config.js";

const sourceDatabase = process.env.SOURCE_DB_DATABASE ?? "floodsense_2026_08_30";
const expected: Record<string, string[]> = {
  jakarta_tma: ["NAMA_PINTU_AIR", "TINGGI_AIR", "TINGGI_AIR_SEBELUMNYA", "STATUS_SIAGA", "TANGGAL", "LATITUDE", "LONGITUDE"],
  jakarta_ch: ["NAMA_LOKASI_PEMANTAUAN", "KETINGGIAN_TERAKHIR", "KETINGGIAN_SEBELUM_TERAKHIR", "TANGGAL_TERAKHIR", "LATITUDE", "LONGITUDE"],
  pu_sitaba_disaster_report: ["uid", "date_time_of_occurrence", "point_of_occurrence_lat", "point_of_occurrence_lon", "cause"],
};
const connection = await mysql.createConnection({ host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USERNAME, password: config.DB_PASSWORD, ssl: config.DB_SSL ? {} : undefined });
const result: { source_database: string; checked_at: string; tables: Record<string, unknown> } = { source_database: sourceDatabase, checked_at: new Date().toISOString(), tables: {} };
for (const [table, requiredColumns] of Object.entries(expected)) {
  const [columns] = await connection.query<RowDataPacket[]>(`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`, [sourceDatabase, table]);
  const actual = columns.map((column) => String(column.COLUMN_NAME));
  const [counts] = await connection.query<RowDataPacket[]>(`SELECT TABLE_ROWS estimated_rows FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`, [sourceDatabase, table]);
  result.tables[table] = {
    exists: columns.length > 0,
    estimated_rows: counts[0]?.estimated_rows ?? null,
    required_columns_present: requiredColumns.filter((column) => actual.includes(column)),
    required_columns_missing: requiredColumns.filter((column) => !actual.includes(column)),
    actual_columns: columns,
  };
}
await connection.end();
console.log(JSON.stringify(result, null, 2));

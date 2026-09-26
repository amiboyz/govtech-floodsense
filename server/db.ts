import mysql, { type Pool } from "mysql2/promise";
import { config } from "./config.js";

let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_DATABASE,
      user: config.DB_USERNAME,
      password: config.DB_PASSWORD,
      ssl: config.DB_SSL ? {} : undefined,
      connectionLimit: 10,
      timezone: "Z",
      decimalNumbers: true,
      enableKeepAlive: true,
    });
  }
  return pool;
}

export async function databaseAvailable(): Promise<boolean> {
  try {
    await db().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

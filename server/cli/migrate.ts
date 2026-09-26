import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { config } from "../config.js";

const bootstrap = await mysql.createConnection({
  host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USERNAME,
  password: config.DB_PASSWORD, ssl: config.DB_SSL ? {} : undefined,
  multipleStatements: true,
});
await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.DB_DATABASE.replaceAll("`", "") }\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await bootstrap.changeUser({ database: config.DB_DATABASE });
const schema = await fs.readFile(path.resolve("database/schema.sql"), "utf8");
await bootstrap.query(schema);
await bootstrap.end();
console.log(`Migrasi selesai: ${config.DB_DATABASE}`);

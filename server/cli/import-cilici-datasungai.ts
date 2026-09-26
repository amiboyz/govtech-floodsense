import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { db } from "../db.js";

type GeometryType = "LineString" | "MultiLineString";

interface RiverFeature {
  id: string;
  type: "Feature";
  geometry: {
    type: GeometryType;
    coordinates: unknown;
  };
  properties: {
    "Nama Sungai": string;
    ORDE: number;
    ANOTASI?: string | null;
  };
}

interface RiverFeatureCollection {
  layer_id: string;
  layer_name: string;
  type: "FeatureCollection";
  features: RiverFeature[];
}

interface ImportSummaryRow extends RowDataPacket {
  total: number;
  unique_features: number;
  min_srid: number;
  max_srid: number;
}

interface GeometryTypeRow extends RowDataPacket {
  geometry_type: GeometryType;
  total: number;
}

const sourcePath = path.resolve("docs/data_gis/data_sungai.json");
const sourceText = await fs.readFile(sourcePath, "utf8");
const sourceSha256 = crypto.createHash("sha256").update(sourceText).digest("hex");
const collection = JSON.parse(sourceText) as RiverFeatureCollection;

if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
  throw new Error("data_sungai.json bukan GeoJSON FeatureCollection yang valid.");
}

const supportedGeometryTypes = new Set<GeometryType>(["LineString", "MultiLineString"]);
const featureIds = new Set<string>();

for (const [index, feature] of collection.features.entries()) {
  if (!feature.id || feature.type !== "Feature") {
    throw new Error(`Feature pada indeks ${index} tidak memiliki ID/type yang valid.`);
  }
  if (featureIds.has(feature.id)) {
    throw new Error(`Feature ID duplikat: ${feature.id}`);
  }
  featureIds.add(feature.id);

  if (!supportedGeometryTypes.has(feature.geometry?.type)) {
    throw new Error(`Tipe geometri tidak didukung pada ${feature.id}: ${feature.geometry?.type}`);
  }
  if (!feature.properties?.["Nama Sungai"]?.trim()) {
    throw new Error(`Nama Sungai kosong pada feature ${feature.id}.`);
  }
  if (!Number.isInteger(feature.properties.ORDE) || feature.properties.ORDE < 0) {
    throw new Error(`ORDE tidak valid pada feature ${feature.id}.`);
  }
}

const connection = await db().getConnection();

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cilici_datasungai (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      feature_id VARCHAR(64) NOT NULL,
      layer_id VARCHAR(64) NOT NULL,
      layer_name VARCHAR(255) NOT NULL,
      nama_sungai VARCHAR(255) NOT NULL,
      orde SMALLINT UNSIGNED NOT NULL,
      anotasi VARCHAR(255) NULL,
      geometry_type ENUM('LineString','MultiLineString') NOT NULL,
      \`geometry\` GEOMETRY NOT NULL,
      properties_json JSON NOT NULL,
      source_geojson JSON NOT NULL,
      source_file VARCHAR(255) NOT NULL,
      source_sha256 CHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY cilici_datasungai_feature_unique (feature_id),
      KEY cilici_datasungai_nama_idx (nama_sungai),
      KEY cilici_datasungai_orde_idx (orde),
      SPATIAL KEY cilici_datasungai_geometry_spatial_idx (\`geometry\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.beginTransaction();

  for (const feature of collection.features) {
    const geometryJson = JSON.stringify(feature.geometry);
    await connection.execute(
      `INSERT INTO cilici_datasungai (
        feature_id, layer_id, layer_name, nama_sungai, orde, anotasi,
        geometry_type, \`geometry\`, properties_json, source_geojson,
        source_file, source_sha256
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ST_GeomFromText(ST_AsText(ST_GeomFromGeoJSON(?)), 4326),
        ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        layer_id = VALUES(layer_id),
        layer_name = VALUES(layer_name),
        nama_sungai = VALUES(nama_sungai),
        orde = VALUES(orde),
        anotasi = VALUES(anotasi),
        geometry_type = VALUES(geometry_type),
        \`geometry\` = VALUES(\`geometry\`),
        properties_json = VALUES(properties_json),
        source_geojson = VALUES(source_geojson),
        source_file = VALUES(source_file),
        source_sha256 = VALUES(source_sha256),
        updated_at = CURRENT_TIMESTAMP`,
      [
        feature.id,
        collection.layer_id,
        collection.layer_name,
        feature.properties["Nama Sungai"].trim(),
        feature.properties.ORDE,
        feature.properties.ANOTASI?.trim() || null,
        feature.geometry.type,
        geometryJson,
        JSON.stringify(feature.properties),
        JSON.stringify(feature),
        path.relative(process.cwd(), sourcePath),
        sourceSha256,
      ],
    );
  }

  await connection.commit();

  const [[summary]] = await connection.query<ImportSummaryRow[]>(`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT feature_id) AS unique_features,
      MIN(ST_SRID(\`geometry\`)) AS min_srid,
      MAX(ST_SRID(\`geometry\`)) AS max_srid
    FROM cilici_datasungai
  `);

  const [types] = await connection.query<GeometryTypeRow[]>(`
    SELECT geometry_type, COUNT(*) AS total
    FROM cilici_datasungai
    GROUP BY geometry_type
    ORDER BY geometry_type
  `);

  console.log(JSON.stringify({
    table: "cilici_datasungai",
    source: path.relative(process.cwd(), sourcePath),
    source_sha256: sourceSha256,
    imported_features: collection.features.length,
    database_summary: summary,
    geometry_types: types,
  }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await db().end();
}

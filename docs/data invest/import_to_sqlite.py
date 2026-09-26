#!/usr/bin/env python3
"""Bangun database SQLite lokasi investasi dari berkas sumber di folder ini."""

from __future__ import annotations

import csv
import hashlib
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE = BASE_DIR / "investasi_dki.sqlite"
PRIMARY_CSV_FILES = (
    "hotel.csv",
    "kawasan.csv",
    "pelabuhan.csv",
    "pendidikan.csv",
    "rumah_sakit.csv",
)
AGGREGATE_CSV = "semua_poi_investasi_dki_siap_overlay.csv"
METADATA_XML = "TASWIL1000020230928_DATA_BATAS_DESAKELURAHAN.xml"


SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE sumber_data (
    id INTEGER PRIMARY KEY,
    nama_file TEXT NOT NULL UNIQUE,
    jenis TEXT NOT NULL CHECK (jenis IN ('csv_lokasi', 'csv_gabungan', 'xml_metadata')),
    sha256 TEXT NOT NULL,
    jumlah_baris_sumber INTEGER NOT NULL DEFAULT 0,
    jumlah_lokasi_baru INTEGER NOT NULL DEFAULT 0,
    jumlah_duplikat INTEGER NOT NULL DEFAULT 0,
    catatan TEXT
);

CREATE TABLE lokasi (
    id INTEGER PRIMARY KEY,
    id_adm_provinsi INTEGER NOT NULL,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL,
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    source_url TEXT,
    retrieved_at_utc TEXT,
    sumber_data_id INTEGER NOT NULL REFERENCES sumber_data(id),
    record_no_sumber INTEGER,
    UNIQUE (id_adm_provinsi, longitude, latitude)
);

CREATE TABLE nama_alias (
    id INTEGER PRIMARY KEY,
    lokasi_id INTEGER NOT NULL REFERENCES lokasi(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    sumber_data_id INTEGER NOT NULL REFERENCES sumber_data(id),
    record_no_sumber INTEGER,
    UNIQUE (lokasi_id, nama)
);

CREATE TABLE metadata_batas_wilayah (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sumber_data_id INTEGER NOT NULL REFERENCES sumber_data(id),
    file_identifier TEXT,
    judul TEXT,
    tanggal_metadata TEXT,
    crs TEXT,
    jumlah_objek_geometri INTEGER,
    batas_barat REAL,
    batas_timur REAL,
    batas_selatan REAL,
    batas_utara REAL,
    abstrak TEXT
);

CREATE INDEX idx_lokasi_kategori ON lokasi(kategori);
CREATE INDEX idx_lokasi_nama ON lokasi(nama COLLATE NOCASE);
CREATE INDEX idx_lokasi_koordinat ON lokasi(latitude, longitude);

CREATE VIEW ringkasan_kategori AS
SELECT kategori, COUNT(*) AS jumlah_lokasi
FROM lokasi
GROUP BY kategori;
"""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def csv_row_count(path: Path) -> int:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return sum(1 for _ in csv.DictReader(handle))


def add_source(
    connection: sqlite3.Connection,
    path: Path,
    kind: str,
    row_count: int = 0,
    note: str | None = None,
) -> int:
    cursor = connection.execute(
        """
        INSERT INTO sumber_data
            (nama_file, jenis, sha256, jumlah_baris_sumber, catatan)
        VALUES (?, ?, ?, ?, ?)
        """,
        (path.name, kind, sha256(path), row_count, note),
    )
    return int(cursor.lastrowid)


def import_locations(connection: sqlite3.Connection) -> tuple[int, int, int]:
    total_rows = 0
    total_new = 0
    total_duplicates = 0

    for filename in PRIMARY_CSV_FILES:
        path = BASE_DIR / filename
        if not path.exists():
            raise FileNotFoundError(f"Berkas sumber tidak ditemukan: {path}")

        rows = csv_row_count(path)
        source_id = add_source(connection, path, "csv_lokasi", rows)
        file_new = 0
        file_duplicates = 0

        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            expected = {
                "id_adm_provinsi", "nama", "lon", "lat", "kategori",
                "record_no", "source_url", "retrieved_at_utc",
            }
            if set(reader.fieldnames or ()) != expected:
                raise ValueError(f"Kolom tidak sesuai pada {filename}: {reader.fieldnames}")

            for row in reader:
                total_rows += 1
                province_id = int(row["id_adm_provinsi"])
                longitude = float(row["lon"])
                latitude = float(row["lat"])
                record_no = int(row["record_no"])

                existing = connection.execute(
                    """
                    SELECT id, nama
                    FROM lokasi
                    WHERE id_adm_provinsi = ? AND longitude = ? AND latitude = ?
                    """,
                    (province_id, longitude, latitude),
                ).fetchone()

                if existing is not None:
                    file_duplicates += 1
                    total_duplicates += 1
                    if existing["nama"] != row["nama"]:
                        connection.execute(
                            """
                            INSERT OR IGNORE INTO nama_alias
                                (lokasi_id, nama, sumber_data_id, record_no_sumber)
                            VALUES (?, ?, ?, ?)
                            """,
                            (existing["id"], row["nama"], source_id, record_no),
                        )
                    continue

                connection.execute(
                    """
                    INSERT INTO lokasi (
                        id_adm_provinsi, nama, kategori, longitude, latitude,
                        source_url, retrieved_at_utc, sumber_data_id, record_no_sumber
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        province_id,
                        row["nama"].strip(),
                        row["kategori"].strip(),
                        longitude,
                        latitude,
                        row["source_url"].strip(),
                        row["retrieved_at_utc"].strip(),
                        source_id,
                        record_no,
                    ),
                )
                file_new += 1
                total_new += 1

        connection.execute(
            """
            UPDATE sumber_data
            SET jumlah_lokasi_baru = ?, jumlah_duplikat = ?
            WHERE id = ?
            """,
            (file_new, file_duplicates, source_id),
        )

    return total_rows, total_new, total_duplicates


def register_aggregate(connection: sqlite3.Connection) -> None:
    path = BASE_DIR / AGGREGATE_CSV
    if not path.exists():
        return
    rows = csv_row_count(path)
    source_id = add_source(
        connection,
        path,
        "csv_gabungan",
        rows,
        "Tidak diimpor: berkas gabungan mengulang data dari lima CSV kategori.",
    )
    connection.execute(
        "UPDATE sumber_data SET jumlah_duplikat = ? WHERE id = ?",
        (rows, source_id),
    )


def first_text(root: ET.Element, local_name: str) -> str | None:
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] == local_name:
            for descendant in element.iter():
                if descendant is not element and descendant.text and descendant.text.strip():
                    return descendant.text.strip()
    return None


def all_text(root: ET.Element, local_name: str) -> list[str]:
    values: list[str] = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] == local_name:
            for descendant in element.iter():
                if descendant is not element and descendant.text and descendant.text.strip():
                    values.append(descendant.text.strip())
                    break
    return values


def import_xml_metadata(connection: sqlite3.Connection) -> None:
    path = BASE_DIR / METADATA_XML
    if not path.exists():
        return

    source_id = add_source(
        connection,
        path,
        "xml_metadata",
        note="Metadata ISO 19139; tidak berisi baris lokasi atau geometri.",
    )
    root = ET.parse(path).getroot()
    west = all_text(root, "westBoundLongitude")
    east = all_text(root, "eastBoundLongitude")
    south = all_text(root, "southBoundLatitude")
    north = all_text(root, "northBoundLatitude")

    connection.execute(
        """
        INSERT INTO metadata_batas_wilayah (
            id, sumber_data_id, file_identifier, judul, tanggal_metadata, crs,
            jumlah_objek_geometri, batas_barat, batas_timur, batas_selatan,
            batas_utara, abstrak
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            source_id,
            first_text(root, "fileIdentifier"),
            first_text(root, "title"),
            first_text(root, "dateStamp"),
            first_text(root, "referenceSystemIdentifier"),
            int(first_text(root, "geometricObjectCount") or 0),
            float(west[0]) if west else None,
            float(east[0]) if east else None,
            float(south[0]) if south else None,
            float(north[0]) if north else None,
            first_text(root, "abstract"),
        ),
    )


def build_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = database_path.with_suffix(database_path.suffix + ".tmp")
    temporary_path.unlink(missing_ok=True)

    try:
        connection = sqlite3.connect(temporary_path)
        connection.row_factory = sqlite3.Row
        connection.executescript(SCHEMA)
        with connection:
            total_rows, total_new, total_duplicates = import_locations(connection)
            register_aggregate(connection)
            import_xml_metadata(connection)
        connection.execute("ANALYZE")
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity_check gagal: {integrity}")
        connection.close()
        temporary_path.replace(database_path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    print(f"Database: {database_path}")
    print(f"Baris CSV utama: {total_rows}")
    print(f"Lokasi unik: {total_new}")
    print(f"Duplikat koordinat tersaring: {total_duplicates}")


if __name__ == "__main__":
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_DATABASE
    build_database(target)

import os
import sqlite3
import pymysql
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("DB_PORT", "3306"))
MYSQL_USER = os.getenv("DB_USERNAME", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "cctvA125")
MYSQL_DB = os.getenv("DB_DATABASE", "local_govtech_floodsense")

print(f"Connecting to MySQL {MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}...")
con_mysql = pymysql.connect(
    host=MYSQL_HOST,
    port=MYSQL_PORT,
    user=MYSQL_USER,
    password=MYSQL_PASSWORD,
    database=MYSQL_DB,
    autocommit=True,
    cursorclass=pymysql.cursors.DictCursor
)
cur_mysql = con_mysql.cursor()

# -------------------------------------------------------------
# 1. MIGRATE: docs/data invest/investasi_dki.sqlite -> jktjic_baseinvest_*
# -------------------------------------------------------------
SQLITE_DB1 = "docs/data invest/investasi_dki.sqlite"
print(f"\n--- Migrating {SQLITE_DB1} -> MySQL jktjic_baseinvest_* ---")
con1 = sqlite3.connect(SQLITE_DB1)
con1.row_factory = sqlite3.Row
cur1 = con1.cursor()

# 1a. sumber_data
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_baseinvest_sumber_data;")
cur_mysql.execute("""
CREATE TABLE jktjic_baseinvest_sumber_data (
    id INT PRIMARY KEY,
    nama_file VARCHAR(255) NOT NULL UNIQUE,
    jenis VARCHAR(50) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    jumlah_baris_sumber INT NOT NULL DEFAULT 0,
    jumlah_lokasi_baru INT NOT NULL DEFAULT 0,
    jumlah_duplikat INT NOT NULL DEFAULT 0,
    catatan TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur1.execute("SELECT * FROM sumber_data;")
for row in cur1.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_baseinvest_sumber_data (id, nama_file, jenis, sha256, jumlah_baris_sumber, jumlah_lokasi_baru, jumlah_duplikat, catatan)
    VALUES (%(id)s, %(nama_file)s, %(jenis)s, %(sha256)s, %(jumlah_baris_sumber)s, %(jumlah_lokasi_baru)s, %(jumlah_duplikat)s, %(catatan)s)
    """, d)
print("Migrated jktjic_baseinvest_sumber_data successfully.")

# 1b. lokasi -> jktjic_baseinvest & jktjic_baseinvest_lokasi
for tbl_name in ["jktjic_baseinvest", "jktjic_baseinvest_lokasi"]:
    cur_mysql.execute(f"DROP TABLE IF EXISTS {tbl_name};")
    cur_mysql.execute(f"""
    CREATE TABLE {tbl_name} (
        id INT PRIMARY KEY,
        id_adm_provinsi INT NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        source_url TEXT,
        retrieved_at_utc VARCHAR(100),
        sumber_data_id INT NOT NULL,
        record_no_sumber INT,
        KEY idx_kategori (kategori),
        KEY idx_coords (latitude, longitude)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

cur1.execute("SELECT * FROM lokasi;")
lokasi_rows = cur1.fetchall()
for row in lokasi_rows:
    d = dict(row)
    for tbl_name in ["jktjic_baseinvest", "jktjic_baseinvest_lokasi"]:
        cur_mysql.execute(f"""
        INSERT INTO {tbl_name} (id, id_adm_provinsi, nama, kategori, longitude, latitude, source_url, retrieved_at_utc, sumber_data_id, record_no_sumber)
        VALUES (%(id)s, %(id_adm_provinsi)s, %(nama)s, %(kategori)s, %(longitude)s, %(latitude)s, %(source_url)s, %(retrieved_at_utc)s, %(sumber_data_id)s, %(record_no_sumber)s)
        """, d)
print(f"Migrated jktjic_baseinvest & jktjic_baseinvest_lokasi ({len(lokasi_rows)} rows) successfully.")

# 1c. nama_alias
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_baseinvest_nama_alias;")
cur_mysql.execute("""
CREATE TABLE jktjic_baseinvest_nama_alias (
    id INT PRIMARY KEY,
    lokasi_id INT NOT NULL,
    nama VARCHAR(255) NOT NULL,
    sumber_data_id INT NOT NULL,
    record_no_sumber INT,
    KEY idx_lokasi (lokasi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur1.execute("SELECT * FROM nama_alias;")
for row in cur1.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_baseinvest_nama_alias (id, lokasi_id, nama, sumber_data_id, record_no_sumber)
    VALUES (%(id)s, %(lokasi_id)s, %(nama)s, %(sumber_data_id)s, %(record_no_sumber)s)
    """, d)
print("Migrated jktjic_baseinvest_nama_alias successfully.")

# 1d. metadata_batas_wilayah
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_baseinvest_metadata_batas_wilayah;")
cur_mysql.execute("""
CREATE TABLE jktjic_baseinvest_metadata_batas_wilayah (
    id INT PRIMARY KEY,
    sumber_data_id INT NOT NULL,
    file_identifier VARCHAR(255),
    judul VARCHAR(255),
    tanggal_metadata VARCHAR(100),
    crs VARCHAR(100),
    jumlah_objek_geometri INT,
    batas_barat DECIMAL(11, 8),
    batas_timur DECIMAL(11, 8),
    batas_selatan DECIMAL(10, 8),
    batas_utara DECIMAL(10, 8),
    abstrak TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur1.execute("SELECT * FROM metadata_batas_wilayah;")
for row in cur1.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_baseinvest_metadata_batas_wilayah (id, sumber_data_id, file_identifier, judul, tanggal_metadata, crs, jumlah_objek_geometri, batas_barat, batas_timur, batas_selatan, batas_utara, abstrak)
    VALUES (%(id)s, %(sumber_data_id)s, %(file_identifier)s, %(judul)s, %(tanggal_metadata)s, %(crs)s, %(jumlah_objek_geometri)s, %(batas_barat)s, %(batas_timur)s, %(batas_selatan)s, %(batas_utara)s, %(abstrak)s)
    """, d)
print("Migrated jktjic_baseinvest_metadata_batas_wilayah successfully.")
con1.close()

# -------------------------------------------------------------
# 2. MIGRATE: docs/db/jakarta_projects_2026.sqlite3 -> jktjic_potensiproject_2026_*
# -------------------------------------------------------------
SQLITE_DB2 = "docs/db/jakarta_projects_2026.sqlite3"
print(f"\n--- Migrating {SQLITE_DB2} -> MySQL jktjic_potensiproject_2026_* ---")
con2 = sqlite3.connect(SQLITE_DB2)
con2.row_factory = sqlite3.Row
cur2 = con2.cursor()

# 2a. source_documents
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_potensiproject_2026_source_documents;")
cur_mysql.execute("""
CREATE TABLE jktjic_potensiproject_2026_source_documents (
    id INT PRIMARY KEY,
    title TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_path TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    page_count INT NOT NULL,
    extraction_method TEXT NOT NULL,
    extracted_at VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur2.execute("SELECT * FROM source_documents;")
for row in cur2.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_potensiproject_2026_source_documents (id, title, source_filename, source_path, sha256, page_count, extraction_method, extracted_at)
    VALUES (%(id)s, %(title)s, %(source_filename)s, %(source_path)s, %(sha256)s, %(page_count)s, %(extraction_method)s, %(extracted_at)s)
    """, d)
print("Migrated jktjic_potensiproject_2026_source_documents successfully.")

# 2b. organizations
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_potensiproject_2026_organizations;")
cur_mysql.execute("""
CREATE TABLE jktjic_potensiproject_2026_organizations (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur2.execute("SELECT * FROM organizations;")
for row in cur2.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_potensiproject_2026_organizations (id, name, short_name)
    VALUES (%(id)s, %(name)s, %(short_name)s)
    """, d)
print("Migrated jktjic_potensiproject_2026_organizations successfully.")

# 2c. projects -> jktjic_potensiproject_2026 (primary) & jktjic_potensiproject_2026_projects
for tbl_name in ["jktjic_potensiproject_2026", "jktjic_potensiproject_2026_projects"]:
    cur_mysql.execute(f"DROP TABLE IF EXISTS {tbl_name};")
    cur_mysql.execute(f"""
    CREATE TABLE {tbl_name} (
        id INT PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        owner_id INT NOT NULL,
        status VARCHAR(100) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        source_document_id INT NOT NULL,
        pdf_page INT NOT NULL,
        printed_page INT,
        location TEXT,
        route TEXT,
        total_investment_text VARCHAR(100),
        total_investment_idr BIGINT,
        development_area_text VARCHAR(100),
        partnership_period_text VARCHAR(100),
        contact_name VARCHAR(255),
        contact_role VARCHAR(255),
        contact_email VARCHAR(255),
        contact_raw TEXT,
        coordinate_text VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        project_profile TEXT,
        raw_ocr_text MEDIUMTEXT,
        extraction_quality VARCHAR(50) NOT NULL DEFAULT 'ocr_review_recommended',
        created_at VARCHAR(100) NOT NULL,
        KEY idx_sector (sector),
        KEY idx_status (status),
        KEY idx_coords (latitude, longitude)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

cur2.execute("SELECT * FROM projects;")
proj_rows = cur2.fetchall()
for row in proj_rows:
    d = dict(row)
    for tbl_name in ["jktjic_potensiproject_2026", "jktjic_potensiproject_2026_projects"]:
        cur_mysql.execute(f"""
        INSERT INTO {tbl_name} (
            id, slug, name, owner_id, status, sector, source_document_id, pdf_page, printed_page,
            location, route, total_investment_text, total_investment_idr, development_area_text,
            partnership_period_text, contact_name, contact_role, contact_email, contact_raw,
            coordinate_text, latitude, longitude, project_profile, raw_ocr_text, extraction_quality, created_at
        ) VALUES (
            %(id)s, %(slug)s, %(name)s, %(owner_id)s, %(status)s, %(sector)s, %(source_document_id)s, %(pdf_page)s, %(printed_page)s,
            %(location)s, %(route)s, %(total_investment_text)s, %(total_investment_idr)s, %(development_area_text)s,
            %(partnership_period_text)s, %(contact_name)s, %(contact_role)s, %(contact_email)s, %(contact_raw)s,
            %(coordinate_text)s, %(latitude)s, %(longitude)s, %(project_profile)s, %(raw_ocr_text)s, %(extraction_quality)s, %(created_at)s
        )
        """, d)
print(f"Migrated jktjic_potensiproject_2026 & jktjic_potensiproject_2026_projects ({len(proj_rows)} projects) successfully.")

# 2d. project_sections
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_potensiproject_2026_sections;")
cur_mysql.execute("""
CREATE TABLE jktjic_potensiproject_2026_sections (
    id INT PRIMARY KEY,
    project_id INT NOT NULL,
    section_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    sort_order INT NOT NULL,
    KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur2.execute("SELECT * FROM project_sections;")
for row in cur2.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_potensiproject_2026_sections (id, project_id, section_key, title, content, sort_order)
    VALUES (%(id)s, %(project_id)s, %(section_key)s, %(title)s, %(content)s, %(sort_order)s)
    """, d)
print("Migrated jktjic_potensiproject_2026_sections successfully.")

# 2e. project_contacts
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_potensiproject_2026_contacts;")
cur_mysql.execute("""
CREATE TABLE jktjic_potensiproject_2026_contacts (
    id INT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(255),
    role VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    is_primary TINYINT NOT NULL DEFAULT 0,
    KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur2.execute("SELECT * FROM project_contacts;")
for row in cur2.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_potensiproject_2026_contacts (id, project_id, name, role, email, is_primary)
    VALUES (%(id)s, %(project_id)s, %(name)s, %(role)s, %(email)s, %(is_primary)s)
    """, d)
print("Migrated jktjic_potensiproject_2026_contacts successfully.")

# 2f. project_images
cur_mysql.execute("DROP TABLE IF EXISTS jktjic_potensiproject_2026_images;")
cur_mysql.execute("""
CREATE TABLE jktjic_potensiproject_2026_images (
    id INT PRIMARY KEY,
    project_id INT NOT NULL,
    image_type VARCHAR(100) NOT NULL,
    relative_path TEXT NOT NULL,
    caption TEXT,
    source_pdf_page INT NOT NULL,
    crop_box_pixels TEXT,
    width INT NOT NULL,
    height INT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""")
cur2.execute("SELECT * FROM project_images;")
for row in cur2.fetchall():
    d = dict(row)
    cur_mysql.execute("""
    INSERT INTO jktjic_potensiproject_2026_images (id, project_id, image_type, relative_path, caption, source_pdf_page, crop_box_pixels, width, height, sha256)
    VALUES (%(id)s, %(project_id)s, %(image_type)s, %(relative_path)s, %(caption)s, %(source_pdf_page)s, %(crop_box_pixels)s, %(width)s, %(height)s, %(sha256)s)
    """, d)
print("Migrated jktjic_potensiproject_2026_images successfully.")
con2.close()

# Verify tables in MySQL
cur_mysql.execute("SHOW TABLES LIKE 'jktjic_%';")
tables = cur_mysql.fetchall()
print("\n=== VERIFIED TABLES IN local_govtech_floodsense ===")
for t in tables:
    tname = list(t.values())[0]
    cur_mysql.execute(f"SELECT COUNT(*) as count FROM {tname};")
    cnt = cur_mysql.fetchone()["count"]
    print(f"  {tname}: {cnt} rows")

cur_mysql.close()
con_mysql.close()
print("\nAll tables migrated to local_govtech_floodsense successfully!")

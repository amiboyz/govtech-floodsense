import os
import sys
import json
import ssl
import urllib.request
import urllib.parse
from pathlib import Path
import pymysql
from dotenv import load_dotenv
from shapely.geometry import shape, Point, mapping
from shapely.validation import make_valid

load_dotenv()

ROOT = Path(__file__).resolve().parents[1]

def fetch_features_from_big(where_clause, limit=2000):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    params = {
        'where': where_clause,
        'outFields': 'OBJECTID,NAMOBJ,WADMKD,WADMKC,WADMKK,WADMPR,KDEPUM,LUASWH,METADATA',
        'f': 'geojson',
        'resultRecordCount': limit
    }
    url = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer/0/query?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'FloodSense/1.0'})
    print(f"Mengunduh data BIG TASWIL dengan filter: {where_clause}...")
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        content = resp.read().decode('utf-8')
        data = json.loads(content)
        features = data.get('features', [])
        print(f"-> Berhasil mendapatkan {len(features)} desa/kelurahan.")
        return features

def main():
    print("=== ETL Batas Kelurahan BIG TASWIL 2023 ke Database Floodsense ===")
    
    # 1. Load DAS GIS Boundaries
    das_file = ROOT / 'docs/data_gis/das_cilicis.json'
    if not das_file.exists():
        print(f"Error: {das_file} tidak ditemukan!")
        sys.exit(1)
        
    with open(das_file) as f:
        das_geojson = json.load(f)

    das_shapes = []
    for feat in das_geojson.get('features', []):
        d_name = feat['properties'].get('NAMA_DAS')
        d_geom = shape(feat['geometry'])
        if not d_geom.is_valid:
            d_geom = make_valid(d_geom)
        das_shapes.append((d_name, d_geom))
    print(f"Loaded {len(das_shapes)} DAS geometries.")

    # 2. Fetch Kelurahan from BIG Geoservices
    # Batch 1: DKI Jakarta (267 Kelurahan)
    jakarta_features = fetch_features_from_big("WADMPR LIKE '%Jakarta%'")

    # Batch 2: Bodetabek Urban Core (Kota Tangerang, Tangsel, Kota Bekasi, Kota Depok)
    bodetabek_where = (
        "WADMKK LIKE '%Kota Tangerang%' OR "
        "WADMKK LIKE '%Tangerang Selatan%' OR "
        "WADMKK LIKE '%Kota Bekasi%' OR "
        "WADMKK LIKE '%Kota Depok%'"
    )
    bodetabek_features = fetch_features_from_big(bodetabek_where)

    all_raw_features = jakarta_features + bodetabek_features
    print(f"Total kelurahan diunduh: {len(all_raw_features)}")

    # 3. Connect to Database
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database='local_govtech_floodsense',
        autocommit=True
    )
    cur = conn.cursor()

    # Recreate table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cilicis_kelurahan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      objectid INT,
      kdepum VARCHAR(50),
      nama_kelurahan VARCHAR(100),
      nama_kecamatan VARCHAR(100),
      nama_kabkota VARCHAR(100),
      nama_provinsi VARCHAR(100),
      das_name VARCHAR(100),
      luas_ha DECIMAL(10,2),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      metadata_source VARCHAR(100),
      geom GEOMETRY NOT NULL,
      SPATIAL INDEX(geom),
      INDEX(nama_kelurahan),
      INDEX(nama_kecamatan),
      INDEX(das_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cur.execute("TRUNCATE TABLE cilicis_kelurahan;")
    print("Tabel cilicis_kelurahan telah dibersihkan (TRUNCATE).")

    # 4. Process and insert features
    processed_geojson_features = []
    inserted_count = 0

    insert_sql = """
    INSERT INTO cilicis_kelurahan 
    (objectid, kdepum, nama_kelurahan, nama_kecamatan, nama_kabkota, nama_provinsi, das_name, luas_ha, latitude, longitude, metadata_source, geom)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_GeomFromGeoJSON(%s))
    """

    for feat in all_raw_features:
        props = feat.get('properties', {})
        geom_json = feat.get('geometry')
        if not geom_json or not geom_json.get('coordinates'):
            continue

        try:
            poly = shape(geom_json)
            if not poly.is_valid:
                poly = make_valid(poly)
            
            centroid = poly.centroid
            lat = float(centroid.y)
            lon = float(centroid.x)

            # Spatial match with DAS
            matched_das = "Luar DAS Utama"
            best_intersection = 0.0
            pt = Point(lon, lat)

            for d_name, d_geom in das_shapes:
                if d_geom.contains(pt):
                    matched_das = d_name
                    break
                elif d_geom.intersects(poly):
                    inter_area = d_geom.intersection(poly).area
                    if inter_area > best_intersection:
                        best_intersection = inter_area
                        matched_das = d_name

            obj_id = props.get('OBJECTID')
            kdepum = props.get('KDEPUM') or ''
            nama_kel = props.get('NAMOBJ') or props.get('WADMKD') or 'Kelurahan'
            nama_kec = props.get('WADMKC') or ''
            nama_kab = props.get('WADMKK') or ''
            nama_prov = props.get('WADMPR') or ''
            luas_ha = float(props.get('LUASWH') or 0.0)
            meta_src = props.get('METADATA') or 'TASWIL1000020230928_DATA_BATAS_DESAKELURAHAN'

            # Simplify geometry for fast web rendering (tolerance ~35 meters)
            simp_poly = poly.simplify(0.00035, preserve_topology=True)
            if not simp_poly.is_valid:
                simp_poly = make_valid(simp_poly)
            
            simp_geom_dict = mapping(simp_poly)
            geom_str = json.dumps(simp_geom_dict)

            cur.execute(insert_sql, (
                obj_id, kdepum, nama_kel, nama_kec, nama_kab, nama_prov, matched_das, luas_ha, lat, lon, meta_src, geom_str
            ))
            inserted_count += 1

            processed_geojson_features.append({
                "type": "Feature",
                "id": str(obj_id),
                "properties": {
                    "objectid": obj_id,
                    "kdepum": kdepum,
                    "nama_kelurahan": nama_kel,
                    "nama_kecamatan": nama_kec,
                    "nama_kabkota": nama_kab,
                    "nama_provinsi": nama_prov,
                    "das_name": matched_das,
                    "luas_ha": luas_ha,
                    "centroid_lat": lat,
                    "centroid_lon": lon,
                    "metadata": meta_src
                },
                "geometry": simp_geom_dict
            })
        except Exception as e:
            # Fallback to original geometry if simplified geometry had issues
            try:
                geom_str = json.dumps(geom_json)
                cur.execute(insert_sql, (
                    obj_id, kdepum, nama_kel, nama_kec, nama_kab, nama_prov, matched_das, luas_ha, lat, lon, meta_src, geom_str
                ))
                inserted_count += 1
                processed_geojson_features.append({
                    "type": "Feature",
                    "id": str(obj_id),
                    "properties": {
                        "objectid": obj_id,
                        "kdepum": kdepum,
                        "nama_kelurahan": nama_kel,
                        "nama_kecamatan": nama_kec,
                        "nama_kabkota": nama_kab,
                        "nama_provinsi": nama_prov,
                        "das_name": matched_das,
                        "luas_ha": luas_ha,
                        "centroid_lat": lat,
                        "centroid_lon": lon,
                        "metadata": meta_src
                    },
                    "geometry": geom_json
                })
            except Exception as e2:
                print(f"Warning skipping {props.get('NAMOBJ')}: {e2}")

    print(f"Berhasil memasukkan {inserted_count} kelurahan ke dalam tabel cilicis_kelurahan.")

    # 5. Save GeoJSON cache for frontend GIS
    output_geojson_path = ROOT / 'docs/data_gis/kelurahan_jabodetabek.json'
    geojson_data = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "Badan Informasi Geospasial (BIG)",
            "specification": "TASWIL1000020230928_DATA_BATAS_DESAKELURAHAN",
            "scale": "1:10000",
            "total_features": len(processed_geojson_features)
        },
        "features": processed_geojson_features
    }

    with open(output_geojson_path, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, ensure_ascii=False)

    print(f"GeoJSON tersimpan di {output_geojson_path} ({len(processed_geojson_features)} fitur, {os.path.getsize(output_geojson_path) // 1024} KB).")
    print("=== Selesai Mengimpor Batas Kelurahan BIG TASWIL ===")

if __name__ == '__main__':
    main()


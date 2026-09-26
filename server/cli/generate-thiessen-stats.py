import json
import os
from collections import defaultdict
from datetime import datetime, timedelta
import numpy as np
from shapely.geometry import shape, Point, Polygon, mapping
from shapely.ops import unary_union
from scipy.spatial import Voronoi

def bmkg_class(val):
    if val <= 0:
        return "Berawan/Nihil"
    elif val < 20:
        return "Hujan Ringan"
    elif val < 50:
        return "Hujan Sedang"
    elif val < 100:
        return "Hujan Lebat"
    elif val < 150:
        return "Hujan Sangat Lebat"
    else:
        return "Hujan Ekstrem"

def format_date_id(dt_str):
    try:
        dt = datetime.strptime(dt_str, '%Y-%m-%d')
        months = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        return f"{dt.day:02d} {months[dt.month]} {dt.year}"
    except:
        return dt_str

print("Loading natural hydrological boundaries (15 DAS Cilicis)...")
with open('docs/data_gis/das_cilicis.json') as f:
    das_data = json.load(f)

das_shapes = {}
das_geoms = []
for feat in das_data['features']:
    das_name = feat['properties']['NAMA_DAS']
    geom = shape(feat['geometry'])
    das_shapes[das_name] = geom
    das_geoms.append(geom)

# Hydrology does not recognize administrative boundaries:
# Use the complete unified hydrological catchment boundary (Batas Terpadu Wilayah Sungai Ciliwung-Cisadane)
catchment_union = unary_union(das_geoms)
print(f"Loaded {len(das_shapes)} DAS geometries. Unified catchment area: {catchment_union.area * 12265:.1f} km2.")

with open('.build/study/latest-ch.json') as f:
    latest_ch = json.load(f)

with open('.build/study/rain.json') as f:
    rain_data = json.load(f)

# Candidate stations covering entire watershed (upstream Bogor/Puncak down to coastal Jakarta)
st_dict = {}
for s in latest_ch:
    st_id = str(s['station_id'])
    try:
        lat = float(s['latitude'])
        lng = float(s['longitude'])
        if -6.85 <= lat <= -5.9 and 106.35 <= lng <= 107.25:
            st_dict[st_id] = {
                'station_id': st_id,
                'name': s['name'],
                'lat': lat,
                'lng': lng,
                'basin': s.get('das_polder', ''),
                'city': s.get('city', '')
            }
    except:
        pass

for r in rain_data:
    st_id = str(r['station_id'])
    if st_id not in st_dict and r.get('latitude') and r.get('longitude'):
        try:
            lat = float(r['latitude'])
            lng = float(r['longitude'])
            if -6.85 <= lat <= -5.9 and 106.35 <= lng <= 107.25:
                st_dict[st_id] = {
                    'station_id': st_id,
                    'name': r['name'],
                    'lat': lat,
                    'lng': lng,
                    'basin': r.get('basin', ''),
                    'city': ''
                }
        except:
            pass

st_list = list(st_dict.values())
print(f"Total stations for Voronoi tessellation: {len(st_list)}")

pts = np.array([[s['lng'], s['lat']] for s in st_list])
bbox_pts = np.array([
    [105.8, -7.3], [107.8, -7.3], [107.8, -5.3], [105.8, -5.3],
    [105.8, -6.3], [107.8, -6.3], [106.8, -7.3], [106.8, -5.3]
])
all_pts = np.vstack([pts, bbox_pts])
vor = Voronoi(all_pts)

# Construct Voronoi cells clipped strictly to natural hydrological catchment (no administrative clipping!)
thiessen_catchment = {}
geojson_features = []

for i, s in enumerate(st_list):
    reg_idx = vor.point_region[i]
    reg = vor.regions[reg_idx]
    if -1 not in reg and len(reg) > 0:
        poly_pts = [vor.vertices[v] for v in reg]
        cell_poly = Polygon(poly_pts)
        clipped = cell_poly.intersection(catchment_union)
        if not clipped.is_empty and clipped.area > 0:
            thiessen_catchment[s['station_id']] = {
                'station': s,
                'polygon': clipped,
                'area_deg': clipped.area,
                'cell_poly': cell_poly
            }

total_catchment_area = sum(st['area_deg'] for st in thiessen_catchment.values())
for st_id, st in thiessen_catchment.items():
    st['weight'] = st['area_deg'] / total_catchment_area
    st['area_km2'] = round(st['area_deg'] * 12265, 2)
    st['weight_pct'] = round(st['weight'] * 100, 2)

    # Determine matched DAS based on maximum spatial intersection
    best_das = st['station']['basin']
    max_inter = 0
    for das_name, das_geom in das_shapes.items():
        inter = st['polygon'].intersection(das_geom).area
        if inter > max_inter:
            max_inter = inter
            best_das = das_name
    st['matched_das'] = best_das

    geojson_features.append({
        'type': 'Feature',
        'geometry': mapping(st['polygon']),
        'properties': {
            'station_id': st_id,
            'name': st['station']['name'],
            'area_km2': st['area_km2'],
            'weight_pct': st['weight_pct'],
            'das_name': best_das,
            'city': st['station']['city']
        }
    })

print(f"Hydrological Thiessen polygons: {len(thiessen_catchment)} stations, {sum(st['area_km2'] for st in thiessen_catchment.values()):.1f} km2 total area.")

# Daily rain per station
daily_rain = defaultdict(lambda: defaultdict(float))
for r in rain_data:
    st_id = str(r['station_id'])
    val = float(r['value'])
    dt = datetime.strptime(r['hour'], '%Y-%m-%d %H:%M:%S')
    met_date = (dt - timedelta(days=1)).strftime('%Y-%m-%d') if dt.hour < 7 else dt.strftime('%Y-%m-%d')
    daily_rain[st_id][met_date] = max(daily_rain[st_id][met_date], val)

# 1. Catchment-wide Regional Daily Areal Rain (Batas Terpadu Wilayah Sungai)
all_met_dates = sorted({d for st in daily_rain.values() for d in st.keys()})
areal_daily_catchment = []

for d in all_met_dates:
    reporting = [st_id for st_id in thiessen_catchment if d in daily_rain[st_id]]
    if len(reporting) < 15:
        continue
    sum_w = sum(thiessen_catchment[st_id]['weight'] for st_id in reporting)
    areal_r = sum(thiessen_catchment[st_id]['weight'] * daily_rain[st_id][d] for st_id in reporting) / sum_w
    areal_daily_catchment.append({
        'date': d,
        'areal_rain_mm': areal_r,
        'reporting': len(reporting)
    })

areal_daily_catchment.sort(key=lambda x: x['areal_rain_mm'], reverse=True)
top_catchment = areal_daily_catchment[0]
wet_days_catchment = [r['areal_rain_mm'] for r in areal_daily_catchment if int(r['date'][5:7]) in [11, 12, 1, 2, 3, 4]]
avg_wet_catchment = sum(wet_days_catchment) / len(wet_days_catchment) if wet_days_catchment else 0.0

regional_catchment_stats = {
    'max_daily_mm': round(top_catchment['areal_rain_mm'], 1),
    'max_date_raw': top_catchment['date'],
    'max_date': format_date_id(top_catchment['date']),
    'bmkg_category': bmkg_class(top_catchment['areal_rain_mm']),
    'avg_wet_season_mm': round(avg_wet_catchment, 1),
    'active_stations': top_catchment['reporting'],
    'area_km2': round(total_catchment_area * 12265, 1),
    'method': 'Poligon Thiessen (Wilayah Sungai / DAS Terpadu)'
}

# 2. Per-DAS Daily Areal Rain (Setiap DAS dihitung menurut batas hidrologis alaminya)
das_stats = {}
for das_name, das_geom in das_shapes.items():
    das_stations = {}
    for i, s in enumerate(st_list):
        reg_idx = vor.point_region[i]
        reg = vor.regions[reg_idx]
        if -1 not in reg and len(reg) > 0:
            poly_pts = [vor.vertices[v] for v in reg]
            cell_poly = Polygon(poly_pts)
            clipped = cell_poly.intersection(das_geom)
            if not clipped.is_empty and clipped.area > 0:
                das_stations[s['station_id']] = {
                    'station': s,
                    'area_deg': clipped.area
                }
    if not das_stations:
        continue
    tot_area = sum(st['area_deg'] for st in das_stations.values())
    for st_id, st in das_stations.items():
        st['weight'] = st['area_deg'] / tot_area
        st['area_km2'] = round(st['area_deg'] * 12265, 2)
    
    das_daily = []
    for d in all_met_dates:
        rep = [st_id for st_id in das_stations if d in daily_rain[st_id]]
        if not rep:
            continue
        sum_w = sum(das_stations[st_id]['weight'] for st_id in rep)
        val = sum(das_stations[st_id]['weight'] * daily_rain[st_id][d] for st_id in rep) / sum_w
        das_daily.append({'date': d, 'value': val, 'reporting': len(rep)})
    
    if not das_daily:
        continue
    das_daily.sort(key=lambda x: x['value'], reverse=True)
    top_das = das_daily[0]
    wet_das = [r['value'] for r in das_daily if int(r['date'][5:7]) in [11, 12, 1, 2, 3, 4]]
    avg_wet = (sum(wet_das) / len(wet_das)) if wet_das else 0.0

    das_stats[das_name] = {
        'das_name': das_name,
        'max_daily_mm': round(top_das['value'], 1),
        'max_date_raw': top_das['date'],
        'max_date': format_date_id(top_das['date']),
        'bmkg_category': bmkg_class(top_das['value']),
        'avg_wet_season_mm': round(avg_wet, 1),
        'station_count': len(das_stations),
        'area_km2': round(tot_area * 12265, 1)
    }

# 3. Individual station stats
station_stats = {}
for s in st_list:
    st_id = s['station_id']
    th = thiessen_catchment.get(st_id)
    area_km2 = th['area_km2'] if th else 0.0
    weight_pct = th['weight_pct'] if th else 0.0
    matched_das = th['matched_das'] if th else (s.get('basin') or 'DAS Ciliwung')
    
    days = daily_rain.get(st_id, {})
    if days:
        sorted_days = sorted(days.items(), key=lambda x: x[1], reverse=True)
        max_d, max_v = sorted_days[0]
        wet_v = [v for d, v in days.items() if int(d[5:7]) in [11, 12, 1, 2, 3, 4]]
        avg_wet_st = (sum(wet_v) / len(wet_v)) if wet_v else 0.0
    else:
        max_d, max_v = "-", 0.0
        avg_wet_st = 0.0

    das_info = das_stats.get(matched_das, regional_catchment_stats)

    station_stats[st_id] = {
        'station_id': st_id,
        'name': s['name'],
        'thiessen_area_km2': area_km2,
        'thiessen_weight_pct': weight_pct,
        'matched_das': matched_das,
        'max_rain_reading': round(max_v, 1),
        'avg_rainy_season_reading': round(avg_wet_st, 1),
        'max_daily_rain': round(max_v, 1),
        'max_daily_date': format_date_id(max_d) if max_d != "-" else "-",
        'max_daily_bmkg': bmkg_class(max_v),
        'avg_rainy_season_daily': round(avg_wet_st, 1),
        # Regional Catchment / DAS Thiessen Areal Values
        'regional_thiessen': regional_catchment_stats,
        'das_thiessen': das_info
    }

with open('.build/study/station-seasonal-stats.json') as f:
    existing = json.load(f)

# Keep both names for seamless backward compatibility
existing['thiessen_regional_dki'] = regional_catchment_stats
existing['thiessen_regional_catchment'] = regional_catchment_stats
existing['thiessen_das'] = das_stats
existing['thiessen_station_stats'] = station_stats
existing['generated_at'] = datetime.now().isoformat()

with open('.build/study/station-seasonal-stats.json', 'w') as f:
    json.dump(existing, f, indent=2)

geojson_obj = {
    'type': 'FeatureCollection',
    'features': geojson_features
}
with open('.build/study/thiessen-polygons.json', 'w') as f:
    json.dump(geojson_obj, f, indent=2)

print("SUCCESS: station-seasonal-stats.json and thiessen-polygons.json updated with natural hydrological boundaries!")
print(f"Catchment-Wide Thiessen Max: {regional_catchment_stats['max_daily_mm']} mm ({regional_catchment_stats['max_date']}, {regional_catchment_stats['bmkg_category']})")
print(f"Catchment-Wide Wet Season Avg: {regional_catchment_stats['avg_wet_season_mm']} mm/hari")

"""Exploratory rainfall -> stage forecasts with locked historical replay issues."""
import argparse
import hashlib
import json
import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
HORIZONS = range(1, 7)


def read(name):
    return json.loads((ROOT / '.build/study' / f'{name}.json').read_text())


def dt(value):
    return datetime.fromisoformat(value)


def group(rows):
    result = {}
    for row in rows:
        key = str(row['station_id'])
        result.setdefault(key, {'meta': row, 'series': {}})['series'][dt(row['hour'])] = float(row['value'])
    return result


def distance(a, b):
    try:
        lat1, lon1, lat2, lon2 = map(float, [a['latitude'], a['longitude'], b['latitude'], b['longitude']])
        if not (-7 < lat1 < -5 and -7 < lat2 < -5 and 105 < lon1 < 108 and 105 < lon2 < 108):
            return float('inf')
        x = math.sin(math.radians(lat2-lat1)/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(math.radians(lon2-lon1)/2)**2
        return 12742 * math.asin(min(1, math.sqrt(x)))
    except (ValueError, TypeError):
        return float('inf')


def fit(x, y):
    mean, scale = x.mean(axis=0), x.std(axis=0)
    scale[scale < 1e-8] = 1
    z = np.column_stack([np.ones(len(x)), (x-mean)/scale])
    penalty = np.eye(z.shape[1]); penalty[0, 0] = 0
    weights = np.linalg.solve(np.einsum('ni,nj->ij', z, z)+penalty, np.einsum('ni,n->i', z, y))
    return mean, scale, weights


def predict(model, x):
    mean, scale, weights = model
    return np.einsum('ni,i->n', np.column_stack([np.ones(len(x)), (x-mean)/scale]), weights)


def predict_one(model, features):
    return float(predict(model, np.array([features], dtype=float))[0])


def metrics(y, p):
    return {'mae': float(np.mean(np.abs(y-p))), 'rmse': float(np.sqrt(np.mean((y-p)**2))), 'bias': float(np.mean(p-y))}


def driver_lens(name):
    coastal = ('marina', 'pluit', 'kali asin', 'pasar ikan', 'ancol')
    return 'coastal_backwater_candidate' if any(token in name.lower() for token in coastal) else 'river_rainfall_experiment'


parser = argparse.ArgumentParser()
parser.add_argument('--split', default='2026-03-01')
parser.add_argument('--output', default='historical-replay.json')
args = parser.parse_args()
cut = dt(args.split)

rain, tma, events = group(read('rain')), group(read('tma')), read('events')
frame_times = set()
for event in events:
    event_hour = dt(event['occurred_at']).replace(minute=0, second=0)
    for offset in range(-9, 1):
        issue = event_hour + timedelta(hours=offset)
        if issue >= cut:
            frame_times.add(issue)

frames = {}
frame_predictions = {}
for issue in sorted(frame_times):
    key = str(issue)
    frames[key] = {
        'issued_at': key,
        'valid_at': str(issue + timedelta(hours=6)),
        'rain': [],
        'predictions': [],
        'reports': [event for event in events if issue < dt(event['occurred_at']) <= issue + timedelta(hours=6)],
    }
    frame_predictions[key] = {}
    observed_bin = issue - timedelta(hours=1)
    for station_id, station in rain.items():
        if observed_bin in station['series'] and math.isfinite(distance(station['meta'], station['meta'])):
            frames[key]['rain'].append({
                'station_id': station_id, 'name': station['meta']['name'],
                'latitude': float(station['meta']['latitude']), 'longitude': float(station['meta']['longitude']),
                'value': station['series'][observed_bin], 'available_at': key,
            })

results = []
for station_id, station in tma.items():
    candidates = sorted(rain.items(), key=lambda pair: distance(station['meta'], pair[1]['meta']))
    if not candidates:
        continue
    rain_id, rain_station = candidates[0]
    pair_km = distance(station['meta'], rain_station['meta'])
    if pair_km > 10:
        continue

    input_rows = []
    for current_bin, current_value in sorted(station['series'].items()):
        rain_times = [current_bin-timedelta(hours=lag) for lag in range(6)]
        previous = station['series'].get(current_bin-timedelta(hours=1))
        if previous is None or any(moment not in rain_station['series'] for moment in rain_times):
            continue
        input_rows.append({
            'current_bin': current_bin,
            'issue': current_bin + timedelta(hours=1),
            'features': [rain_station['series'][moment] for moment in rain_times] + [current_value, current_value-previous],
            'current': current_value,
        })

    for horizon in HORIZONS:
        labeled = [(row, station['series'].get(row['current_bin']+timedelta(hours=horizon))) for row in input_rows]
        train = [(row, target) for row, target in labeled if target is not None and row['issue']+timedelta(hours=horizon) < cut]
        test = [(row, target) for row, target in labeled if target is not None and row['issue'] >= cut]
        if len(train) < 120 or len(test) < 30:
            continue

        x = np.array([row['features'] for row, _ in train], dtype=float)
        y = np.array([target for _, target in train], dtype=float)
        xt = np.array([row['features'] for row, _ in test], dtype=float)
        yt = np.array([target for _, target in test], dtype=float)
        full = fit(x, y)
        rain_model = fit(x[:, :6], y)
        tma_model = fit(x[:, 6:], y)
        pred_full = predict(full, xt)
        pred_rain = predict(rain_model, xt[:, :6])
        pred_tma = predict(tma_model, xt[:, 6:])
        persistence = xt[:, 6]
        if not all(np.isfinite(values).all() for values in [pred_full, pred_rain, pred_tma, yt]):
            raise ValueError('Non-finite predictions; artifact not published')

        calibration_start = max(60, int(len(train)*0.8))
        calibration_model = fit(x[:calibration_start], y[:calibration_start])
        calibration_residual = y[calibration_start:] - predict(calibration_model, x[calibration_start:])
        residual_low, residual_high = np.quantile(calibration_residual, [0.1, 0.9]) if len(calibration_residual) >= 20 else (0.0, 0.0)

        test_by_issue = {str(row['issue']): (float(pred_full[i]), float(yt[i])) for i, (row, _) in enumerate(test)}
        for row in input_rows:
            issue_key = str(row['issue'])
            if issue_key not in frames:
                continue
            prediction = predict_one(full, row['features'])
            actual = station['series'].get(row['current_bin']+timedelta(hours=horizon))
            entry = frame_predictions[issue_key].setdefault(station_id, {
                'station_id': station_id, 'name': station['meta']['name'],
                'latitude': float(station['meta']['latitude']), 'longitude': float(station['meta']['longitude']),
                'rain_station_id': rain_id, 'rain_station': rain_station['meta']['name'],
                'pair_distance_km': round(pair_km, 2), 'current': float(row['current']),
                'driver_lens': driver_lens(station['meta']['name']),
                'history': [
                    {'time': str(moment+timedelta(hours=1)), 'actual': float(station['series'][moment])}
                    for moment in [row['current_bin']-timedelta(hours=lag) for lag in range(11, -1, -1)]
                    if moment in station['series']
                ],
                'trajectory': [],
            })
            entry['trajectory'].append({
                'horizon': horizon, 'valid_at': str(row['issue']+timedelta(hours=horizon)),
                'predicted': prediction,
                'lower': prediction+float(residual_low), 'upper': prediction+float(residual_high),
                'actual': float(actual) if actual is not None else None,
                'absolute_error': float(abs(prediction-actual)) if actual is not None else None,
            })

        event_checks = []
        for event in events:
            if distance(station['meta'], event) > 5:
                continue
            event_time = dt(event['occurred_at'])
            choices = [(issue, values) for issue, values in test_by_issue.items() if dt(issue)+timedelta(hours=horizon) <= event_time and event_time-(dt(issue)+timedelta(hours=horizon)) <= timedelta(hours=6)]
            if choices:
                issue, (predicted, observed) = choices[-1]
                event_checks.append({'event_id': event['uid'], 'report_source': event.get('report_source', 'unknown'), 'occurred_at': event['occurred_at'], 'distance_km': round(distance(station['meta'], event), 2), 'predicted_tma': predicted, 'observed_tma': observed, 'issue_time': issue})

        results.append({
            'station_id': station_id, 'station_name': station['meta']['name'],
            'rain_station': rain_station['meta']['name'], 'pair_distance_km': round(pair_km, 2),
            'driver_lens': driver_lens(station['meta']['name']), 'horizon_hours': horizon,
            'train_n': len(train), 'test_n': len(test),
            'train_start': str(train[0][0]['current_bin']), 'train_end': str(train[-1][0]['current_bin']),
            'test_start': str(test[0][0]['current_bin']), 'test_end': str(test[-1][0]['current_bin']),
            'metrics': {'rain_only': metrics(yt, pred_rain), 'rain_and_tma': metrics(yt, pred_full), 'tma_only': metrics(yt, pred_tma), 'persistence': metrics(yt, persistence)},
            'model': {'means': full[0].tolist(), 'scales': full[1].tolist(), 'weights': full[2].tolist()},
            'calibration_band': {'lower_residual_q10': float(residual_low), 'upper_residual_q90': float(residual_high), 'samples': len(calibration_residual), 'status': 'exploratory_pre_cut_calibration'},
            'event_checks': event_checks,
            'series': [
                {'time': str(row['issue']+timedelta(hours=horizon)), 'actual': float(yt[i]), 'predicted': float(pred_full[i]), 'persistence': float(persistence[i])}
                for i, (row, _) in list(enumerate(test))[-168:]
            ],
        })

for key in frames:
    frames[key]['predictions'] = sorted(frame_predictions[key].values(), key=lambda item: item['name'])

event_quality = read('events-quality') if (ROOT/'.build/study/events-quality.json').exists() else {'rows': len(events)}
report = {
    'status': 'experiment', 'generated_at': datetime.now().isoformat(),
    'source': 'historical MySQL; read-only extraction',
    'split': args.split+'; training target bin ends strictly before cutoff; test issue >= cutoff',
    'counts': {
        'rain_stations': len(rain), 'tma_stations': len(tma), 'regional_flood_reports': len(events),
        'test_period_reports': sum(dt(event['occurred_at']) >= cut for event in events),
        'reports_by_source': event_quality.get('by_source', {}), 'experiments': len(results),
    },
    'results': results, 'frames': list(frames.values()),
    'model_scope': {
        'current': 'river/rainfall exploratory stage forecast',
        'planned_tracks': [
            {'key': 'riverine', 'label': 'Luapan sungai', 'dynamic_inputs': ['rainfall catchment/upstream', 'upstream and local stage', 'future rainfall'], 'readiness': 'experimental_stage_forecast'},
            {'key': 'urban_drainage', 'label': 'Drainase kota', 'dynamic_inputs': ['local rainfall nowcast', 'drainage/polder state', 'pump operation', 'receiving-water stage'], 'readiness': 'data_gap'},
            {'key': 'coastal', 'label': 'Rob & muara', 'dynamic_inputs': ['predicted tide', 'sea-side stage', 'river-side stage', 'pump/gate operation', 'rainfall'], 'readiness': 'candidate_sensors_found'},
        ],
        'coastal_candidates': ['P.A. Marina Ancol (Laut)', 'P.A. Marina Ancol (Kali)', 'Pompa Kali Asin (Bubble)', 'Pompa Pasar Ikan 1', 'Rumah Pompa Pluit 1'],
    },
    'spatial_validation': {'status': 'not_evaluable', 'precision': None, 'recall': None, 'iou': None, 'reason': 'Point reports and raw/algorithmic area fields do not provide independently surveyed wet/dry coverage.'},
    'limitations': [
        'Rain feature uses KETINGGIAN_TERAKHIR as an uncalibrated source signal. It is NOT claimed as hourly rainfall mm.',
        'Source DATETIME timezone and observation arrival times must be confirmed. Replay assumes hourly values were available at bin end.',
        'Nearest gauge <=10 km is an exploratory fallback, not verified catchment or upstream connectivity.',
        'Forecast rain after issue is unavailable. Forecasts are conditional on observed history and do not represent continued future rainfall.',
        'TMA units/datum and extreme values require source-owner confirmation. Metrics remain in source units.',
        'Cilicis and Sitaba reports are retained independently; same-event deduplication is not asserted.',
        'Report points are positive evidence only. Absence of reports is not a dry label and no inundation polygon is produced.',
        'Calibration bands use pre-cut residual quantiles and are exploratory, not formal confidence intervals.',
    ],
    'provenance': {
        'files': {name: hashlib.sha256((ROOT/'.build/study'/f'{name}.json').read_bytes()).hexdigest() for name in ['rain', 'tma', 'events']},
        'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'rain_quality': read('rain-quality'), 'tma_quality': read('tma-quality'), 'event_quality': event_quality,
        'features': ['rain_lag_0', 'rain_lag_1', 'rain_lag_2', 'rain_lag_3', 'rain_lag_4', 'rain_lag_5', 'current_tma', 'tma_change_1h'],
        'model': 'ridge alpha=1, training-only standardization; nearest rain gauge <=10 km; independent horizon models',
        'target': 'Mean TMA of hourly bin ending issued_at + horizon; not instantaneous or maximum TMA',
        'selection': 'All eligible sites; >=120 training and >=30 test pairs; complete hourly lags. Event-centered issues are selected for inspection only, not aggregate scoring.',
    },
}
out = ROOT/'analysis/results'; out.mkdir(parents=True, exist_ok=True)
(out/Path(args.output).name).write_text(json.dumps(report, indent=2, allow_nan=False))
print(json.dumps(report['counts']))

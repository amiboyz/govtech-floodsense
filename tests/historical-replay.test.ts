import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { test } from 'node:test';
import { createHash } from 'node:crypto';

const artifact = JSON.parse(await readFile('analysis/results/historical-replay.json', 'utf8'));
const hour = 3_600_000;
// Treat wall-clock source times on a common arithmetic axis; do NOT infer UTC.
const time = (s: string) => Date.parse(s.replace(' ', 'T') + 'Z');

test('historical replay has a real six-hour target and strictly past training labels', () => {
  assert.equal(artifact.status, 'experiment');
  assert.ok(artifact.frames.length > 0);
  const cut = time(artifact.split.slice(0, 10) + ' 00:00:00');
  for (const r of artifact.results) {
    assert.ok(time(r.train_end) + (r.horizon_hours + 1) * hour < cut);
    assert.ok(time(r.test_start) + hour >= cut);
    for (const m of Object.values(r.metrics) as {mae:number;rmse:number;bias:number}[]) {
      assert.ok(Number.isFinite(m.mae) && Number.isFinite(m.rmse) && Number.isFinite(m.bias));
      assert.ok(m.rmse + 1e-7 >= m.mae);
    }
  }
  for (const f of artifact.frames) {
    assert.equal(time(f.valid_at) - time(f.issued_at), 6 * hour);
    assert.ok(time(f.issued_at) >= cut);
    for (const r of f.rain) assert.ok(time(r.available_at) <= time(f.issued_at));
    for (const e of f.reports) assert.ok(time(e.occurred_at) > time(f.issued_at) && time(e.occurred_at) <= time(f.valid_at));
    for (const p of f.predictions) {
      assert.ok(p.trajectory && p.trajectory.length > 0);
      for (const t of p.trajectory) {
        if (t.actual !== null && t.absolute_error !== null) {
          assert.ok(Math.abs(Math.abs(t.actual - t.predicted) - t.absolute_error) < 1e-7);
        }
      }
    }
  }
});

test('missing inundation predictions and field coverage do not become numeric accuracy', () => {
  assert.equal(artifact.spatial_validation.status, 'not_evaluable');
  for (const key of ['precision', 'recall', 'iou']) assert.equal(artifact.spatial_validation[key], null);
  assert.ok(artifact.provenance.selection.includes('not aggregate scoring'));
});

test('published artifact matches training source and all frame predictions reproduce from past inputs', async (t) => {
  const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
  assert.equal(sha(await readFile('analysis/train_study.py')), artifact.provenance.script_sha256);
  try { await access('.build/study/rain.json'); await access('.build/study/tma.json'); await access('.build/study/events.json'); }
  catch { t.skip('Local extraction absent; run study-extract-stations.ts for source reproduction test'); return; }
  type Row = {station_id:string|number;hour:string;value:number};
  const maps: Record<string,Map<string,number>> = {};
  for (const name of ['rain','tma','events']) {
    const body = await readFile(`.build/study/${name}.json`, 'utf8');
    assert.equal(sha(body), artifact.provenance.files[name]);
    if (name !== 'events') maps[name] = new Map((JSON.parse(body) as Row[]).map(r => [`${r.station_id}:${time(r.hour)}`, r.value]));
  }
  for (const frame of artifact.frames) for (const p of frame.predictions) {
    const r = artifact.results.find((r: {station_id:string;horizon_hours:number}) => r.station_id === p.station_id && r.horizon_hours === 6);
    assert.ok(r);
    const bin = time(frame.issued_at) - hour;
    const current = maps.tma.get(`${p.station_id}:${bin}`)!;
    const previous = maps.tma.get(`${p.station_id}:${bin-hour}`)!;
    const features = Array.from({length:6}, (_,lag) => maps.rain.get(`${p.rain_station_id}:${bin-lag*hour}`)!);
    features.push(current, current-previous);
    assert.ok(features.every(Number.isFinite));
    const predicted = r.model.weights[0] + features.reduce((sum,v,i)=>sum + (v-r.model.means[i])/r.model.scales[i]*r.model.weights[i+1],0);
    const t6 = p.trajectory.find((t: {horizon: number}) => t.horizon === 6);
    assert.ok(t6);
    assert.ok(Math.abs(predicted - t6.predicted) < 1e-6);
    if (t6.actual !== null) {
      assert.equal(maps.tma.get(`${p.station_id}:${bin+6*hour}`), t6.actual);
    }
    assert.equal(current, p.current);
  }
});

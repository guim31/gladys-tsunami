// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, an alert or its end, tsunami.gov lost and back, a user action),
// never one line per refresh cycle nor per routine information statement; a
// failure that repeats at every cycle is logged once, plus one line when it is
// over. Never the coordinates of the home.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEFORE_PANAMA,
  CRESCENT_CITY,
  HILO,
  captureLogs,
  createAll,
  createWorld,
  cycle,
  usBulletin,
} from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  await world(t);
  assert.deepEqual(lines.map(strip), ['[INFO] [tsunami] Started: tsunami.gov read every 1 min']);
});

test('normal cycles and an information statement write nothing at info', async (t) => {
  const w = await world(t, { clock: { time: BEFORE_PANAMA } });
  await createAll(w);
  const lines = captureLogs(t, 'info');
  for (let i = 0; i < 30; i += 1) {
    await cycle(w);
  }
  assert.equal(w.fake.sceneEvents.length, 1);
  assert.deepEqual(lines, []);
});

test('a warning and its end are one info line each', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  const lines = captureLogs(t, 'info');
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('warning') });
  await cycle(w);
  w.api.addBulletin({ number: 2, issuedAt: w.clock.now() + 1000, ...usBulletin('cancellation') });
  await cycle(w);
  assert.deepEqual(lines.map(strip), [
    '[INFO] [tsunami] Tsunami warning for Alaska, BC and US West Coast (PAAQ/tsyn01/1/WEAK51)',
    '[INFO] [tsunami] Alert ended for Alaska, BC and US West Coast (PAAQ/tsyn01/2/WEAK51)',
  ]);
});

test('LOG_LEVEL=debug shows the cycles, never the coordinates of the home', async (t) => {
  const lines = captureLogs(t, 'debug');
  const w = await world(t);
  await cycle(w);
  const configured = await world(t, { config: CRESCENT_CITY });
  await cycle(configured);
  assert.ok(lines.some((line) => /taken as known/.test(line.text)));
  const all = lines.map((line) => line.text).join('\n');
  for (const value of [HILO.latitude, HILO.longitude, 41.7558, -124.2026]) {
    assert.doesNotMatch(all, new RegExp(String(value).replace('.', '\\.')));
  }
});

test('tsunami.gov down at every cycle: one warning, then one line at recovery', async (t) => {
  const w = await world(t);
  const lines = captureLogs(t, 'info');
  w.api.down = 503;
  for (let i = 0; i < 4; i += 1) {
    await cycle(w);
  }
  assert.deepEqual(
    lines.map((line) => [line.level, strip(line).replace(/^\[\w+\] /, '')]),
    [['warn', '[tsunami] tsunami.gov unreachable: /events/js/previous.js: HTTP 503']],
  );
  w.api.down = false;
  await cycle(w);
  assert.deepEqual(lines.slice(1).map(strip), ['[INFO] [tsunami] tsunami.gov answers again']);
});

test('states refused at every cycle: one warning, then one line at recovery', async (t) => {
  const w = await world(t);
  await createAll(w);
  const lines = captureLogs(t, 'info');
  const publish = t.mock.method(w.gladys, 'publishChangedStates', async () => {
    throw new Error('Gladys unreachable');
  });
  for (let i = 0; i < 3; i += 1) {
    await cycle(w);
  }
  assert.ok(publish.mock.callCount() >= 3);
  assert.deepEqual(
    lines.map((line) => [line.level, strip(line).replace(/^\[\w+\] /, '')]),
    [['warn', '[tsunami] Publishing the states failed: Gladys unreachable']],
  );
  publish.mock.restore();
  await cycle(w);
  assert.match(lines.at(-1).text, /\[INFO\].*Publishing the states works again/);
});

test('invalid coordinates are said once, at the start', async (t) => {
  const lines = captureLogs(t, 'info');
  const w = await world(t, { config: { latitude: 'abc', longitude: '2' } });
  for (let i = 0; i < 3; i += 1) {
    await cycle(w);
  }
  assert.deepEqual(lines.map(strip), [
    '[WARN] [tsunami] The coordinates of the configuration are not valid: the house is used',
    '[INFO] [tsunami] Started: tsunami.gov read every 1 min',
  ]);
});

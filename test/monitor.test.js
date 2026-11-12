// -----------------------------------------------------------------------------
// The monitor against the fake tsunami.gov: the real bulletins of the Panama
// earthquake of 9/10/2026 replayed minute by minute, a US warning and its
// cancellation, the expiries, the first start and the restarts, the region
// deduced from the home, the site down, the conditional requests and the
// container's own refresh timer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idsOf } from '../src/device.js';
import { TRIGGER } from '../src/monitor.js';
import {
  BEFORE_PANAMA,
  CRESCENT_CITY,
  PANAMA_QUAKE,
  PEDASI,
  createAll,
  createWorld,
  cycle,
  lastValue,
  usBulletin,
} from './helpers/world.js';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}
const value = (w, key) => lastValue(w, idsOf(w.gladys).device, key);
const at = (iso) => Date.parse(iso);

test('one device, refreshed by the container, nothing in effect today in Hawaii', async (t) => {
  const w = await world(t);
  assert.equal(w.fake.discoveredDevices.length, 1);
  assert.equal(w.fake.discoveredDevices[0].should_poll, false);
  assert.equal(w.fake.discoveredDevices[0].poll_frequency, undefined);
  assert.deepEqual(w.fake.states, []);
  await createAll(w);
  assert.equal(w.monitor.region.key, 'hawaii');
  assert.equal(value(w, 'level'), 0);
  assert.equal(value(w, 'message'), 'Aucun message en cours');
  assert.equal(value(w, 'magnitude'), 0);
  assert.equal(value(w, 'quake'), 'Aucun séisme');
  assert.equal(value(w, 'arrival'), 'Non indiquée');
  assert.deepEqual(w.fake.sceneEvents, []);
  assert.deepEqual(w.fake.connectionStatus, { connected: true });
});

test('the Panama threat messages, replayed: threat, arrival time, then the final message', async (t) => {
  const w = await world(t, {
    config: { ...PEDASI, language: 'en' },
    clock: { time: BEFORE_PANAMA },
  });
  await createAll(w);
  assert.equal(w.monitor.region.key, 'pacific');
  assert.equal(value(w, 'level'), 0);

  // Message 2 (18:32): hazardous waves of 1 to 3 m forecast for Panama.
  await cycle(w, { at: at('2026-10-09T18:33:00Z') });
  assert.equal(value(w, 'level'), 2);
  assert.equal(value(w, 'message'), 'Tsunami threat message');
  assert.equal(value(w, 'magnitude'), 7.6);
  assert.match(value(w, 'quake'), /^PANAMA, Oct 9/);
  // Punta Mala, 15 km from the home: 18:20 UTC is 08:20 in Honolulu (TZ of the tests).
  assert.equal(value(w, 'arrival'), 'PUNTA MALA (PANAMA): Oct 9, 08:20 AM');
  assert.equal(w.fake.sceneEvents.length, 1);
  const event = w.fake.sceneEvents[0];
  assert.equal(event.key, TRIGGER);
  assert.equal(event.data.kind, 'threat');
  assert.equal(event.data.region, 'pacific');
  assert.equal(event.data.level, 2);
  assert.equal(
    event.data.url,
    'https://www.tsunami.gov/events/PHEB/2026/10/09/26282000/2/WEPA40/WEPA40.txt',
  );

  // Nothing new: nothing fires again.
  await cycle(w, { at: at('2026-10-09T18:40:00Z') });
  assert.equal(w.fake.sceneEvents.length, 1);

  // Message 3 (18:51), then the final message (19:40): the threat is over.
  await cycle(w, { at: at('2026-10-09T18:52:00Z') });
  assert.equal(w.fake.sceneEvents.length, 2);
  assert.equal(value(w, 'level'), 2);
  await cycle(w, { at: at('2026-10-09T19:41:00Z') });
  assert.equal(w.fake.sceneEvents.at(-1).data.kind, 'cancellation');
  assert.equal(value(w, 'level'), 0);
  assert.equal(value(w, 'message'), 'Alert ended');
  // Shown one hour (no CAP expiry), then "no message in effect".
  await cycle(w, { at: at('2026-10-09T20:45:00Z') });
  assert.equal(value(w, 'message'), 'No message in effect');
  assert.equal(value(w, 'magnitude'), 0);
});

test('Hawaii, same earthquake: an information statement, level 0, until its CAP expiry', async (t) => {
  const w = await world(t, { clock: { time: BEFORE_PANAMA } });
  await createAll(w);
  await cycle(w, { at: at('2026-10-09T18:38:00Z') });
  assert.equal(w.fake.sceneEvents.length, 1);
  assert.equal(w.fake.sceneEvents[0].data.kind, 'information');
  assert.equal(value(w, 'level'), 0);
  assert.equal(value(w, 'message'), "Message d'information");
  assert.equal(value(w, 'magnitude'), 7.6);
  assert.equal(value(w, 'arrival'), 'Non indiquée');
  // CAP expiry: 19:37:39.
  await cycle(w, { at: at('2026-10-09T19:38:00Z') });
  assert.equal(value(w, 'message'), 'Aucun message en cours');
});

test('a US warning is level 3 until its cancellation; another region ignores it', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  assert.equal(w.monitor.region.key, 'alaska_west_coast');
  const start = w.clock.now();
  w.api.addBulletin({ issuedAt: start + 30000, ...usBulletin('warning') });
  await cycle(w);
  assert.equal(value(w, 'level'), 3);
  assert.equal(value(w, 'message'), 'Alerte tsunami');
  assert.equal(w.fake.sceneEvents.at(-1).data.kind, 'warning');
  // An east coast bulletin is not for this region.
  w.api.addBulletin({ wmo: 'WEXX30', eventId: 'tsyn02', issuedAt: start + 90000 });
  await cycle(w);
  assert.equal(w.fake.sceneEvents.length, 1);
  // Still in effect hours later, without CAP expiry.
  await cycle(w, { minutes: 6 * 60 });
  assert.equal(value(w, 'level'), 3);
  w.api.addBulletin({ number: 2, issuedAt: w.clock.now() + 1000, ...usBulletin('cancellation') });
  await cycle(w);
  assert.equal(value(w, 'level'), 0);
  assert.equal(value(w, 'message'), "Fin d'alerte");
  assert.deepEqual(
    w.fake.sceneEvents.map((e) => e.data.kind),
    ['warning', 'cancellation'],
  );
});

test('an alert without any newer bulletin for 12 hours is over', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('watch') });
  await cycle(w);
  assert.equal(value(w, 'level'), 2);
  await cycle(w, { minutes: 11 * 60 });
  assert.equal(value(w, 'level'), 2);
  await cycle(w, { minutes: 61 });
  assert.equal(value(w, 'level'), 0);
});

test('first start during an alert: shown at once, no trigger; a restart fires nothing', async (t) => {
  const clock = { time: at('2026-10-09T18:35:00Z') };
  const w = await world(t, { config: PEDASI, clock });
  await createAll(w);
  assert.equal(value(w, 'level'), 2);
  assert.deepEqual(w.fake.sceneEvents, []);
  await w.app.stop();
  const again = await world(t, { config: PEDASI, clock, dataDir: w.dataDir });
  await cycle(again);
  assert.deepEqual(again.fake.sceneEvents, []);
  await cycle(again, { at: at('2026-10-09T18:52:00Z') });
  assert.equal(again.fake.sceneEvents.length, 1);
});

test('the region follows the home; far from every coast, the status says so', async (t) => {
  const paris = await world(t, { houses: [{ id: 'h', latitude: 48.85, longitude: 2.35 }] });
  assert.equal(paris.monitor.region, null);
  assert.equal(paris.fake.connectionStatus.connected, true);
  assert.match(paris.fake.connectionStatus.message.fr, /loin des côtes/);
  const nowhere = await world(t, { houses: [] });
  assert.match(nowhere.fake.connectionStatus.message.en, /No region/);
  const chosen = await world(t, { houses: [], config: { region: 'caribbean' } });
  assert.equal(chosen.monitor.region.key, 'caribbean');
  assert.equal(chosen.fake.connectionStatus.message, undefined);
});

test('a new region takes its bulletins as known, the device stays the same', async (t) => {
  const w = await world(t, { clock: { time: at('2026-10-09T19:00:00Z') } });
  await createAll(w);
  const device = w.fake.discoveredDevices[0].external_id;
  await w.fake.configUpdated({ ...PEDASI });
  assert.equal(w.monitor.region.key, 'pacific');
  assert.equal(w.fake.discoveredDevices.at(-1).external_id, device);
  assert.equal(value(w, 'level'), 2);
  assert.deepEqual(w.fake.sceneEvents, []);
});

test('tsunami.gov down: disconnected with a message in four languages, back after', async (t) => {
  const w = await world(t);
  await createAll(w);
  w.api.down = 503;
  await cycle(w);
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.deepEqual(Object.keys(w.fake.connectionStatus.message), ['en', 'fr', 'de', 'es']);
  w.api.down = 'network';
  await cycle(w);
  w.api.down = false;
  await cycle(w);
  assert.deepEqual(w.fake.connectionStatus, { connected: true });
});

test('a bulletin whose documents cannot be read is read again, then fires once', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('advisory') });
  w.api.documentsDown = 503;
  await cycle(w);
  await cycle(w);
  assert.deepEqual(w.fake.sceneEvents, []);
  w.api.documentsDown = false;
  await cycle(w);
  assert.deepEqual(
    w.fake.sceneEvents.map((e) => e.data.kind),
    ['advisory'],
  );
  assert.equal(value(w, 'level'), 1);
});

test('the lists are asked with If-Modified-Since, and a 304 keeps what was read', async (t) => {
  const w = await world(t, { config: { ...PEDASI }, clock: { time: at('2026-10-09T18:35:00Z') } });
  await createAll(w);
  w.api.requests.length = 0;
  await cycle(w);
  const lists = w.api.requests.filter((r) => /previous\.js|Atom\.xml/.test(r.url.pathname));
  assert.equal(lists.length, 3);
  for (const request of lists) {
    assert.equal(request.headers['If-Modified-Since'], 'Wed, 11 Nov 2026 01:51:56 GMT');
  }
  // Only the three lists: nothing else is asked while nothing is new.
  assert.equal(w.api.requests.length, 3);
  assert.equal(value(w, 'level'), 2);
});

test('the container refreshes on its own timer, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const w = await world(t, { timers: true, config: CRESCENT_CITY });
  await createAll(w);
  const poll = t.mock.method(w.monitor, 'poll');
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('warning') });
  w.clock.advance(60000);
  t.mock.timers.tick(60000);
  await w.monitor.running;
  assert.equal(value(w, 'level'), 3);
  assert.equal(poll.mock.callCount(), 0);
});

test('the quake time is the origin time of the CAP document', async (t) => {
  const w = await world(t, { config: PEDASI, clock: { time: at('2026-10-09T18:35:00Z') } });
  assert.equal(w.monitor.current().originAt, PANAMA_QUAKE);
});

test('without region, no state: "no message" would be a false all-clear', async (t) => {
  const w = await world(t, { houses: [{ id: 'h', latitude: 48.85, longitude: 2.35 }] });
  await createAll(w);
  assert.deepEqual(w.fake.states, []);
});

test('a bulletin older than 12 hours never fires, even if it was never seen', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  w.api.addBulletin({ issuedAt: w.clock.now() - 13 * 3600000, ...usBulletin('warning') });
  await cycle(w);
  assert.deepEqual(w.fake.sceneEvents, []);
  assert.equal(value(w, 'level'), 0);
});

test('an information statement for another earthquake does not end a warning', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('warning') });
  await cycle(w);
  w.api.addBulletin({
    eventId: 'tsyn09',
    wmo: 'WEAK53',
    issuedAt: w.clock.now() + 1000,
    cap: usBulletin('warning')
      .cap.replace('<event>Tsunami Warning</event>', '<event>Tsunami Information</event>')
      .replace(
        /<headline>[^<]*<\/headline>/,
        '<headline>This is a Tsunami Information Statement.</headline>',
      ),
  });
  await cycle(w);
  assert.equal(w.fake.sceneEvents.at(-1).data.kind, 'information');
  assert.equal(value(w, 'level'), 3);
});

test('the CAP document unreachable: read again before taking the text alone', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  const { cap, text } = usBulletin('warning');
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, text });
  await cycle(w);
  assert.deepEqual(w.fake.sceneEvents, []);
  w.api.documents['tsyn01/1/WEAK51/PAAQCAP.xml'] = cap;
  await cycle(w);
  assert.equal(value(w, 'level'), 3);
});

test('tsunami.gov down for hours: the warning is not taken as over', async (t) => {
  const w = await world(t, { config: CRESCENT_CITY });
  await createAll(w);
  w.api.addBulletin({ issuedAt: w.clock.now() + 1000, ...usBulletin('warning') });
  await cycle(w);
  w.api.down = 503;
  await cycle(w, { minutes: 13 * 60 });
  assert.equal(value(w, 'level'), 3);
});

// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake tsunami.gov serving the
// documents recorded on 12/11/2026 (test/fixtures/tsunami), replayed in time
// (a bulletin of previous.js appears once the clock reaches its issue time),
// a manual clock, a temporary /data, and the integration wired on top through
// registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Pacific/Honolulu';

const FIXTURES = new URL('../fixtures/tsunami/', import.meta.url);
export const fixture = (name) => readFileSync(new URL(name, FIXTURES), 'utf8');

// The lists were recorded on 12/11/2026 around 13:00 UTC.
export const RECORDED = Date.parse('2026-11-12T13:00:00Z');
// The M7.6 Panama earthquake of 9/10/2026, 17:56 UTC: PTWC threat messages
// 2 (18:32), 3 (18:51) and 4, final (19:40), and the Hawaii statement (18:37).
export const PANAMA_QUAKE = Date.parse('2026-10-09T17:56:08Z');
export const BEFORE_PANAMA = Date.parse('2026-10-09T18:20:00Z');

// Public places (town centres), used as homes.
export const HILO = {
  id: 'house-1',
  name: 'Home',
  selector: 'home',
  latitude: 19.7241,
  longitude: -155.0868,
};
// Pedasí, Panama: Punta Mala, a forecast point of the threat messages, is 15 km away.
export const PEDASI = { latitude: '7.53', longitude: '-80.03' };
// Crescent City, California.
export const CRESCENT_CITY = { latitude: '41.7558', longitude: '-124.2026' };

const LAST_MODIFIED = 'Wed, 11 Nov 2026 01:51:56 GMT';
const EMPTY_FEED = (center) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><id>urn:uuid:${center}</id><title>${center}</title></feed>`;

// The CAP documents and text bulletins recorded, by path.
const DOCUMENTS = Object.fromEntries(
  readdirSync(FIXTURES)
    .filter((name) => /^P(AAQ|HEB)-/.test(name))
    .map((name) => {
      const [center, eventId, number, wmo] = name.split('.')[0].split('-');
      const file = name.endsWith('.cap.xml') ? `${center}CAP.xml` : `${wmo}.txt`;
      return [`${eventId}/${number}/${wmo}/${file}`, fixture(name)];
    }),
);

/**
 * A US warning bulletin, derived from the real NTWC information statement of
 * 11/11/2026 (WEAK53): only the words that make it a warning (or its
 * cancellation) are changed. No real NTWC warning was in the lists recorded.
 */
export function usBulletin(kind) {
  const cap = fixture('PAAQ-tobe7v-1-WEAK53.cap.xml');
  const text = fixture('PAAQ-tobe7v-1-WEAK53.txt');
  const event = {
    warning: 'Tsunami Warning',
    advisory: 'Tsunami Advisory',
    watch: 'Tsunami Watch',
    cancellation: 'Tsunami Warning',
  }[kind];
  return {
    cap: cap
      .replace('<event>Tsunami Information</event>', `<event>${event}</event>`)
      .replace(
        '<msgType>Alert</msgType>',
        `<msgType>${kind === 'cancellation' ? 'Cancel' : 'Alert'}</msgType>`,
      )
      .replace(/<headline>[^<]*<\/headline>/, `<headline>This is a ${event}.</headline>`)
      .replace(/<expires>[^<]*<\/expires>/, ''),
    text: text.replace(
      '...THIS IS A TSUNAMI INFORMATION STATEMENT...',
      kind === 'cancellation'
        ? '...THE TSUNAMI WARNING IS CANCELED...'
        : `...THE ${event.toUpperCase()} IS IN EFFECT...`,
    ),
  };
}

/** One row of previous.js, shaped like the real ones. */
function row(b) {
  const iso = (ms) => new Date(ms).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
  return `{
'id' : '${b.eventId}',
'issueTime' : '${iso(b.issuedAt)}.0',
'URL' : '/events/${b.center}/${b.date}/${b.eventId}/${b.number}',
'lat' : ${b.latitude},
'lon' : ${b.longitude},
'quakeLocation' : '${b.location}',
'magnitude' : ${b.magnitude},
'originTime' : '${iso(b.originAt)}.0',
'TWCID' : '${b.center}',
'WMOID' : '${b.wmo}',
'bulletinNumber' : ${b.number} }`;
}

/**
 * Fake tsunami.gov. `api.down`: 'network', a status (503) or false, for every
 * request; `api.documentsDown` the same for the CAP and text documents only.
 */
export function createApi(clock) {
  const recorded = fixture('previous-2026-11-12.js');
  const rows = [...recorded.matchAll(/\{[^{}]*\}/g)].map((m) => {
    const issued = /'issueTime' : '([^']+)'/.exec(m[0])[1];
    return { text: m[0], issuedAt: Date.parse(`${issued.replace(' ', 'T').slice(0, 19)}Z`) };
  });
  const api = {
    rows,
    extra: [],
    documents: { ...DOCUMENTS },
    down: false,
    documentsDown: false,
    requests: [],
    served: {},

    /** A bulletin issued at `issuedAt`, with its CAP document and text. */
    addBulletin({
      center = 'PAAQ',
      eventId = 'tsyn01',
      number = 1,
      wmo = 'WEAK51',
      issuedAt,
      cap,
      text,
      location = '65 miles SW of Port Alice, British Columbia',
      magnitude = 7.9,
      latitude = 49.293,
      longitude = -127.676,
    }) {
      const date = new Date(issuedAt).toISOString().slice(0, 10).replaceAll('-', '/');
      api.extra.push({
        text: row({
          center,
          date,
          eventId,
          number,
          wmo,
          issuedAt,
          originAt: issuedAt - 6 * 60000,
          location,
          magnitude,
          latitude,
          longitude,
        }),
        issuedAt,
      });
      if (cap) {
        api.documents[`${eventId}/${number}/${wmo}/${center}CAP.xml`] = cap;
      }
      if (text) {
        api.documents[`${eventId}/${number}/${wmo}/${wmo}.txt`] = text;
      }
    },

    previous() {
      const visible = [...api.rows, ...api.extra]
        .filter((r) => r.issuedAt <= clock.now())
        .sort((a, b) => b.issuedAt - a.issuedAt);
      return `var prevEvents = {\n 'event' : [\n${visible.map((r) => r.text).join(',\n')} \n]\n};\n`;
    },

    feed(center) {
      const xml = fixture(`${center}Atom-2026-11-12.xml`);
      const updated = Date.parse(/<updated>([^<]+)<\/updated>/.exec(xml)[1]);
      return updated <= clock.now() ? xml : EMPTY_FEED(center);
    },

    async fetch(input, init = {}) {
      const url = new URL(input);
      api.requests.push({ url, headers: init.headers ?? {} });
      const isDocument = url.pathname.startsWith('/events/P');
      const down = api.down || (isDocument && api.documentsDown);
      if (down === 'network') {
        throw new TypeError('fetch failed');
      }
      if (down) {
        return { status: down, headers: new Headers(), text: async () => 'Service Unavailable' };
      }
      // 304 when the client knows this very answer, as tsunami.gov does.
      const ok = (body) => {
        const known = init.headers?.['If-Modified-Since'] && api.served[url.pathname] === body;
        api.served[url.pathname] = body;
        if (known) {
          return { status: 304, headers: new Headers(), text: async () => '' };
        }
        return answer(body);
      };
      const answer = (body) => ({
        status: 200,
        headers: new Headers({ 'last-modified': LAST_MODIFIED }),
        text: async () => body,
      });
      if (url.pathname === '/events/js/previous.js') {
        return ok(api.previous());
      }
      const feed = /^\/events\/xml\/(PAAQ|PHEB)Atom\.xml$/.exec(url.pathname);
      if (feed) {
        return ok(api.feed(feed[1]));
      }
      const doc = /^\/events\/P(?:AAQ|HEB)\/\d{4}\/\d{2}\/\d{2}\/(.+)$/.exec(url.pathname);
      if (doc && api.documents[doc[1]]) {
        return ok(api.documents[doc[1]]);
      }
      return { status: 404, headers: new Headers(), text: async () => 'Not Found' };
    },
  };
  return api;
}

/** A manual clock. */
export function createClock(start = RECORDED) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
    set(ms) {
      clock.time = ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {Array} [options.houses] houses of Gladys
 * @param {boolean} [options.connect]
 * @param {boolean} [options.timers] true: the monitor's own timer runs (mock it)
 */
export async function createWorld({
  config = {},
  devices = [],
  houses = [HILO],
  clock: givenClock,
  api,
  connect = true,
  timers = false,
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-tsunami-')),
} = {}) {
  // `{ time }` is enough to start a clock elsewhere than at RECORDED.
  const clock = givenClock?.now ? givenClock : createClock(givenClock?.time);
  api ??= createApi(clock);
  const gladys = createFakeGladys({ config, devices, houses });
  const store = new Store(dataDir);
  const app = registerHandlers(gladys, { store, fetch: api.fetch, timers, now: clock.now });
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.monitor.running;
  }
  return { gladys, fake: gladys.fake, app, monitor: app.monitor, api, clock, store, dataDir };
}

/** Create every discovered device in Gladys, as the user would. */
export async function createAll(world) {
  for (const device of world.fake.discoveredDevices) {
    await world.fake.deviceCreated(device);
  }
  return world.fake.discoveredDevices;
}

/** Run one refresh cycle at `time` (ms), or `minutes` later. */
export async function cycle(world, { at, minutes = 1 } = {}) {
  if (at !== undefined) {
    world.clock.set(at);
  } else {
    world.clock.advance(minutes * 60 * 1000);
  }
  await world.monitor.runCycle();
}

/** The last published value of a feature (`state` or `text`), by its key. */
export function lastValue(world, deviceExternalId, key) {
  const id = `${deviceExternalId}:${key}`;
  const states = world.fake.states.filter((s) => s.device_feature_external_id === id);
  const last = states.at(-1);
  return last === undefined ? undefined : (last.text ?? last.state);
}

/**
 * Capture the integration's log lines at `level` and above (LOG_LEVEL is read
 * at every call). Returns the lines as `{ level, text }`.
 */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const line = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(line);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text: line });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}

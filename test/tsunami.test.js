// -----------------------------------------------------------------------------
// The tsunami.gov client on the documents recorded on 12/11/2026: previous.js,
// the two Atom feeds, the CAP documents and the text bulletins of real events,
// the classification of every recorded bulletin, and the regions.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, regionAt } from '../src/config.js';
import {
  classify,
  keyOf,
  parseAtom,
  parseBulletinText,
  parseCap,
  parsePath,
  parsePrevious,
} from '../src/tsunami.js';
import { fixture, usBulletin } from './helpers/world.js';

test('previous.js: the 40 latest bulletins, one per WMO product', () => {
  const bulletins = parsePrevious(fixture('previous-2026-11-12.js'));
  assert.equal(bulletins.length, 40);
  assert.deepEqual(bulletins[0], {
    center: 'PAAQ',
    eventId: 'tobe7v',
    number: 1,
    base: '/events/PAAQ/2026/11/11/tobe7v/1',
    wmo: 'WEAK53',
    issuedAt: Date.parse('2026-11-11T01:51:32Z'),
    originAt: Date.parse('2026-11-11T01:45:31Z'),
    magnitude: 4.7,
    location: '65 miles SW of Port Alice, British Columbia',
    latitude: 49.293,
    longitude: -127.676,
    category: null,
  });
  // The same PTWC bulletin, number 2 of the Panama earthquake, for four audiences.
  const panama = bulletins.filter((b) => b.eventId === '26282000' && b.number === 2);
  assert.deepEqual(panama.map((b) => b.wmo).sort(), ['WEGM42', 'WEHW42', 'WEPA40', 'WEZS42']);
  assert.equal(new Set(bulletins.map(keyOf)).size, 40);
});

test('the Atom feeds: one entry each, with the "Category:" line', () => {
  const [ntwc] = parseAtom(fixture('PAAQAtom-2026-11-12.xml'));
  assert.equal(ntwc.wmo, 'WEAK53');
  assert.equal(ntwc.category, 'Information');
  assert.equal(ntwc.magnitude, 4.7);
  assert.equal(keyOf(ntwc), 'PAAQ/tobe7v/1/WEAK53');
  const [ptwc] = parseAtom(fixture('PHEBAtom-2026-11-12.xml'));
  assert.equal(ptwc.wmo, 'WECA42');
  assert.equal(ptwc.location, 'ABOUT 72 MILES NORTHWEST OF PUERTO RICO');
  assert.equal(ptwc.issuedAt, Date.parse('2026-11-08T06:34:57Z'));
  assert.deepEqual(parseAtom('<feed></feed>'), []);
});

test('CAP documents: message type, events, expiry and earthquake', () => {
  const statement = parseCap(fixture('PAAQ-tobe7v-1-WEAK53.cap.xml'));
  assert.equal(statement.msgType, 'Alert');
  assert.deepEqual(statement.events, ['Tsunami Information']);
  assert.equal(statement.expiresAt, Date.parse('2026-11-11T02:51:32Z'));
  assert.equal(statement.magnitude, 4.7);
  assert.equal(statement.originAt, Date.parse('2026-11-11T01:45:31Z'));
  const threat = parseCap(fixture('PHEB-26282000-2-WEPA40.cap.xml'));
  assert.deepEqual(threat.events, ['Tsunami 1-3 meters', 'Tsunami 0.3-1 meters']);
  assert.equal(threat.expiresAt, null);
  assert.equal(threat.location, 'PANAMA');
  assert.equal(parseCap('<html>Not found</html>'), null);
});

test('text bulletins: the headline and the table of arrival times', () => {
  const issued = Date.parse('2026-10-09T18:02:09Z');
  const first = parseBulletinText(fixture('PHEB-26282000-1-WEPA40.txt'), issued);
  assert.equal(first.headline, 'PTWC TSUNAMI THREAT MESSAGE');
  assert.equal(first.arrivals.length, 25);
  assert.deepEqual(first.arrivals[0], {
    place: 'PUNTA MALA',
    country: 'PANAMA',
    latitude: 7.5,
    longitude: -80,
    at: Date.parse('2026-10-09T18:20:00Z'),
  });
  assert.equal(first.arrivals.at(-1).place, 'PUERTO MADERO');
  const final = parseBulletinText(fixture('PHEB-26282000-4-WEPA40.txt'), issued);
  assert.equal(final.headline, 'PTWC FINAL TSUNAMI THREAT MESSAGE');
  assert.deepEqual(final.arrivals, []);
  // A table of 31 December may list 1 January of the next year.
  const late = parseBulletinText(
    '    APIA             SAMOA             13.8S 171.8W   0012 01/01\n',
    Date.parse('2026-12-31T23:30:00Z'),
  );
  assert.equal(late.arrivals[0].at, Date.parse('2027-01-01T00:12:00Z'));
});

test('every recorded bulletin is classified as NOAA titled it', () => {
  const kind = (name) =>
    classify({
      cap: parseCap(fixture(`${name}.cap.xml`)),
      headline: (() => {
        try {
          return parseBulletinText(fixture(`${name}.txt`), 0).headline;
        } catch {
          return null;
        }
      })(),
    });
  assert.equal(kind('PAAQ-tobe7v-1-WEAK53'), 'information');
  assert.equal(kind('PAAQ-tmuiel-1-WEXX32'), 'information');
  assert.equal(kind('PHEB-26286001-1-WECA43'), 'information');
  assert.equal(kind('PHEB-26282000-2-WEHW42'), 'information');
  assert.equal(kind('PHEB-26282000-1-WEPA40'), 'threat');
  assert.equal(kind('PHEB-26282000-2-WEPA40'), 'threat');
  assert.equal(kind('PHEB-26282000-3-WEPA40'), 'threat');
  assert.equal(kind('PHEB-26282000-4-WEPA40'), 'cancellation');
  // The feed's "Category:" line alone is enough.
  assert.equal(classify({ category: 'Information' }), 'information');
  assert.equal(classify({ category: 'Warning' }), 'warning');
  // The name of the centers says nothing; "no threat" is no threat.
  assert.equal(classify({ headline: 'NATIONAL TSUNAMI WARNING CENTER' }), 'information');
  assert.equal(
    classify({ headline: 'NO TSUNAMI THREAT FROM A DISTANT EARTHQUAKE' }),
    'information',
  );
});

test('the derived US bulletins classify as their kind', () => {
  for (const kind of ['warning', 'advisory', 'watch', 'cancellation']) {
    const { cap, text } = usBulletin(kind);
    assert.equal(
      classify({ cap: parseCap(cap), headline: parseBulletinText(text, 0).headline }),
      kind,
    );
  }
});

test('the WMO headings of the recorded bulletins belong to one region each', () => {
  const heading = (wmo) => REGIONS.filter((region) => region.matches(wmo)).map((r) => r.key);
  assert.deepEqual(heading('WEAK53'), ['alaska_west_coast']);
  assert.deepEqual(heading('WEAK51'), ['alaska_west_coast']);
  assert.deepEqual(heading('WEXX32'), ['east_gulf_coast']);
  assert.deepEqual(heading('WEHW42'), ['hawaii']);
  assert.deepEqual(heading('WEGM42'), ['guam_cnmi']);
  assert.deepEqual(heading('WEZS42'), ['american_samoa']);
  assert.deepEqual(heading('WECA42'), ['puerto_rico_vi']);
  assert.deepEqual(heading('WECA43'), ['caribbean']);
  assert.deepEqual(heading('WEPA40'), ['pacific']);
});

test('the region of a home', () => {
  assert.equal(regionAt(19.72, -155.09), 'hawaii'); // Hilo
  assert.equal(regionAt(61.22, -149.9), 'alaska_west_coast'); // Anchorage
  assert.equal(regionAt(52.88, 173.18), 'alaska_west_coast'); // Attu
  assert.equal(regionAt(37.77, -122.42), 'alaska_west_coast'); // San Francisco
  assert.equal(regionAt(25.76, -80.19), 'east_gulf_coast'); // Miami
  assert.equal(regionAt(29.95, -90.07), 'east_gulf_coast'); // New Orleans
  assert.equal(regionAt(44.65, -63.57), 'east_gulf_coast'); // Halifax
  assert.equal(regionAt(18.47, -66.11), 'puerto_rico_vi'); // San Juan
  assert.equal(regionAt(13.44, 144.79), 'guam_cnmi'); // Hagåtña
  assert.equal(regionAt(-14.28, -170.7), 'american_samoa'); // Pago Pago
  assert.equal(regionAt(14.6, -61.06), 'caribbean'); // Fort-de-France
  assert.equal(regionAt(16.24, -61.53), 'caribbean'); // Pointe-à-Pitre
  assert.equal(regionAt(-17.53, -149.57), 'pacific'); // Papeete
  assert.equal(regionAt(-22.27, 166.44), 'pacific'); // Nouméa
  assert.equal(regionAt(35.68, 139.69), 'pacific'); // Tokyo
  assert.equal(regionAt(48.85, 2.35), null); // Paris
});

test('a bulletin path, with or without its product', () => {
  assert.deepEqual(parsePath('/events/PHEB/2026/10/09/26282000/2'), {
    center: 'PHEB',
    eventId: '26282000',
    number: 2,
    base: '/events/PHEB/2026/10/09/26282000/2',
    wmo: null,
  });
  assert.equal(
    parsePath('https://www.tsunami.gov/events/PAAQ/2026/11/11/tobe7v/1/WEAK53/WEAK53.txt').wmo,
    'WEAK53',
  );
  assert.equal(parsePath('/events/xml/PAAQAtom.xml'), null);
});

test('a partial cancellation keeps the warning the CAP events still name', () => {
  const { cap } = usBulletin('warning');
  const partial = parseCap(cap.replace('<msgType>Alert</msgType>', '<msgType>Update</msgType>'));
  assert.equal(
    classify({ cap: partial, headline: 'THE TSUNAMI WARNING IS CANCELED FOR WASHINGTON' }),
    'warning',
  );
  assert.equal(classify({ headline: 'THE TSUNAMI WARNING IS CANCELED' }), 'cancellation');
});

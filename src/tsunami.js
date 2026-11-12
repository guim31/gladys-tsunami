// -----------------------------------------------------------------------------
// Client of tsunami.gov, the public site of the two NOAA tsunami warning
// centers (NTWC, Palmer, `PAAQ`; PTWC, Honolulu, `PHEB`), without key:
//
//   - /events/xml/PAAQAtom.xml and PHEBAtom.xml: the Atom feeds, holding the
//     latest bulletin of each center (title, coordinates, "Category:" line,
//     links to the CAP document and to the text bulletin);
//   - /events/js/previous.js: the list the site draws its map from, the 40
//     latest bulletins of both centers, one row per WMO product. When a center
//     issues the bulletins of one earthquake for Hawaii, Guam, Samoa and the
//     Pacific at the same second, the Atom feed keeps only one of them: this
//     list keeps them all;
//   - per bulletin, `<base>/<WMO>/<center>CAP.xml` (CAP 1.2: event, message
//     type, expiry, earthquake parameters) and `<base>/<WMO>/<WMO>.txt` (the
//     text bulletin: headline, table of estimated arrival times).
//
// The three lists are read with If-Modified-Since (and If-None-Match if an
// ETag ever appears): the site answers 304 Not Modified while nothing new is
// issued. The XML and the script are read with a few regular expressions on
// their fixed shape: no dependency for a handful of tags.
// -----------------------------------------------------------------------------

export const SITE = 'https://www.tsunami.gov';
export const LIST_URLS = [
  `${SITE}/events/js/previous.js`,
  `${SITE}/events/xml/PAAQAtom.xml`,
  `${SITE}/events/xml/PHEBAtom.xml`,
];

// NOAA asks API clients to say who they are.
const HEADERS = { 'User-Agent': 'gladys-tsunami (https://github.com/guim31/gladys-tsunami)' };
const TIMEOUT_MS = 20000;

// What a bulletin means for its region. `level` is the risk/integer value of
// the device: 0 no threat, 1 advisory, 2 watch (or international threat
// message), 3 warning.
export const KINDS = ['information', 'advisory', 'watch', 'warning', 'threat', 'cancellation'];
export const LEVEL_OF = {
  information: 0,
  cancellation: 0,
  advisory: 1,
  watch: 2,
  threat: 2,
  warning: 3,
};

export class TsunamiError extends Error {}

/**
 * GET with the validators of the previous answer. Resolves `{ status: 304 }`
 * or `{ status: 200, text }`; throws a TsunamiError otherwise.
 * @param {Function} fetchImpl
 * @param {string} url
 * @param {Map<string, object>} [validators] url → { etag, lastModified }, updated in place
 */
export async function get(fetchImpl, url, validators) {
  const headers = { ...HEADERS };
  const known = validators?.get(url);
  if (known?.etag) {
    headers['If-None-Match'] = known.etag;
  }
  if (known?.lastModified) {
    headers['If-Modified-Since'] = known.lastModified;
  }
  let response;
  try {
    response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new TsunamiError(`${new URL(url).pathname}: ${err.message}`);
  }
  if (response.status === 304 && known) {
    return { status: 304 };
  }
  if (response.status !== 200) {
    throw new TsunamiError(`${new URL(url).pathname}: HTTP ${response.status}`);
  }
  const text = await response.text();
  if (validators) {
    const header = (name) => response.headers?.get?.(name) ?? null;
    validators.set(url, { etag: header('etag'), lastModified: header('last-modified') });
  }
  return { status: 200, text };
}

const number = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};
const time = (value) => {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) ? t : null;
};
// "2026-11-11 01:51:32.0" and "2026.11.11 01:51:32 UTC" are UTC.
const utc = (value) => {
  const m = /(\d{4})[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value ?? '');
  return m ? Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) : null;
};
const decode = (text) =>
  String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const tag = (xml, name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]) : null;
};
const tags = (xml, name) =>
  [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g'))].map((m) =>
    decode(m[1]),
  );

// "/events/PHEB/2026/10/09/26282000/2" (+ "/WEPA40/WEPA40.txt" in the feeds).
const PATH =
  /\/events\/(PAAQ|PHEB)\/(\d{4})\/(\d{2})\/(\d{2})\/([\w-]+)\/(\d+)(?:\/(\w{4}\d{2})\b)?/;

/** The parts of a bulletin path, or null. */
export function parsePath(value) {
  const m = PATH.exec(value ?? '');
  if (!m) {
    return null;
  }
  const [, center, year, month, day, eventId, bulletin, wmo] = m;
  return {
    center,
    eventId,
    number: Number(bulletin),
    base: `/events/${center}/${year}/${month}/${day}/${eventId}/${bulletin}`,
    wmo: wmo ?? null,
  };
}

/** The stable key of a bulletin: one per center, event, number and WMO product. */
export const keyOf = (bulletin) =>
  `${bulletin.center}/${bulletin.eventId}/${bulletin.number}/${bulletin.wmo}`;
export const capUrl = (bulletin) =>
  `${SITE}${bulletin.base}/${bulletin.wmo}/${bulletin.center}CAP.xml`;
export const textUrl = (bulletin) => `${SITE}${bulletin.base}/${bulletin.wmo}/${bulletin.wmo}.txt`;

/** The bulletins of previous.js, newest first as listed. */
export function parsePrevious(script) {
  const bulletins = [];
  for (const block of String(script ?? '').split(/\}\s*,?\s*\{|\[\s*\{/)) {
    const field = (name) => {
      const m = new RegExp(`'${name}'\\s*:\\s*(?:'([^'\\n]*)'|([^,\\s]+))`).exec(block);
      return m ? (m[1] ?? m[2]).trim() : null;
    };
    const path = parsePath(field('URL'));
    const wmo = field('WMOID');
    if (!path || !/^\w{4}\d{2}$/.test(wmo ?? '')) {
      continue;
    }
    bulletins.push({
      ...path,
      wmo,
      issuedAt: utc(field('issueTime')),
      originAt: utc(field('originTime')),
      magnitude: number(field('magnitude')),
      location: field('quakeLocation') || null,
      latitude: number(field('lat')),
      longitude: number(field('lon')),
      category: null,
    });
  }
  return bulletins.filter((b) => b.issuedAt !== null);
}

/** The bulletins of an Atom feed of tsunami.gov. */
export function parseAtom(xml) {
  const bulletins = [];
  for (const [, entry] of String(xml ?? '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const link = /<link[^>]*title="Bulletin"[^>]*href="([^"]+)"/.exec(entry);
    const path = parsePath(link?.[1]);
    if (!path?.wmo) {
      continue;
    }
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(entry)?.[1] ?? '';
    const line = (label) => {
      const m = new RegExp(`${label}:?\\s*</strong>([^<]*)`).exec(summary);
      return m ? decode(m[1]) : null;
    };
    bulletins.push({
      ...path,
      issuedAt: utc(line('Bulletin Issue Time')) ?? time(tag(entry, 'updated')),
      originAt: null,
      magnitude: number(line('Preliminary Magnitude')),
      location: tag(entry, 'title'),
      latitude: number(tag(entry, 'geo:lat')),
      longitude: number(tag(entry, 'geo:long')),
      category: line('Category'),
    });
  }
  return bulletins.filter((b) => b.issuedAt !== null);
}

/** A CAP 1.2 document of tsunami.gov, or null if it is not one. */
export function parseCap(xml) {
  const text = String(xml ?? '');
  if (!/<alert[\s>]/.test(text)) {
    return null;
  }
  const parameter = (name) => {
    const m = new RegExp(`<valueName>${name}</valueName>\\s*<value>([\\s\\S]*?)</value>`).exec(
      text,
    );
    return m ? decode(m[1]) : null;
  };
  return {
    msgType: tag(text, 'msgType'),
    events: tags(text, 'event'),
    headlines: tags(text, 'headline').filter(Boolean),
    expiresAt: time(tag(text, 'expires')),
    magnitude: number(parameter('EventPreliminaryMagnitude')),
    originAt: time(parameter('EventOriginTime')),
    location: parameter('EventLocationName'),
  };
}

/**
 * The headline of a text bulletin ("...PTWC TSUNAMI THREAT MESSAGE...") and
 * its table of estimated arrival times, when it has one with coordinates
 * (the international threat messages):
 *   PUNTA MALA       PANAMA             7.5N  80.0W   1820 10/09
 * `issuedAt` gives the year of the dates of the table.
 */
export function parseBulletinText(text, issuedAt) {
  const source = String(text ?? '');
  const headline = /^\s*\.\.\.(.+?)\.\.\.\s*$/m.exec(source)?.[1].trim() ?? null;
  const issued = new Date(issuedAt ?? 0);
  const arrivals = [];
  const row =
    /^ {2,}(\S.*?) {2,}(\S.*?) +(\d{1,2}\.\d)([NS]) +(\d{1,3}\.\d)([EW]) +(\d{2})(\d{2}) +(\d{2})\/(\d{2}) *$/gm;
  for (const m of source.matchAll(row)) {
    const [, place, country, lat, ns, lon, ew, hh, mm, month, day] = m;
    let year = issued.getUTCFullYear();
    // A table issued on 31 December may list 1 January.
    if (Number(month) < issued.getUTCMonth() + 1 - 6) {
      year += 1;
    }
    arrivals.push({
      place: place.trim(),
      country: country.trim(),
      latitude: Number(lat) * (ns === 'S' ? -1 : 1),
      longitude: Number(lon) * (ew === 'W' ? -1 : 1),
      at: Date.UTC(year, Number(month) - 1, Number(day), Number(hh), Number(mm)),
    });
  }
  return { headline, arrivals };
}

/**
 * What a bulletin is, from every word the center gives about it: the
 * "Category:" line of the feed, the message type and events of the CAP
 * document, and the headline of the text bulletin. The name of the centers
 * ("Tsunami Warning Center") says nothing and is removed first.
 */
export function classify({ category, cap, headline }) {
  if (cap?.msgType === 'Cancel') {
    return 'cancellation';
  }
  const clean = (texts) =>
    texts
      .filter(Boolean)
      .join(' | ')
      .toUpperCase()
      .replace(/TSUNAMI WARNING CENTER/g, '');
  // The events of an active CAP document name the alert for every area it
  // covers: a warning kept for some coasts wins over "canceled" for others.
  const events = clean(cap?.events ?? []);
  const level = alertIn(events);
  if (level) {
    return level;
  }
  const words = clean([category, ...(cap?.headlines ?? []), headline]);
  if (/CANCEL/.test(words) || /FINAL\b[^|]*THREAT MESSAGE/.test(words)) {
    return 'cancellation';
  }
  return alertIn(words) ?? 'information';
}

function alertIn(words) {
  if (/WARNING/.test(words)) {
    return 'warning';
  }
  if (/WATCH/.test(words)) {
    return 'watch';
  }
  if (/ADVISORY/.test(words)) {
    return 'advisory';
  }
  if (/THREAT|\bMETERS\b/.test(words) && !/NO TSUNAMI THREAT/.test(words)) {
    return 'threat';
  }
  return null;
}

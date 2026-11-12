// -----------------------------------------------------------------------------
// The monitor: reads tsunami.gov every `refresh_interval` minutes, keeps the
// message in effect for the followed region, publishes the states of the
// device, fires the scene trigger and serves the widget and the actions.
//
// Region: the one chosen in the configuration, or the one of the home (the
// coordinates of the configuration, else the first located house of Gladys).
// The location is used in the container only, never sent nor logged.
//
// A cycle reads the three lists of bulletins (see src/tsunami.js), keeps those
// whose WMO heading belongs to the region, and reads the CAP document and the
// text bulletin of each new one: they say what it is (information statement,
// advisory, watch, warning, threat message, cancellation), the earthquake, the
// expiry and the estimated arrival times. The newest bulletin of the region is
// the message in effect:
//   - an advisory, a watch, a warning or a threat message stays in effect
//     until the next bulletin of the region (update, cancellation), or 12 hours
//     without any: the centers update an alert at least every hour;
//   - an information statement or a cancellation is shown until its CAP
//     expiry (one hour), then "no message in effect".
//
// Scene trigger `tsunami_message`: every new bulletin of the region. The
// bulletins listed at the first start, or when the region changes, fire
// nothing: they are not news. What was seen is kept under /data, so a restart
// fires nothing either.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { regionAt, regionOf } from './config.js';
import { buildDevice, idsOf } from './device.js';
import { distanceKm } from './geo.js';
import {
  KIND_NAMES,
  PHRASES,
  REGION_NAMES,
  STATUS,
  arrivalText,
  join,
  phrase,
  quakeText,
  render,
  sentence,
} from './messages.js';
import {
  LEVEL_OF,
  LIST_URLS,
  SITE,
  capUrl,
  classify,
  get,
  keyOf,
  parseAtom,
  parseBulletinText,
  parseCap,
  parsePrevious,
  textUrl,
} from './tsunami.js';

const logger = createLogger({ name: 'tsunami' });

export const WIDGET_KEY = 'tsunami';
export const TRIGGER = 'tsunami_message';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEFAULT_TIMINGS = {
  heartbeatMs: 12 * HOUR,
  // An alert without any newer bulletin of its region for this long is over.
  alertMaxAgeMs: 12 * HOUR,
  // An information statement or a cancellation without CAP expiry.
  statementMs: HOUR,
  // A bulletin older than this at the first start is not "in effect".
  seedMaxAgeMs: 12 * HOUR,
  // Bulletins seen are remembered this long (the lists hold a few weeks).
  forgetAfterMs: 60 * DAY,
  // requestWidgetRefresh is rate-limited to one call every 10 s by the core.
  widgetRefreshMs: 10000,
  // The houses of Gladys are read again this often (no update event).
  housesMaxAgeMs: HOUR,
};

// Forecast points farther than this from the home are not "your" arrival time.
export const ARRIVAL_MAX_KM = 300;
// Bulletins read (CAP + text) in one cycle at most: the region's are rare.
const MAX_READS_PER_CYCLE = 6;
// Cycles a bulletin is read again before being taken as it is, or given up.
const MAX_ATTEMPTS = 3;

const parsers = { 'previous.js': parsePrevious, 'PAAQAtom.xml': parseAtom };
const parserOf = (url) => parsers[url.split('/').pop()] ?? parseAtom;

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK fake)
   * @param {object} options.store see src/store.js
   * @param {Function} [options.fetch] fetch
   * @param {boolean} [options.timers] false: no background timer (tests drive the cycles)
   * @param {Function} [options.now] clock in ms
   * @param {object} [options.timings] overrides of DEFAULT_TIMINGS
   */
  constructor({ gladys, store, fetch: fetchImpl, timers = true, now, timings }) {
    this.gladys = gladys;
    this.store = store;
    this.fetch = fetchImpl ?? ((...args) => fetch(...args));
    this.timers = timers;
    this.now = now ?? (() => Date.now());
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.config = null;
    this.data = emptyData();
    // Per list URL: its validators, and the bulletins of its last 200 answer.
    this.validators = new Map();
    this.lists = new Map();
    // Per bulletin key: reads that failed so far.
    this.attempts = new Map();
    this.region = null;
    this.lastSuccessAt = null;
    this.lastCycleAt = -Infinity;
    this.house = undefined;
    this.houseReadAt = -Infinity;
    this.statusMessage = undefined;
    this.cycleTimer = null;
    this.running = null;
    this.lastRefreshAt = -Infinity;
    this.refreshTimer = null;
    this.signature = null;
    this.stopped = false;
    // Keys of the failures already logged, so a repeated one is not logged again.
    this.failing = new Set();
  }

  /** Log a failure once (warn or error), then at debug until `recovered(key)`. */
  failed(key, level, message, err) {
    const details = err ? [message, err] : [message];
    if (this.failing.has(key)) {
      logger.debug(...details);
      return;
    }
    this.failing.add(key);
    logger[level](...details);
  }

  /** One line when a failure logged by `failed(key)` is over. */
  recovered(key, message) {
    if (this.failing.delete(key)) {
      logger.info(message);
    }
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    if (saved?.version === 1) {
      this.data = { ...emptyData(), ...saved };
    }
    await this.publishDiscovered();
    this.warnAboutConfig();
    logger.info(`Started: tsunami.gov read every ${config.refreshMinutes} min`);
    this.schedule();
    this.runCycle();
  }

  /** Reconnection: Gladys may have restarted, publish everything again. */
  async resync(config) {
    this.config = config;
    this.houseReadAt = -Infinity;
    await this.publishDiscovered();
    this.statusMessage = undefined;
    await this.updateConnectionStatus();
    this.gladys.forgetPublishedStates?.();
    await this.publishStates();
    this.requestRefresh();
  }

  async reconfigure(config) {
    // A cycle already running finishes with the old configuration, whole.
    await this.running;
    this.config = config;
    this.houseReadAt = -Infinity;
    logger.info('Configuration saved');
    this.warnAboutConfig();
    // Names (language) may have changed: "Update" in the Discover tab.
    await this.publishDiscovered();
    this.gladys.forgetPublishedStates?.();
    this.schedule();
    await this.runCycle();
    this.requestRefresh();
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.cycleTimer);
    clearTimeout(this.refreshTimer);
    this.cycleTimer = null;
    await this.running?.catch(() => {});
    await this.store.flush();
  }

  schedule() {
    if (!this.timers || this.stopped) {
      return;
    }
    clearInterval(this.cycleTimer);
    this.cycleTimer = setInterval(() => this.runCycle(), this.config.refreshMinutes * MINUTE);
    this.cycleTimer.unref?.();
  }

  warnAboutConfig() {
    if (this.config.invalidCenter) {
      logger.warn('The coordinates of the configuration are not valid: the house is used');
    }
  }

  async publishDiscovered() {
    await this.gladys.publishDiscoveredDevices([buildDevice(this.gladys, this.config)]);
  }

  // --- Home and region ---------------------------------------------------------

  /** The home: the configured coordinates, else the first located house. */
  async center() {
    if (this.config.center) {
      return this.config.center;
    }
    if (this.now() - this.houseReadAt >= this.timings.housesMaxAgeMs) {
      try {
        const houses = await this.gladys.getHouses();
        this.house =
          houses.find(
            (house) => Number.isFinite(house.latitude) && Number.isFinite(house.longitude),
          ) ?? null;
        this.houseReadAt = this.now();
        this.recovered('houses', 'The houses of Gladys are readable again');
      } catch (err) {
        this.failed('houses', 'warn', `Cannot read the houses of Gladys: ${err.message}`);
      }
    }
    return this.house ? { latitude: this.house.latitude, longitude: this.house.longitude } : null;
  }

  /** `{ region, center, reason }`: the followed region, or why there is none. */
  async resolveRegion() {
    const center = await this.center();
    if (this.config.region !== 'auto') {
      return { region: regionOf(this.config.region), center };
    }
    if (!center) {
      return { region: null, center, reason: 'noRegion' };
    }
    const key = regionAt(center.latitude, center.longitude);
    return key ? { region: regionOf(key), center } : { region: null, center, reason: 'outside' };
  }

  // --- Cycles ------------------------------------------------------------------

  runCycle() {
    if (this.running || this.stopped) {
      return this.running;
    }
    this.running = this.cycle()
      .catch((err) => this.failed('cycle', 'error', 'Refresh cycle failed', err))
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  async cycle() {
    this.lastCycleAt = this.now();
    const { region, center, reason } = await this.resolveRegion();
    this.region = region;
    this.reason = reason ?? null;
    const bulletins = await this.readLists();
    if (bulletins === null) {
      await this.updateConnectionStatus();
      await this.publishStates();
      return;
    }
    if (region) {
      await this.follow(region, bulletins, center);
    }
    this.lastSuccessAt = this.now();
    this.recovered('cycle', 'Refresh cycles work again');
    await this.publishStates();
    await this.updateConnectionStatus();
    const message = this.current();
    const signature = JSON.stringify([region?.key ?? null, message?.key ?? null, message?.kind]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.requestRefresh();
    }
  }

  /** Every bulletin of the three lists, or null if none of them answers. */
  async readLists() {
    const results = await Promise.allSettled(
      LIST_URLS.map((url) => get(this.fetch, url, this.validators)),
    );
    let answered = 0;
    results.forEach((result, index) => {
      const url = LIST_URLS[index];
      if (result.status === 'fulfilled') {
        answered += 1;
        if (result.value.status === 200) {
          const parsed = parserOf(url)(result.value.text);
          // A list with entries but none understood: the format has changed.
          if (parsed.length === 0 && /<entry|'WMOID'/.test(result.value.text)) {
            this.failed(`parse-${url}`, 'warn', `${url} is no longer understood`);
          } else {
            this.recovered(`parse-${url}`, `${url} is understood again`);
          }
          this.lists.set(url, parsed);
        }
      } else {
        logger.debug(`${result.reason.message}`);
      }
    });
    if (answered === 0) {
      this.failed('site', 'warn', `tsunami.gov unreachable: ${results[0].reason.message}`);
      return null;
    }
    this.recovered('site', 'tsunami.gov answers again');
    // One entry per bulletin; the feeds add the "Category:" line.
    const merged = new Map();
    for (const list of this.lists.values()) {
      for (const bulletin of list) {
        const key = keyOf(bulletin);
        const known = merged.get(key);
        merged.set(
          key,
          known ? { ...known, category: known.category ?? bulletin.category } : bulletin,
        );
      }
    }
    return [...merged.values()];
  }

  /** New bulletins of the region: the message in effect, and the scene trigger. */
  async follow(region, bulletins, center) {
    const relevant = bulletins
      .filter((b) => region.matches(b.wmo))
      .sort((a, b) => a.issuedAt - b.issuedAt);
    const seen = this.data.seen;
    // First start, or another region: the newest bulletin is the starting
    // point (in effect if recent), nothing fires.
    if (this.data.region !== region.key) {
      this.data.region = region.key;
      this.data.current = null;
      for (const bulletin of relevant) {
        seen[keyOf(bulletin)] = bulletin.issuedAt;
      }
      const newest = relevant.at(-1);
      if (newest && this.now() - newest.issuedAt <= this.timings.seedMaxAgeMs) {
        const message = await this.read(newest, region, center);
        if (message) {
          this.data.current = message;
        } else {
          delete seen[keyOf(newest)];
        }
      }
      logger.debug(`${relevant.length} bulletin(s) of ${region.key} taken as known`);
    } else {
      const unseen = relevant.filter((b) => !(keyOf(b) in seen));
      // Newest first within the budget, read in issue order.
      const fresh = unseen.slice(-MAX_READS_PER_CYCLE);
      for (const bulletin of fresh) {
        const key = keyOf(bulletin);
        // Too old to be news (container stopped for days, a list reaching
        // far back): known, without trigger.
        if (this.now() - bulletin.issuedAt > this.timings.alertMaxAgeMs) {
          seen[key] = bulletin.issuedAt;
          continue;
        }
        const message = await this.read(bulletin, region, center);
        if (!message) {
          // Read again at the next cycle, MAX_ATTEMPTS times at most.
          const attempts = (this.attempts.get(key) ?? 0) + 1;
          this.attempts.set(key, attempts);
          if (attempts >= MAX_ATTEMPTS) {
            logger.warn(`Bulletin ${key} given up after ${attempts} attempts`);
            seen[key] = bulletin.issuedAt;
            this.attempts.delete(key);
          }
          continue;
        }
        this.attempts.delete(key);
        seen[key] = bulletin.issuedAt;
        this.adopt(message);
        await this.fire(message);
      }
    }
    // Forgotten only once no list holds it any more (and old enough), so a
    // bulletin still listed never comes back as news.
    const listed = new Set(bulletins.map(keyOf));
    const now = this.now();
    for (const [key, issuedAt] of Object.entries(seen)) {
      if (!listed.has(key) && now - issuedAt > this.timings.forgetAfterMs) {
        delete seen[key];
      }
    }
    this.store.save(this.data);
  }

  /**
   * A new message of the region becomes the message in effect, unless it would
   * lower an alert still in effect for another earthquake: an unrelated
   * information statement issued during a warning does not end it. Only a
   * bulletin of the same event (update, cancellation) or a stronger one does.
   */
  adopt(message) {
    const active = this.current();
    if (
      active &&
      LEVEL_OF[active.kind] > LEVEL_OF[message.kind] &&
      message.kind !== 'cancellation' &&
      active.eventId !== message.eventId
    ) {
      return;
    }
    if (active && active.eventId === message.eventId && message.issuedAt < active.issuedAt) {
      return;
    }
    // Same event, same second, two products: the more severe one stays.
    if (
      active &&
      message.issuedAt === active.issuedAt &&
      LEVEL_OF[message.kind] < LEVEL_OF[active.kind]
    ) {
      return;
    }
    this.data.current = message;
  }

  /**
   * One bulletin, with its CAP document and its text: the message record, or
   * null when nothing says what it is (both unreachable, no "Category:"), or
   * when the CAP document (the one that names the alert) failed and fewer than
   * MAX_ATTEMPTS were made: a text headline alone could read as a mere
   * statement.
   */
  async read(bulletin, region, center) {
    const attempt = (this.attempts.get(keyOf(bulletin)) ?? 0) + 1;
    const [capResult, textResult] = await Promise.allSettled([
      get(this.fetch, capUrl(bulletin)),
      get(this.fetch, textUrl(bulletin)),
    ]);
    const cap = capResult.status === 'fulfilled' ? parseCap(capResult.value.text) : null;
    const text =
      textResult.status === 'fulfilled'
        ? parseBulletinText(textResult.value.text, bulletin.issuedAt)
        : null;
    const capFailed = capResult.status === 'rejected';
    if ((!cap && !text?.headline && !bulletin.category) || (capFailed && attempt < MAX_ATTEMPTS)) {
      const reason = capResult.reason ?? textResult.reason;
      this.failed(
        'bulletin',
        'warn',
        `Cannot read bulletin ${keyOf(bulletin)}: ${reason?.message}`,
      );
      return null;
    }
    this.recovered('bulletin', 'Bulletins are readable again');
    const kind = classify({ category: bulletin.category, cap, headline: text?.headline });
    return {
      key: keyOf(bulletin),
      eventId: bulletin.eventId,
      region: region.key,
      kind,
      center: bulletin.center,
      wmo: bulletin.wmo,
      number: bulletin.number,
      issuedAt: bulletin.issuedAt,
      expiresAt: cap?.expiresAt ?? null,
      magnitude: cap?.magnitude ?? bulletin.magnitude,
      location: cap?.location || bulletin.location,
      originAt: cap?.originAt ?? bulletin.originAt,
      url: textUrl(bulletin),
      arrival: nearestArrival(text?.arrivals ?? [], center),
    };
  }

  /** The message in effect for the followed region, or null. */
  current() {
    const message = this.data.current;
    if (!message || !this.region || message.region !== this.region.key) {
      return null;
    }
    const now = this.now();
    if (LEVEL_OF[message.kind] > 0) {
      // While tsunami.gov cannot be read, an alert is not taken as over.
      const fresh = now - message.issuedAt <= this.timings.alertMaxAgeMs;
      return fresh || this.failing.has('site') ? message : null;
    }
    const until = message.expiresAt ?? message.issuedAt + this.timings.statementMs;
    return now <= until ? message : null;
  }

  async fire(message) {
    const line = `${KIND_NAMES.en[message.kind]} for ${REGION_NAMES.en[message.region]} (${message.key})`;
    // Information statements are routine (several a week): debug only.
    if (message.kind === 'information') {
      logger.debug(line);
    } else {
      logger.info(line);
    }
    try {
      await this.gladys.publishSceneEvent(TRIGGER, this.eventData(message));
      this.recovered('scene', 'Scene triggers work again');
    } catch (err) {
      this.failed('scene', 'warn', `Firing the scene trigger failed: ${err.message}`);
    }
  }

  /** The flat data of a scene event (fields, then variables of the manifest). */
  eventData(message) {
    const { language } = this.config;
    return {
      kind: message.kind,
      region: message.region,
      kind_name: KIND_NAMES[language][message.kind],
      region_name: REGION_NAMES[language][message.region],
      level: LEVEL_OF[message.kind],
      magnitude: message.magnitude,
      location: message.location ?? null,
      arrival: arrivalText(message.arrival, language),
      summary: sentence(message, message.region, language),
      url: message.url,
    };
  }

  // --- States ------------------------------------------------------------------

  statesOf() {
    // Without region, "no message in effect" would be a false all-clear.
    if (this.lastSuccessAt === null || !this.region) {
      return [];
    }
    const { language } = this.config;
    const ids = idsOf(this.gladys);
    const message = this.current();
    const none = phrase(PHRASES, 'none', language);
    return [
      { device_feature_external_id: ids.level, state: message ? LEVEL_OF[message.kind] : 0 },
      {
        device_feature_external_id: ids.message,
        text: message ? KIND_NAMES[language][message.kind] : none,
      },
      { device_feature_external_id: ids.magnitude, state: message?.magnitude ?? 0 },
      {
        device_feature_external_id: ids.quake,
        text: quakeText(message, language) ?? phrase(PHRASES, 'noQuake', language),
      },
      {
        device_feature_external_id: ids.arrival,
        text: arrivalText(message?.arrival, language) ?? phrase(PHRASES, 'noArrival', language),
      },
    ];
  }

  async publishStates() {
    const device = idsOf(this.gladys).device;
    if (!(this.gladys.devices ?? []).some((d) => d.external_id === device)) {
      return;
    }
    const states = this.statesOf();
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: this.timings.heartbeatMs });
      this.recovered('publish', 'Publishing the states works again');
    } catch (err) {
      // Sent again at the next cycle (the SDK forgets what Gladys refused).
      this.failed('publish', 'warn', `Publishing the states failed: ${err.message}`);
    }
  }

  async updateConnectionStatus() {
    const parts = [];
    if (this.failing.has('site')) {
      parts.push(render(STATUS, 'siteDown'));
    }
    if (this.reason) {
      parts.push(render(STATUS, this.reason));
    }
    if (this.config.invalidCenter) {
      parts.push(render(STATUS, 'invalidCenter'));
    }
    const message = parts.length > 0 ? join(...parts) : undefined;
    const connected = !this.failing.has('site') && this.lastSuccessAt !== null;
    const key = JSON.stringify([connected, message]);
    if (key === this.statusMessage) {
      return;
    }
    this.statusMessage = key;
    await this.gladys.setConnectionStatus(connected, message).catch(() => {});
  }

  // --- Gladys events -----------------------------------------------------------

  isOurs(device) {
    return device?.external_id === idsOf(this.gladys).device;
  }

  async onDeviceCreated(device) {
    if (!this.isOurs(device)) {
      return;
    }
    if (this.lastSuccessAt === null) {
      await this.runCycle();
    }
    // The SDK forgot the states of the device: they are published again.
    await this.publishStates();
    this.requestRefresh();
  }

  /** onPoll fallback: should_poll is false, but a Gladys polling anyway gets an answer. */
  async poll(device) {
    if (!this.isOurs(device)) {
      return;
    }
    // Read again only if the last cycle is older than half the interval.
    if (this.now() - this.lastCycleAt >= (this.config.refreshMinutes * MINUTE) / 2) {
      await this.runCycle();
    } else {
      await this.publishStates();
    }
  }

  /** The message in effect, read again if the last cycle is older than one interval. */
  async fresh() {
    if (this.now() - this.lastCycleAt >= this.config.refreshMinutes * MINUTE) {
      await this.runCycle();
    } else {
      await this.running;
    }
    return { message: this.current(), region: this.region, ok: this.lastSuccessAt !== null };
  }

  // --- Widget -------------------------------------------------------------------

  requestRefresh() {
    if (this.stopped) {
      return;
    }
    const now = this.now();
    const wait = this.lastRefreshAt + this.timings.widgetRefreshMs - now;
    if (wait <= 0) {
      this.lastRefreshAt = now;
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    } else if (this.timers && !this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.requestRefresh();
      }, wait);
      this.refreshTimer.unref?.();
    }
  }
}

/** The forecast point of the table nearest to the home, within ARRIVAL_MAX_KM. */
export function nearestArrival(arrivals, center) {
  if (!center) {
    return null;
  }
  let best = null;
  for (const arrival of arrivals) {
    const km = distanceKm(center.latitude, center.longitude, arrival.latitude, arrival.longitude);
    if (km <= ARRIVAL_MAX_KM && (best === null || km < best.km)) {
      best = { ...arrival, km };
    }
  }
  if (!best) {
    return null;
  }
  const { place, country, at } = best;
  return { place, country, at };
}

function emptyData() {
  return { version: 1, region: null, current: null, seen: {} };
}

export { SITE };

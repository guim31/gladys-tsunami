// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// The coasts the two NOAA tsunami warning centers write for. Each public
// bulletin carries a WMO heading naming its audience (tsunami.gov, checked on
// the bulletins of October and November 2026):
//   - NTWC (Palmer, Alaska, `PAAQ`): WEAK51/53 for Alaska, British Columbia,
//     Washington, Oregon and California; WEXX for the US East and Gulf coasts
//     and eastern Canada;
//   - PTWC (Honolulu, `PHEB`): WEHW for Hawaii, WEGM for Guam and the Northern
//     Mariana Islands, WEZS for American Samoa, WECA41/42 for Puerto Rico and
//     the Virgin Islands; WEPA (Pacific) and WECA43 (Caribbean) are the
//     international threat messages, meant for the national authorities of
//     every country of the basin.
// `key` is the stable word of the manifest, the scene trigger and the store.
export const REGIONS = [
  { key: 'alaska_west_coast', center: 'PAAQ', matches: (wmo) => wmo.startsWith('WEAK') },
  { key: 'east_gulf_coast', center: 'PAAQ', matches: (wmo) => wmo.startsWith('WEXX') },
  { key: 'hawaii', center: 'PHEB', matches: (wmo) => wmo.startsWith('WEHW') },
  { key: 'guam_cnmi', center: 'PHEB', matches: (wmo) => wmo.startsWith('WEGM') },
  { key: 'american_samoa', center: 'PHEB', matches: (wmo) => wmo.startsWith('WEZS') },
  { key: 'puerto_rico_vi', center: 'PHEB', matches: (wmo) => /^WECA4[12]$/.test(wmo) },
  {
    key: 'caribbean',
    center: 'PHEB',
    matches: (wmo) => wmo.startsWith('WECA') && !/^WECA4[12]$/.test(wmo),
  },
  { key: 'pacific', center: 'PHEB', matches: (wmo) => wmo.startsWith('WEPA') },
];
export const REGION_KEYS = REGIONS.map((region) => region.key);
export const regionOf = (key) => REGIONS.find((region) => region.key === key) ?? null;

// `auto`: the region is deduced from the home (see regionAt).
export const REGION_CHOICES = ['auto', ...REGION_KEYS];

// Minutes between two readings. The feeds answer 304 Not Modified when nothing
// was issued, a few hundred bytes: one minute stays light.
export const REFRESH_INTERVALS = ['1', '2', '5'];

export const DEFAULT_CONFIG = {
  region: 'auto',
  latitude: '',
  longitude: '',
  refresh_interval: '1',
  language: 'fr',
};

// Boxes of the coasts each region covers, tried in this order (the small
// islands first, the Pacific basin last). Coarse on purpose: they only pick a
// default for a home near the sea; the user can choose the region by hand.
const BOXES = [
  ['hawaii', 18, 23, -161, -154],
  ['guam_cnmi', 13, 21, 144, 146.5],
  ['american_samoa', -15, -10.5, -171.5, -168],
  ['puerto_rico_vi', 17.4, 19, -68.2, -64.2],
  ['alaska_west_coast', 51, 72, -180, -129],
  ['alaska_west_coast', 51, 56, 172, 180],
  ['alaska_west_coast', 32, 60, -129, -114],
  ['east_gulf_coast', 24, 33, -98, -79],
  ['east_gulf_coast', 24, 62, -88, -50],
  ['caribbean', 10, 24, -83.5, -58],
  ['caribbean', 17, 24, -92, -83.5],
  ['pacific', -60, 66, 99, 180],
  ['pacific', -60, 66, -180, -66],
];

/** The region of a home, or null when it is far from every covered coast. */
export function regionAt(latitude, longitude) {
  const box = BOXES.find(
    ([, south, north, west, east]) =>
      latitude >= south && latitude <= north && longitude >= west && longitude <= east,
  );
  return box ? box[0] : null;
}

/** A coordinate typed by the user (decimal comma accepted), null if blank or invalid. */
export function parseCoordinate(value, limit) {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) {
    return null;
  }
  const number = Number(text);
  return Math.abs(number) <= limit ? number : null;
}

const pick = (value, allowed, fallback) =>
  allowed.includes(String(value)) ? Number(value) : Number(fallback);

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const latitude = parseCoordinate(source.latitude, 90);
  const longitude = parseCoordinate(source.longitude, 180);
  // Both or none: half a home falls back on the house.
  const center = latitude !== null && longitude !== null ? { latitude, longitude } : null;
  const typed = String(source.latitude ?? '').trim() + String(source.longitude ?? '').trim();
  return {
    region: REGION_CHOICES.includes(source.region) ? source.region : DEFAULT_CONFIG.region,
    center,
    // Something was typed but is not a pair of coordinates: said once in the logs.
    invalidCenter: center === null && typed !== '',
    refreshMinutes: pick(
      source.refresh_interval,
      REFRESH_INTERVALS,
      DEFAULT_CONFIG.refresh_interval,
    ),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
  };
}

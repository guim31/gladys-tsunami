// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `tsunami`.
//
// The followed region as heading, then status rows: the message in effect,
// coloured by its level (green nothing, blue information, orange advisory,
// watch or threat, red warning), and, unless hidden by the `show_quake`
// setting, the earthquake (magnitude and time, place) and the estimated
// arrival time when the bulletin gives one. A button opens the bulletin, or
// tsunami.gov without message (setting `show_link`). The footer gives the
// source and the time of the last reading.
// Budget: 2 texts, 1 status, 1 button.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { KIND_NAMES, PHRASES, REGION_NAMES, arrivalText, formatDate, phrase } from './messages.js';
import { SITE, WIDGET_KEY } from './monitor.js';

export const TTL_SECONDS = 120;

export const TEXT = {
  waiting: {
    en: 'Waiting for tsunami.gov…',
    fr: 'En attente de tsunami.gov…',
    de: 'Warte auf tsunami.gov…',
    es: 'Esperando a tsunami.gov…',
  },
  noRegion: {
    en: 'No region followed',
    fr: 'Aucune région suivie',
    de: 'Keine Region verfolgt',
    es: 'Ninguna región seguida',
  },
  source: {
    en: 'Source: NOAA tsunami.gov',
    fr: 'Source : NOAA tsunami.gov',
    de: 'Quelle: NOAA tsunami.gov',
    es: 'Fuente: NOAA tsunami.gov',
  },
  message: { en: 'Message', fr: 'Message', de: 'Meldung', es: 'Mensaje' },
  quake: { en: 'Earthquake', fr: 'Séisme', de: 'Erdbeben', es: 'Sismo' },
  place: { en: 'Location', fr: 'Lieu', de: 'Ort', es: 'Lugar' },
  arrival: {
    en: 'Estimated arrival',
    fr: 'Arrivée estimée',
    de: 'Geschätzte Ankunft',
    es: 'Llegada estimada',
  },
  region: { en: 'Region', fr: 'Région', de: 'Region', es: 'Región' },
  chooseRegion: {
    en: 'Choose it in the configuration',
    fr: 'À choisir dans la configuration',
    de: 'In der Konfiguration wählen',
    es: 'Elíjala en la configuración',
  },
  bulletin: { en: 'Bulletin', fr: 'Bulletin', de: 'Bulletin', es: 'Boletín' },
  site: { en: 'tsunami.gov', fr: 'tsunami.gov', de: 'tsunami.gov', es: 'tsunami.gov' },
};

const COLORS = {
  none: WIDGET_COLORS.SUCCESS,
  cancellation: WIDGET_COLORS.SUCCESS,
  information: WIDGET_COLORS.INFO,
  advisory: WIDGET_COLORS.WARNING,
  watch: WIDGET_COLORS.WARNING,
  threat: WIDGET_COLORS.WARNING,
  warning: WIDGET_COLORS.DANGER,
};

const t = (text, language) => text[language] ?? text.en;
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

/** The status rows of a message (or of "no message in effect"). */
export function rows(message, language, { showQuake = true } = {}) {
  const items = [
    {
      label: t(TEXT.message, language),
      value: clip(
        message ? KIND_NAMES[language][message.kind] : phrase(PHRASES, 'none', language),
        40,
      ),
      color: COLORS[message?.kind ?? 'none'],
    },
  ];
  if (!message || !showQuake) {
    return items;
  }
  const time = formatDate(message.originAt ?? message.issuedAt, language);
  items.push({
    label: t(TEXT.quake, language),
    value: clip(message.magnitude === null ? time : `M ${message.magnitude} · ${time}`, 40),
    color: WIDGET_COLORS.NEUTRAL,
  });
  if (message.location) {
    items.push({
      label: t(TEXT.place, language),
      value: clip(message.location, 40),
      color: WIDGET_COLORS.NEUTRAL,
    });
  }
  const arrival = arrivalText(message.arrival, language);
  if (arrival) {
    items.push({
      label: t(TEXT.arrival, language),
      value: clip(arrival, 40),
      color: COLORS[message.kind],
    });
  }
  return items;
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(monitor, { language = 'en', settings = {} } = {}) {
      const lang = REGION_NAMES[language] ? language : 'en';
      const updated = monitor.lastSuccessAt;
      const region = monitor.region;
      const source = t(TEXT.source, lang);
      let heading;
      if (!region) {
        heading = monitor.reason ? t(TEXT.noRegion, lang) : t(TEXT.waiting, lang);
      } else {
        heading = updated === null ? t(TEXT.waiting, lang) : REGION_NAMES[lang][region.key];
      }
      const components = [{ type: 'text', variant: 'heading', text: heading }];
      const message = monitor.current();
      if (region && updated !== null) {
        components.push({
          type: 'status',
          items: rows(message, lang, { showQuake: settings.show_quake !== false }),
        });
      } else if (monitor.reason) {
        components.push({
          type: 'status',
          items: [
            {
              label: t(TEXT.region, lang),
              value: t(TEXT.chooseRegion, lang),
              color: WIDGET_COLORS.WARNING,
            },
          ],
        });
      }
      if (settings.show_link !== false) {
        components.push({
          type: 'button',
          label: message ? t(TEXT.bulletin, lang) : t(TEXT.site, lang),
          icon: 'external-link',
          link: { url: message?.url ?? SITE },
        });
      }
      components.push({
        type: 'text',
        variant: 'caption',
        text: updated === null ? source : `${source} · ${formatDate(updated, lang)}`,
      });
      return { ttl_seconds: TTL_SECONDS, components };
    },
  },
};

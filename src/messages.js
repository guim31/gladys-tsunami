// -----------------------------------------------------------------------------
// Texts sent from the container (feature values, connection status, action and
// scene messages, scene variables), in the four languages of the Gladys
// interface. Entries are strings or functions of one parameter object. German
// says "du", Spanish "usted". Place names come from NOAA, in English: they are
// not translated.
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

export const KIND_NAMES = {
  en: {
    information: 'Information statement',
    advisory: 'Tsunami advisory',
    watch: 'Tsunami watch',
    warning: 'Tsunami warning',
    threat: 'Tsunami threat message',
    cancellation: 'Alert ended',
  },
  fr: {
    information: "Message d'information",
    advisory: 'Avis de tsunami',
    watch: 'Veille tsunami',
    warning: 'Alerte tsunami',
    threat: 'Message de menace tsunami',
    cancellation: "Fin d'alerte",
  },
  de: {
    information: 'Informationsmeldung',
    advisory: 'Tsunami-Hinweis',
    watch: 'Tsunami-Vorwarnung',
    warning: 'Tsunami-Warnung',
    threat: 'Tsunami-Gefahrenmeldung',
    cancellation: 'Entwarnung',
  },
  es: {
    information: 'Mensaje informativo',
    advisory: 'Advertencia de tsunami',
    watch: 'Vigilancia de tsunami',
    warning: 'Aviso de tsunami',
    threat: 'Mensaje de amenaza de tsunami',
    cancellation: 'Fin de la alerta',
  },
};

export const REGION_NAMES = {
  en: {
    alaska_west_coast: 'Alaska, BC and US West Coast',
    east_gulf_coast: 'US East and Gulf coasts, Canada',
    hawaii: 'Hawaii',
    guam_cnmi: 'Guam and Northern Mariana Islands',
    american_samoa: 'American Samoa',
    puerto_rico_vi: 'Puerto Rico and Virgin Islands',
    caribbean: 'Caribbean (international)',
    pacific: 'Pacific (international)',
  },
  fr: {
    alaska_west_coast: 'Alaska, C.-B. et côte ouest des É.-U.',
    east_gulf_coast: 'Côtes est et du golfe des É.-U., Canada',
    hawaii: 'Hawaï',
    guam_cnmi: 'Guam et îles Mariannes du Nord',
    american_samoa: 'Samoa américaines',
    puerto_rico_vi: 'Porto Rico et îles Vierges',
    caribbean: 'Caraïbes (international)',
    pacific: 'Pacifique (international)',
  },
  de: {
    alaska_west_coast: 'Alaska, BC und US-Westküste',
    east_gulf_coast: 'US-Ost- und Golfküste, Kanada',
    hawaii: 'Hawaii',
    guam_cnmi: 'Guam und Nördliche Marianen',
    american_samoa: 'Amerikanisch-Samoa',
    puerto_rico_vi: 'Puerto Rico und Jungferninseln',
    caribbean: 'Karibik (international)',
    pacific: 'Pazifik (international)',
  },
  es: {
    alaska_west_coast: 'Alaska, C. B. y costa oeste de EE. UU.',
    east_gulf_coast: 'Costas este y del golfo de EE. UU., Canadá',
    hawaii: 'Hawái',
    guam_cnmi: 'Guam e Islas Marianas del Norte',
    american_samoa: 'Samoa Americana',
    puerto_rico_vi: 'Puerto Rico e Islas Vírgenes',
    caribbean: 'Caribe (internacional)',
    pacific: 'Pacífico (internacional)',
  },
};

export const PHRASES = {
  en: {
    none: 'No message in effect',
    noArrival: 'Not given',
    noQuake: 'No earthquake',
    quake: ({ place, time }) => `${place}, ${time}`,
    arrival: ({ place, time }) => `${place}: ${time}`,
    magnitude: ({ value }) => `magnitude ${value}`,
    sentenceNone: ({ region }) => `No tsunami message in effect for ${region}.`,
    sentence: ({ kind, region, quake }) => `${kind} for ${region}: ${quake}.`,
    sentenceArrival: ({ arrival }) => ` Estimated arrival at ${arrival}.`,
  },
  fr: {
    none: 'Aucun message en cours',
    noArrival: 'Non indiquée',
    noQuake: 'Aucun séisme',
    quake: ({ place, time }) => `${place}, ${time}`,
    arrival: ({ place, time }) => `${place} : ${time}`,
    magnitude: ({ value }) => `magnitude ${value}`,
    sentenceNone: ({ region }) => `Aucun message tsunami en cours pour ${region}.`,
    sentence: ({ kind, region, quake }) => `${kind} pour ${region} : ${quake}.`,
    sentenceArrival: ({ arrival }) => ` Arrivée estimée à ${arrival}.`,
  },
  de: {
    none: 'Keine aktuelle Meldung',
    noArrival: 'Nicht angegeben',
    noQuake: 'Kein Erdbeben',
    quake: ({ place, time }) => `${place}, ${time}`,
    arrival: ({ place, time }) => `${place}: ${time}`,
    magnitude: ({ value }) => `Magnitude ${value}`,
    sentenceNone: ({ region }) => `Keine aktuelle Tsunami-Meldung für ${region}.`,
    sentence: ({ kind, region, quake }) => `${kind} für ${region}: ${quake}.`,
    sentenceArrival: ({ arrival }) => ` Geschätzte Ankunft in ${arrival}.`,
  },
  es: {
    none: 'Ningún mensaje en vigor',
    noArrival: 'No indicada',
    noQuake: 'Ningún sismo',
    quake: ({ place, time }) => `${place}, ${time}`,
    arrival: ({ place, time }) => `${place}: ${time}`,
    magnitude: ({ value }) => `magnitud ${value}`,
    sentenceNone: ({ region }) => `Ningún mensaje de tsunami en vigor para ${region}.`,
    sentence: ({ kind, region, quake }) => `${kind} para ${region}: ${quake}.`,
    sentenceArrival: ({ arrival }) => ` Llegada estimada a ${arrival}.`,
  },
};

// Connection status and action messages, as { en, fr, de, es } objects.
export const STATUS = {
  en: {
    siteDown: 'tsunami.gov cannot be reached.',
    noRegion:
      'No region: set the location of your house in Gladys, or choose the region in the configuration.',
    outside:
      'Your home is far from the coasts NOAA covers: choose the region in the configuration.',
    invalidCenter: 'The coordinates of the configuration are not valid: the house is used.',
    initFailed: 'Initialization failed, see the logs of the integration.',
    summary: ({ text, time }) => `${text} (read at ${time})`,
  },
  fr: {
    siteDown: 'tsunami.gov est injoignable.',
    noRegion:
      'Aucune région : renseignez la position de votre maison dans Gladys, ou choisissez la région dans la configuration.',
    outside:
      'Votre maison est loin des côtes couvertes par la NOAA : choisissez la région dans la configuration.',
    invalidCenter:
      'Les coordonnées de la configuration ne sont pas valides : la maison est utilisée.',
    initFailed: "L'initialisation a échoué, voir les journaux de l'intégration.",
    summary: ({ text, time }) => `${text} (lu à ${time})`,
  },
  de: {
    siteDown: 'tsunami.gov ist nicht erreichbar.',
    noRegion:
      'Keine Region: Trage den Standort deines Hauses in Gladys ein oder wähle die Region in der Konfiguration.',
    outside:
      'Dein Zuhause liegt fern der Küsten, die die NOAA abdeckt: Wähle die Region in der Konfiguration.',
    invalidCenter: 'Die Koordinaten der Konfiguration sind ungültig: Das Haus wird verwendet.',
    initFailed: 'Initialisierung fehlgeschlagen, siehe die Protokolle der Integration.',
    summary: ({ text, time }) => `${text} (gelesen um ${time})`,
  },
  es: {
    siteDown: 'No se puede acceder a tsunami.gov.',
    noRegion:
      'Ninguna región: indique la ubicación de su casa en Gladys o elija la región en la configuración.',
    outside:
      'Su casa está lejos de las costas que cubre la NOAA: elija la región en la configuración.',
    invalidCenter: 'Las coordenadas de la configuración no son válidas: se usa la casa.',
    initFailed: 'La inicialización falló, consulte los registros de la integración.',
    summary: ({ text, time }) => `${text} (leído a las ${time})`,
  },
};

const LOCALES = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** A table entry in one language: a string, or a function of `params`. */
export function phrase(table, key, language, params = {}) {
  const entry = (table[language] ?? table.en)[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** A table entry in every language: `{ en, fr, de, es }`. */
export function render(table, key, params) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [language, phrase(table, key, language, params)]),
  );
}

/** Several `{ en, fr, de, es }` messages joined language by language. */
export function join(...messages) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [language, messages.map((m) => m[language]).join(' ')]),
  );
}

/** Day and time in the time zone of Gladys (TZ), short. */
export function formatDate(ms, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** Time only, in the time zone of Gladys. */
export function formatTime(ms, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** "PANAMA, 9 Oct 19:56" (place of the earthquake, origin time), or null. */
export function quakeText(message, language) {
  if (!message?.location) {
    return null;
  }
  const at = message.originAt ?? message.issuedAt;
  return phrase(PHRASES, 'quake', language, {
    place: message.location,
    time: formatDate(at, language),
  });
}

/** "PUNTA MALA (PANAMA): 9 Oct 18:20", or null. */
export function arrivalText(arrival, language) {
  if (!arrival) {
    return null;
  }
  return phrase(PHRASES, 'arrival', language, {
    place: `${arrival.place} (${arrival.country})`,
    time: formatDate(arrival.at, language),
  });
}

/** One sentence for a scene or the configuration action. */
export function sentence(message, regionKey, language) {
  const region = REGION_NAMES[language][regionKey] ?? regionKey;
  if (!message) {
    return phrase(PHRASES, 'sentenceNone', language, { region });
  }
  const quake = [
    quakeText(message, language),
    message.magnitude === null
      ? null
      : phrase(PHRASES, 'magnitude', language, { value: message.magnitude }),
  ]
    .filter(Boolean)
    .join(', ');
  const text = phrase(PHRASES, 'sentence', language, {
    kind: KIND_NAMES[language][message.kind],
    region,
    quake: quake || phrase(PHRASES, 'noQuake', language),
  });
  const arrival = arrivalText(message.arrival, language);
  return arrival ? text + phrase(PHRASES, 'sentenceArrival', language, { arrival }) : text;
}

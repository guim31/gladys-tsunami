// -----------------------------------------------------------------------------
// The Gladys device of the integration (couples checked against the Gladys
// front, see test/gladys-rules.test.js): one device, "Tsunami alert", for the
// followed region:
//   - level      risk/integer 0-3: 0 no threat (nothing in effect, an
//                information statement, an alert ended), 1 advisory, 2 watch
//                or international threat message, 3 warning. The front draws
//                its risk badge; scenes test "level >= 2" or "level = 0";
//   - message    text/text: the kind of the message in effect;
//   - magnitude  sismic-sensor/decimal 0-10: preliminary magnitude of the
//                earthquake of that message (0 without message);
//   - quake      text/text: place and origin time of the earthquake;
//   - arrival    text/text: estimated arrival time of the first wave at the
//                forecast point nearest to the home, when the bulletin lists
//                one (international threat messages).
//
// Published with should_poll: false: the refresh runs in the container
// (src/monitor.js). The platform id is fixed ("home"): changing the region
// keeps the same device and its history.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
} from '@gladysassistant/integration-sdk';

export const DEVICE_TYPE = 'alert';
export const DEVICE_ID = 'home';
export const FEATURES = ['level', 'message', 'magnitude', 'quake', 'arrival'];

// Feature names, frozen at creation in Gladys (language of the configuration).
export const NAMES = {
  en: {
    device: 'Tsunami alert',
    level: 'Tsunami alert level',
    message: 'Message in effect',
    magnitude: 'Earthquake magnitude',
    quake: 'Earthquake',
    arrival: 'Estimated arrival',
  },
  fr: {
    device: 'Alerte tsunami',
    level: "Niveau d'alerte tsunami",
    message: 'Message en cours',
    magnitude: 'Magnitude du séisme',
    quake: 'Séisme',
    arrival: 'Arrivée estimée',
  },
  de: {
    device: 'Tsunami-Warnung',
    level: 'Tsunami-Warnstufe',
    message: 'Aktuelle Meldung',
    magnitude: 'Magnitude des Erdbebens',
    quake: 'Erdbeben',
    arrival: 'Geschätzte Ankunft',
  },
  es: {
    device: 'Alerta de tsunami',
    level: 'Nivel de alerta de tsunami',
    message: 'Mensaje en vigor',
    magnitude: 'Magnitud del sismo',
    quake: 'Sismo',
    arrival: 'Llegada estimada',
  },
};

/** External ids of the device and of its features. */
export function idsOf(gladys) {
  const ids = gladys.externalIds(DEVICE_TYPE, DEVICE_ID);
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURES.map((key) => [key, ids.feature(key)])),
  };
}

const sensor = (name, externalId, category, type, extra) => ({
  name,
  external_id: externalId,
  category,
  type,
  read_only: true,
  has_feedback: false,
  keep_history: true,
  ...extra,
});
const text = (name, externalId) =>
  sensor(name, externalId, CATEGORIES.TEXT, TYPES.TEXT.TEXT, {
    keep_history: false,
    min: 0,
    max: 0,
  });

/** The discovery payload of the device. */
export function buildDevice(gladys, { language = 'fr' } = {}) {
  const ids = idsOf(gladys);
  const names = NAMES[language] ?? NAMES.fr;
  return {
    name: names.device,
    external_id: ids.device,
    model: 'NOAA tsunami.gov',
    should_poll: false,
    params: [],
    features: [
      sensor(names.level, ids.level, CATEGORIES.RISK, TYPES.RISK.INTEGER, { min: 0, max: 3 }),
      text(names.message, ids.message),
      sensor(names.magnitude, ids.magnitude, CATEGORIES.SISMIC_SENSOR, TYPES.SENSOR.DECIMAL, {
        min: 0,
        max: 10,
      }),
      text(names.quake, ids.quake),
      text(names.arrival, ids.arrival),
    ],
  };
}

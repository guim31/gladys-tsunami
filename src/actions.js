// -----------------------------------------------------------------------------
// The scene action `read_alert` and the configuration action `check_now`.
// Both read tsunami.gov again when the last cycle is older than one interval,
// and answer with the message in effect for the followed region as one
// sentence: something a scene can send by message or read aloud.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { LANGUAGES } from './config.js';
import { STATUS, formatTime, phrase, render, sentence } from './messages.js';
import { LEVEL_OF } from './tsunami.js';

const logger = createLogger({ name: 'tsunami-actions' });

export const SCENE_ACTION = 'read_alert';
export const CONFIG_ACTION = 'check_now';

/** Scene action: outputs `text`, `level` and `kind`; throws without region or answer. */
export async function readAlert(monitor) {
  const { message, region, ok } = await monitor.fresh();
  const { language } = monitor.config;
  if (!ok) {
    throw new Error(phrase(STATUS, 'siteDown', language));
  }
  if (!region) {
    throw new Error(phrase(STATUS, monitor.reason ?? 'noRegion', language));
  }
  return {
    text: sentence(message, region.key, language),
    level: message ? LEVEL_OF[message.kind] : 0,
    kind: message?.kind ?? 'none',
  };
}

/** Configuration action: the message in effect, in every language. */
export async function checkNow(monitor) {
  const { message, region, ok } = await monitor.fresh();
  logger.info(
    `Check requested: ${ok ? (message?.kind ?? 'no message') : 'tsunami.gov unreachable'}`,
  );
  if (!ok) {
    return render(STATUS, 'siteDown');
  }
  if (!region) {
    return render(STATUS, monitor.reason ?? 'noRegion');
  }
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      phrase(STATUS, 'summary', language, {
        text: sentence(message, region.key, language),
        time: formatTime(monitor.lastSuccessAt, language),
      }),
    ]),
  );
}

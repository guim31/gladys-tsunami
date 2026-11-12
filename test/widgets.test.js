// -----------------------------------------------------------------------------
// The `tsunami` widget (checked by the SDK's validator of the core vocabulary
// and budget), the scene action `read_alert` and the action `check_now`.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { CONFIG_ACTION, SCENE_ACTION } from '../src/actions.js';
import { WIDGET_KEY } from '../src/monitor.js';
import { PEDASI, createWorld } from './helpers/world.js';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}
const DURING = { time: Date.parse('2026-10-09T18:35:00Z') };

async function widget(w, request) {
  const { data } = await w.fake.widgetGet(WIDGET_KEY, request);
  return data.content;
}

for (const language of ['en', 'fr', 'de', 'es']) {
  test(`the widget is valid in ${language}, during a threat and without message`, async (t) => {
    const during = await world(t, { config: PEDASI, clock: DURING });
    const content = await widget(during, { language });
    assert.deepEqual(validateWidgetContent(content), []);
    const status = content.components.find((c) => c.type === 'status');
    assert.equal(status.items.length, 4);
    assert.equal(status.items[0].color, 'warning');
    const button = content.components.find((c) => c.type === 'button');
    assert.match(button.link.url, /26282000\/2\/WEPA40\/WEPA40\.txt$/);

    const calm = await world(t);
    const quiet = await widget(calm, { language });
    assert.deepEqual(validateWidgetContent(quiet), []);
    const row = quiet.components.find((c) => c.type === 'status').items;
    assert.equal(row.length, 1);
    assert.equal(row[0].color, 'success');
  });
}

test('the settings hide the earthquake and the link', async (t) => {
  const w = await world(t, { config: PEDASI, clock: DURING });
  const content = await widget(w, {
    language: 'fr',
    settings: { show_quake: false, show_link: false },
  });
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components.find((c) => c.type === 'status').items.length, 1);
  assert.equal(
    content.components.some((c) => c.type === 'button'),
    false,
  );
});

test('without region, the widget says to choose one', async (t) => {
  const w = await world(t, { houses: [] });
  const content = await widget(w, { language: 'en' });
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components[0].text, 'No region followed');
});

test('read_alert answers one sentence, the level and the kind', async (t) => {
  const w = await world(t, { config: { ...PEDASI, language: 'en' }, clock: DURING });
  const { data } = await w.fake.sceneAction(SCENE_ACTION, {});
  assert.equal(data.outputs.level, 2);
  assert.equal(data.outputs.kind, 'threat');
  assert.equal(
    data.outputs.text,
    'Tsunami threat message for Pacific (international): PANAMA, Oct 9, 07:56 AM, magnitude 7.6.' +
      ' Estimated arrival at PUNTA MALA (PANAMA): Oct 9, 08:20 AM.',
  );
  const calm = await world(t, { config: { language: 'fr' } });
  const quiet = await calm.fake.sceneAction(SCENE_ACTION, {});
  assert.deepEqual(quiet.data.outputs, {
    text: 'Aucun message tsunami en cours pour Hawaï.',
    level: 0,
    kind: 'none',
  });
});

test('check_now answers in the four languages', async (t) => {
  const w = await world(t);
  const answer = await w.fake.action(CONFIG_ACTION, {});
  const text = JSON.stringify(answer);
  for (const words of ['No tsunami message', 'Aucun message', 'Keine aktuelle', 'Ningún mensaje']) {
    assert.ok(text.includes(words), words);
  }
});

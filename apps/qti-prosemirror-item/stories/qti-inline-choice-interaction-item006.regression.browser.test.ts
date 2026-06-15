import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';

import {
  exportAssessmentItemDoc,
  importItem006,
  mountEditor,
} from './qti-inline-choice-interaction-item006.regression.stories';

test('importing ITEM006 renders exactly three qti-inline-choice options', async () => {
  // Regression guard: the interaction and its choices are inline, so the
  // indentation between `<qti-inline-choice>` elements used to be parsed as
  // significant whitespace and wrapped into empty default choices, producing six
  // options instead of three.
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = mountEditor(host);

  // Wait until the interaction has rendered its slotted choices.
  await findByShadowText(host, 'hoger');

  const interactions = host.querySelectorAll('qti-inline-choice-interaction');
  expect(interactions).toHaveLength(1);

  const choices = Array.from(interactions[0].querySelectorAll(':scope > qti-inline-choice'));
  expect(choices).toHaveLength(3);
  expect(choices.map(choice => choice.getAttribute('identifier'))).toEqual([
    'choice_lager',
    'choice_hoger',
    'choice_onveranderd',
  ]);
  expect(choices.map(choice => choice.textContent?.trim())).toEqual(['lager', 'hoger', 'onveranderd']);

  view.destroy();
  host.remove();
});

test('exported ITEM006 item-body carries exactly three qti-inline-choice options', () => {
  // Pure pipeline — no rendering needed: import ITEM006 → export → inspect.
  const exported = exportAssessmentItemDoc(importItem006());

  const choices = Array.from(exported.querySelectorAll('qti-inline-choice-interaction > qti-inline-choice'));
  expect(choices).toHaveLength(3);
  expect(choices.map(choice => choice.getAttribute('identifier'))).toEqual([
    'choice_lager',
    'choice_hoger',
    'choice_onveranderd',
  ]);
  expect(choices.map(choice => choice.textContent?.trim())).toEqual(['lager', 'hoger', 'onveranderd']);
});

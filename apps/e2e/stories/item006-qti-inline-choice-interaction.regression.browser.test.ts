import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';

import {
  exportAssessmentItemDoc,
  importItem006,
  mountEditor,
} from './item006-qti-inline-choice-interaction.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM006-editor.xml?raw';

test('exported QTI matches the ITEM006-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem006());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM006-editor.xml');
});

// ITEM006 is a single inline-choice dropdown: lager / hoger / onveranderd.
// correct = choice_hoger
//
// The runtime renders a combobox: button[aria-haspopup=listbox] opens a
// [role=listbox] popover. Two gestures, exactly as a candidate performs them.
//
// The options are matched by TEXT, not by role: only the placeholder button
// carries role="option"; the real choices are slotted <qti-inline-choice>
// elements with no role at all. See finding #12 in docs/testing-findings.md.
type Frame = Awaited<ReturnType<typeof mountQtiRuntime>>['frame'];

const pick = async (frame: Frame, option: string) => {
  await frame.getByRole('button').first().click(); // opens the popover
  await frame.getByText(option, { exact: true }).click();
};

test('ITEM006 scores 1 when the candidate picks the correct option from the dropdown', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await pick(harness.frame, 'hoger');

  expect(harness.response()).toBe('choice_hoger');
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM006 scores 0 when the candidate picks a wrong option', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await pick(harness.frame, 'lager');

  expect(harness.response()).toBe('choice_lager');
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM006 is single-cardinality: picking again replaces the previous answer', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await pick(harness.frame, 'onveranderd');
  expect(harness.score()).toBe(0);

  await pick(harness.frame, 'hoger');

  expect(harness.response()).toBe('choice_hoger');
  expect(harness.score()).toBe(1);

  harness.destroy();
});

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

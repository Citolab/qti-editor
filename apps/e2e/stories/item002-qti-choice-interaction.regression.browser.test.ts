import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem002 } from './item002-qti-choice-interaction.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM002-editor.xml?raw';

test('exported QTI matches the ITEM002-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem002());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM002-editor.xml');
});

// ITEM002 is multiple-cardinality.
// correct = choice1 Lesotho, choice2 San Marino, choice4 Vaticaanstad
// wrong   = choice3 Bolivia
const CORRECT = ['Lesotho', 'San Marino', 'Vaticaanstad'];

test('ITEM002 scores 1 when the candidate clicks every correct choice', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  for (const label of CORRECT) {
    await harness.frame.getByText(label, { exact: true }).click();
  }

  expect(harness.response()).toEqual(['choice1', 'choice2', 'choice4']);
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM002 scores 0 when the candidate also clicks the distractor', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  for (const label of [...CORRECT, 'Bolivia']) {
    await harness.frame.getByText(label, { exact: true }).click();
  }

  // match_correct is all-or-nothing: one extra selection loses the mark.
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM002 scores 0 for a partially correct selection', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await harness.frame.getByText('Lesotho', { exact: true }).click();
  await harness.frame.getByText('San Marino', { exact: true }).click();

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM002 lets the candidate deselect a choice, recovering the mark', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // Over-select, then correct the mistake by clicking the distractor again.
  for (const label of [...CORRECT, 'Bolivia']) {
    await harness.frame.getByText(label, { exact: true }).click();
  }
  expect(harness.score()).toBe(0);

  await harness.frame.getByText('Bolivia', { exact: true }).click();

  expect(harness.response()).toEqual(['choice1', 'choice2', 'choice4']);
  expect(harness.score()).toBe(1);

  harness.destroy();
});

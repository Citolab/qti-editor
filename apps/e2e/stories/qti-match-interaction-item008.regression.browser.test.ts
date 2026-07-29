import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem008 } from './qti-match-interaction-item008.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM008-editor.xml?raw';

test('exported QTI matches the ITEM008-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem008());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM008-editor.xml');
});

// ITEM008 matches authors to their books (directedPair, one-to-one).
const CORRECT = ['left_diamond right_ggs', 'left_harari right_sapiens', 'left_arendt right_thc'];

test('ITEM008 scores 1 when every author is matched to the right book', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM008 scores 0 when two books are swapped', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, [
    'left_diamond right_sapiens',
    'left_harari right_ggs',
    'left_arendt right_thc',
  ]);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM008 scores 0 for a partially completed match', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT.slice(0, 2));

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM008 scores 0 when nothing is matched', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

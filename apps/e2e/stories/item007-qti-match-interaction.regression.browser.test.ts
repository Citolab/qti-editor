import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem007 } from './item007-qti-match-interaction.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM007-editor.xml?raw';

test('exported QTI matches the ITEM007-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem007());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM007-editor.xml');
});

// ITEM007 matches physical quantities to their SI units (directedPair).
const CORRECT = ['left_vermogen right_watt', 'left_druk right_pascal', 'left_frequentie right_hertz'];

test('ITEM007 scores 1 for all three correct pairs', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM007 scores 0 when two units are swapped', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, [
    'left_vermogen right_pascal',
    'left_druk right_watt',
    'left_frequentie right_hertz',
  ]);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM007 scores 0 for a partially completed match', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT.slice(0, 2));

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM007 scores 0 when nothing is matched', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

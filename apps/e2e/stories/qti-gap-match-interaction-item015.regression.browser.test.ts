import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem015 } from './qti-gap-match-interaction-item015.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM015-editor.xml?raw';

test('exported QTI matches the ITEM015-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem015());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM015-editor.xml');
});

// ITEM015 drops "zuur"/"basisch" into the low/high pH gaps (directedPair).
const CORRECT = ['ht_zuur gap_low', 'ht_basisch gap_high'];

test('ITEM015 scores 1 when both gaps are filled correctly', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM015 scores 0 when the two gap texts are swapped', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['ht_basisch gap_low', 'ht_zuur gap_high']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM015 scores 0 when only one gap is filled', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['ht_zuur gap_low']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM015 scores 0 when both gaps are left empty', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

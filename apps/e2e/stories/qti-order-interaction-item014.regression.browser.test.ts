import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem014 } from './qti-order-interaction-item014.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM014-editor.xml?raw';

test('exported QTI matches the ITEM014-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem014());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM014-editor.xml');
});

// ITEM014 orders numbers by size: 1 < √2 < π (ordered cardinality).
const CORRECT = ['num_1', 'num_sqrt2', 'num_pi'];

test('ITEM014 scores 1 for the correct ascending order', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM014 scores 0 for descending order', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, [...CORRECT].reverse());

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM014 scores 0 when two adjacent numbers are swapped', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['num_sqrt2', 'num_1', 'num_pi']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM014 scores 0 for an incomplete ordering', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['num_1', 'num_sqrt2']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

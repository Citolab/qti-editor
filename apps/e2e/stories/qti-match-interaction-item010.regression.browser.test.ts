import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem010 } from './qti-match-interaction-item010.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM010-editor.xml?raw';

test('exported QTI matches the ITEM010-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem010());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM010-editor.xml');
});

// ITEM010 is a true/false grid: three statements, each filed under juist/onjuist.
const CORRECT = ['evenaar juist', 'helium juist', 'pluto onjuist'];

test('ITEM010 scores 1 when all three statements are judged correctly', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM010 scores 0 when a single statement is judged wrongly', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['evenaar juist', 'helium juist', 'pluto juist']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM010 scores 0 when every statement is judged wrongly', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['evenaar onjuist', 'helium onjuist', 'pluto juist']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM010 scores 0 when a statement is left unjudged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT.slice(0, 2));

  expect(harness.score()).toBe(0);

  harness.destroy();
});

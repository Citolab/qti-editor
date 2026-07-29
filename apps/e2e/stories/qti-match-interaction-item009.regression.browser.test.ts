import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem009 } from './qti-match-interaction-item009.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM009-editor.xml?raw';

test('exported QTI matches the ITEM009-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem009());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM009-editor.xml');
});

// ITEM009 sorts five terms into two subjects — a many-to-one match, so the
// same target legitimately appears in several pairs.
const CORRECT = [
  'enzym biologie',
  'mitochondrion biologie',
  'isotoop scheikunde',
  'katalysator scheikunde',
  'molmassa scheikunde',
];

test('ITEM009 scores 1 when every term is filed under the right subject', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM009 scores 0 when one term is filed under the wrong subject', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, [
    'enzym scheikunde', // belongs to biologie
    'mitochondrion biologie',
    'isotoop scheikunde',
    'katalysator scheikunde',
    'molmassa scheikunde',
  ]);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM009 scores 0 when a term is left unfiled', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT.slice(0, 4));

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM009 scores 0 when nothing is matched', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem012 } from './item012-qti-hottext-interaction.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM012-editor.xml?raw';

test('exported QTI matches the ITEM012-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem012());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM012-editor.xml');
});

// ITEM012 is a single-RESPONSE multiple-cardinality hottext: pick the two verbs.
// correct = ht_onderzocht "onderzocht", ht_verving "verving"
// wrong   = ht_apparaat, ht_defecte, ht_sensor
test('ITEM012 scores 1 when the candidate clicks both correct hottexts', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await harness.frame.getByText('onderzocht', { exact: true }).click();
  await harness.frame.getByText('verving', { exact: true }).click();

  expect(harness.response()).toEqual(['ht_onderzocht', 'ht_verving']);
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM012 scores 0 when the candidate clicks the wrong hottexts', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await harness.frame.getByText('apparaat', { exact: true }).click();
  await harness.frame.getByText('sensor', { exact: true }).click();

  expect(harness.response()).toEqual(['ht_apparaat', 'ht_sensor']);
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM012 scores 0 when only one of the two correct hottexts is clicked', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await harness.frame.getByText('onderzocht', { exact: true }).click();

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM012 lets the candidate deselect a hottext, recovering the mark', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await harness.frame.getByText('onderzocht', { exact: true }).click();
  await harness.frame.getByText('verving', { exact: true }).click();
  await harness.frame.getByText('defecte', { exact: true }).click();
  expect(harness.score()).toBe(0);

  await harness.frame.getByText('defecte', { exact: true }).click();

  expect(harness.response()).toEqual(['ht_onderzocht', 'ht_verving']);
  expect(harness.score()).toBe(1);

  harness.destroy();
});

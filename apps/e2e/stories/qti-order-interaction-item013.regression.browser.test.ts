import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem013 } from './qti-order-interaction-item013.regression.stories';
import { mountQtiRuntime, placeByKeyboard } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM013-editor.xml?raw';

test('exported QTI matches the ITEM013-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem013());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM013-editor.xml');
});

// ITEM013 asks for the steps of the scientific method in order (ordered cardinality).
// correct = step_hypothese, step_data, step_conclusies
const LABELS = {
  step_hypothese: 'Hypothese formuleren',
  step_data: 'Data verzamelen',
  step_conclusies: 'Conclusies trekken',
} as const;

type Harness = Awaited<ReturnType<typeof mountQtiRuntime>>;

/** Places each step into successive slots via the keyboard placement protocol. */
const placeSteps = async (harness: Harness, order: (keyof typeof LABELS)[]) => {
  for (const [slot, id] of order.entries()) {
    await placeByKeyboard(harness, LABELS[id], slot);
  }
};

test('ITEM013 scores 1 when the candidate places the steps in the correct order', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await placeSteps(harness, ['step_hypothese', 'step_data', 'step_conclusies']);

  expect(harness.response()).toEqual(['step_hypothese', 'step_data', 'step_conclusies']);
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM013 scores 0 for the reversed order', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await placeSteps(harness, ['step_conclusies', 'step_data', 'step_hypothese']);

  expect(harness.response()).toEqual(['step_conclusies', 'step_data', 'step_hypothese']);
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM013 scores 0 when two adjacent steps are swapped', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // Ordering is strict: one transposition loses the mark.
  await placeSteps(harness, ['step_data', 'step_hypothese', 'step_conclusies']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM013 scores 0 when the candidate places only some of the steps', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await placeSteps(harness, ['step_hypothese', 'step_data']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM013 scores 0 when nothing is placed', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

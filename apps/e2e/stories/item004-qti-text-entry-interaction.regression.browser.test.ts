import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { exportAssessmentItemDoc, importItem004 } from './item004-qti-text-entry-interaction.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM004-editor.xml?raw';

test('exported QTI matches the ITEM004-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem004());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM004-editor.xml');
});

type Frame = Awaited<ReturnType<typeof mountQtiRuntime>>['frame'];

/** Tab commits the value — see finding #4 in docs/testing-findings.md. */
const answer = async (frame: Frame, text: string) => {
  await frame.getByRole('textbox').fill(text);
  await userEvent.tab();
};

// ITEM004 is a numeric text-entry; the correct response is the string '44'.
test('ITEM004 scores 1 when the candidate types the correct number', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, '44');

  expect(harness.response()).toBe('44');
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM004 scores 0 for a wrong number', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, '45');

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM004 scores 0 for an empty answer', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, '');

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM004 lets the candidate correct a wrong answer before submitting', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, '45');
  expect(harness.score()).toBe(0);

  await answer(harness.frame, '44');

  expect(harness.response()).toBe('44');
  expect(harness.score()).toBe(1);

  harness.destroy();
});

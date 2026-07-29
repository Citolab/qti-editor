import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { exportAssessmentItemDoc, importItem005 } from './qti-extended-text-interaction-item005.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM005-editor.xml?raw';

test('exported QTI matches the ITEM005-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem005());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM005-editor.xml');
});

test('ITEM005 records what the candidate writes but never auto-scores it', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // Extended-text is human-graded: the editor deliberately emits NO
  // <qti-response-processing>, so SCORE must stay at its default 0 no matter
  // what the candidate writes.
  await harness.frame.getByRole('textbox').fill('Een uitgebreid antwoord van de kandidaat.');
  await userEvent.tab();

  expect(harness.response()).toBe('Een uitgebreid antwoord van de kandidaat.');
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM005 still scores 0 when the candidate writes nothing', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM005 exports no response processing and keeps its scoring rubric', () => {
  const exported = exportAssessmentItemDoc(importItem005());

  // The absence of response-processing is the contract that makes this item
  // human-graded — if a future change starts emitting a template here, every
  // extended-text item would silently begin auto-scoring 0.
  expect(exported.querySelector('qti-response-processing')).toBeNull();

  // The scoring guidance for the human marker survives the roundtrip.
  const rubric = exported.querySelector('qti-rubric-block[use="scoring"]');
  expect(rubric).not.toBeNull();
  expect(rubric?.getAttribute('view')).toBe('scorer');
  expect(rubric?.textContent?.trim()).not.toBe('');
});

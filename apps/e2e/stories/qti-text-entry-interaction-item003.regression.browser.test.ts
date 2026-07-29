import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { exportAssessmentItemDoc, importItem003 } from './qti-text-entry-interaction-item003.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM003-editor.xml?raw';

test('exported QTI matches the ITEM003-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem003());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM003-editor.xml');
});

type Frame = Awaited<ReturnType<typeof mountQtiRuntime>>['frame'];

/**
 * Types into the text-entry input and commits the value.
 *
 * The trailing Tab is REQUIRED, not ceremony: the component only pushes its
 * value into the response variable on blur/change, so filling alone leaves
 * RESPONSE unset and the item scores 0. See finding #4 in
 * docs/testing-findings.md.
 */
const answer = async (frame: Frame, text: string) => {
  await frame.getByRole('textbox').fill(text);
  await userEvent.tab();
};

test('ITEM003 scores 1 when the candidate types the correct answer', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, 'refractie');

  expect(harness.response()).toBe('refractie');
  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM003 scores 0 for a wrong answer', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, 'diffractie');

  expect(harness.response()).toBe('diffractie');
  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM003 scores 1 regardless of case — the map entry is case-insensitive', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // qti-map-entry carries case-sensitive="false", so "Refractie" must still score.
  await answer(harness.frame, 'Refractie');

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM003 scores 0 for an empty answer', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await answer(harness.frame, '');

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM003 no longer accepts the alternative answer "breking" — it is dropped on export', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // REGRESSION MARKER, not desired behaviour.
  //
  // The source item (public/qti/kennisnet/ITEM003.xml) declares TWO accepted
  // answers:
  //   <qti-map-entry map-key="breking"   mapped-value="1"/>
  //   <qti-map-entry map-key="refractie" mapped-value="1"/>
  // The editor's export keeps only "refractie" (and drops lower-bound="0"), so a
  // candidate answering "breking" scored 1 before the item passed through the
  // editor and scores 0 afterwards.
  //
  // This assertion pins the CURRENT lossy behaviour so the loss is visible in
  // the suite instead of frozen silently inside the XML snapshot. When the
  // export preserves every map entry, flip this to toBe(1).
  // See finding #6 in docs/testing-findings.md.
  await answer(harness.frame, 'breking');

  expect(harness.score()).toBe(0);

  harness.destroy();
});

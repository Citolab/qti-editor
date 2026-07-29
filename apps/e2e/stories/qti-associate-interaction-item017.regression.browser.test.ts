import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem017 } from './qti-associate-interaction-item017.regression.stories';
import { mountQtiRuntime, stageResponse } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM017-editor.xml?raw';

test('exported QTI matches the ITEM017-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem017());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM017-editor.xml');
});

// ITEM017 pairs up comic duos. Associate is UNORDERED: "A O" and "O A" are the
// same association, which is what separates it from the directedPair items.
const CORRECT = ['A O', 'S W', 'T B'];

test('ITEM017 scores 1 when all three duos are paired', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT);

  expect(harness.score()).toBe(1);

  harness.destroy();
});

test('ITEM017 does NOT accept reversed pairs — base-type is downgraded on export', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // REGRESSION MARKER, not desired behaviour.
  //
  // The source item declares:
  //   <qti-response-declaration ... cardinality="multiple" base-type="pair">
  // but the editor exports:
  //   <qti-response-declaration ... cardinality="multiple" base-type="identifier">
  //
  // A QTI `pair` is UNORDERED — "A O" and "O A" are the same association — so a
  // candidate who links Obelix to Asterix should score exactly like one who
  // links Asterix to Obelix. As `identifier`, the values become opaque strings
  // and the reversed form no longer matches. (An identifier containing a space
  // is also not valid QTI in its own right.)
  //
  // This pins the CURRENT broken behaviour so it is visible in the suite. When
  // the export preserves base-type="pair", flip this to toBe(1).
  // See finding #15 in docs/testing-findings.md.
  stageResponse(harness, ['O A', 'W S', 'B T']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM017 exports the response declaration with the wrong base-type', () => {
  const declaration = exportAssessmentItemDoc(importItem017()).querySelector(
    'qti-response-declaration[identifier="RESPONSE"]',
  );

  // Pins the root cause directly, so the reason the test above expects 0 is
  // greppable from the declaration itself rather than only from runtime scoring.
  expect(declaration?.getAttribute('cardinality')).toBe('multiple');
  expect(declaration?.getAttribute('base-type')).toBe('identifier'); // should be 'pair'
});

test('ITEM017 scores 0 when characters are paired across duos', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, ['A W', 'S O', 'T B']);

  expect(harness.score()).toBe(0);

  harness.destroy();
});

test('ITEM017 scores 0 when only some duos are paired', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  stageResponse(harness, CORRECT.slice(0, 2));

  expect(harness.score()).toBe(0);

  harness.destroy();
});

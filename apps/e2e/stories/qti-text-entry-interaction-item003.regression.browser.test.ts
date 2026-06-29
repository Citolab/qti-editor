import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem003 } from './qti-text-entry-interaction-item003.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM003-editor.xml?raw';

test('exported QTI matches the ITEM003-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem003());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM003-editor.xml');
});

test('ITEM003 snapshot scores 1 in the runtime when the correct response is staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM003 correct response is the string 'refractie' (text-entry).
  // updateResponseVariable bypasses the UI — typing cross-realm into a
  // contenteditable input would need trusted events; the API stages the
  // same final value the UI would produce.
  ai.updateResponseVariable('RESPONSE', 'refractie');
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

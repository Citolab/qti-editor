import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem005 } from './qti-extended-text-interaction-item005.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM005-editor.xml?raw';

test('exported QTI matches the ITEM005-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem005());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM005-editor.xml');
});

test('ITEM005 snapshot has no auto-scoring — runtime SCORE stays at default 0', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // Stage a non-empty response, run processResponse — SCORE must stay 0 because
  // extended-text intentionally has no <qti-response-processing> (human-graded).
  ai.updateResponseVariable('RESPONSE', 'a sample free-form response');
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(0);

  harness.destroy();
});

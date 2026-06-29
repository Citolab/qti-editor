import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem004 } from './qti-text-entry-interaction-item004.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM004-editor.xml?raw';

test('exported QTI matches the ITEM004-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem004());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM004-editor.xml');
});

test('ITEM004 snapshot scores 1 in the runtime when the correct response is staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM004 correct response is the string '44' (text-entry).
  ai.updateResponseVariable('RESPONSE', '44');
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

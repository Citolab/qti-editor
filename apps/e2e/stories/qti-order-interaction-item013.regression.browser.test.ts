import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem013 } from './qti-order-interaction-item013.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM013-editor.xml?raw';

test('exported QTI matches the ITEM013-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem013());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM013-editor.xml');
});

test('ITEM013 snapshot scores 1 in the runtime when the correct order is staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM013 is an ordered identifier list.
  ai.updateResponseVariable('RESPONSE', ['step_hypothese', 'step_data', 'step_conclusies']);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

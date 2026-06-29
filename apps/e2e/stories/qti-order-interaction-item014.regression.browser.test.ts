import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem014 } from './qti-order-interaction-item014.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM014-editor.xml?raw';

test('exported QTI matches the ITEM014-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem014());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM014-editor.xml');
});

test('ITEM014 snapshot scores 1 in the runtime when the correct order is staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  ai.updateResponseVariable('RESPONSE', ['num_1', 'num_sqrt2', 'num_pi']);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem008 } from './qti-match-interaction-item008.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM008-editor.xml?raw';

test('exported QTI matches the ITEM008-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem008());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM008-editor.xml');
});

test('ITEM008 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  ai.updateResponseVariable('RESPONSE', [
    'left_diamond right_ggs',
    'left_harari right_sapiens',
    'left_arendt right_thc',
  ]);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem015 } from './qti-gap-match-interaction-item015.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM015-editor.xml?raw';

test('exported QTI matches the ITEM015-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem015());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM015-editor.xml');
});

test('ITEM015 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM015 is gap-match directedPair multi.
  ai.updateResponseVariable('RESPONSE', ['ht_zuur gap_low', 'ht_basisch gap_high']);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

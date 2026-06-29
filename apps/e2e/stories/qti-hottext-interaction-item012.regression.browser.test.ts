import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem012 } from './qti-hottext-interaction-item012.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM012-editor.xml?raw';

test('exported QTI matches the ITEM012-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem012());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM012-editor.xml');
});

test('ITEM012 snapshot scores 1 in the runtime when both correct hottexts are selected', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM012 is a single-RESPONSE multi-cardinality hottext.
  ai.updateResponseVariable('RESPONSE', ['ht_onderzocht', 'ht_verving']);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

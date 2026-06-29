import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem017 } from './qti-associate-interaction-item017.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM017-editor.xml?raw';

test('exported QTI matches the ITEM017-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem017());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM017-editor.xml');
});

test('ITEM017 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM017 is associate (unordered pair) multi.
  ai.updateResponseVariable('RESPONSE', ['A O', 'S W', 'T B']);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

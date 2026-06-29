import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem007 } from './qti-match-interaction-item007.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM007-editor.xml?raw';

test('exported QTI matches the ITEM007-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem007());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM007-editor.xml');
});

test('ITEM007 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM007 is a directedPair match — response is an array of
  // "source target" pair strings. Three correct pairs:
  ai.updateResponseVariable('RESPONSE', [
    'left_vermogen right_watt',
    'left_druk right_pascal',
    'left_frequentie right_hertz',
  ]);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

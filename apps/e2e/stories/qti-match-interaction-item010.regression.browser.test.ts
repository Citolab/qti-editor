import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem010 } from './qti-match-interaction-item010.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM010-editor.xml?raw';

test('exported QTI matches the ITEM010-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem010());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM010-editor.xml');
});

test('ITEM010 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  ai.updateResponseVariable('RESPONSE', [
    'evenaar juist',
    'helium juist',
    'pluto onjuist',
  ]);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

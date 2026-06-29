import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem009 } from './qti-match-interaction-item009.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM009-editor.xml?raw';

test('exported QTI matches the ITEM009-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem009());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM009-editor.xml');
});

test('ITEM009 snapshot scores 1 in the runtime when the correct pairs are staged', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  ai.updateResponseVariable('RESPONSE', [
    'enzym biologie',
    'mitochondrion biologie',
    'isotoop scheikunde',
    'katalysator scheikunde',
    'molmassa scheikunde',
  ]);
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

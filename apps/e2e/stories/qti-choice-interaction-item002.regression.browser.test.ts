import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem002 } from './qti-choice-interaction-item002.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM002-editor.xml?raw';

test('exported QTI matches the ITEM002-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem002());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM002-editor.xml');
});

test('ITEM002 snapshot scores 1 in the runtime when all correct choices are clicked', async () => {
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM002 correct responses are choice1, choice2, choice4 (multi cardinality).
  for (const id of ['choice1', 'choice2', 'choice4']) {
    harness.doc
      .querySelector(`qti-simple-choice[identifier="${id}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }

  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

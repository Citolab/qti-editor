import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem011 } from './qti-hottext-interaction-item011.regression.stories';

test('exported QTI matches the ITEM011-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem011());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM011-editor.xml');
});

// Skipped — see the comment on this test for the upstream limitation.
test.skip('ITEM011 snapshot scores in the runtime when all 3 hottext blanks have the correct answer', async () => {
  // Upstream limitation: @citolab/qti-components' qti-match.getVariables()
  // throws "Cannot read properties of undefined (reading 'variables')" for
  // any item whose response-processing is *written out* in the assessment
  // item rather than referenced via the standard match_correct template URL.
  // ITEM011 has 3 RESPONSE declarations → the composer writes the
  // response-processing inline → the runtime can't score it.
  //
  // The snapshot test above still catches editor-side pipeline regressions.
  // Re-enable this test once the upstream qti-match expression resolves its
  // context for written-out response-processing trees.
});

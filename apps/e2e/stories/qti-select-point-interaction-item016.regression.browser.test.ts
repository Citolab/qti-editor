import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem016 } from './qti-select-point-interaction-item016.regression.stories';

test('exported QTI matches the ITEM016-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem016());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM016-editor.xml');
});

test.skip('ITEM016 snapshot scores in the runtime via select-point area mapping', async () => {
  // ITEM016 uses select-point with area mapping (map_response_point template)
  // — scoring depends on the click coordinates falling inside a defined area.
  // The source XML has an empty <qti-correct-response>; the score comes from
  // the area-map definitions, not from comparing exact points. Re-enable when
  // we author a coordinate-aware staging helper.
});

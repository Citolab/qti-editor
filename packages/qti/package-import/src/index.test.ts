import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { getOrderedItemHrefs } from './index';

const itemXml = (identifier: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${identifier}" title="${identifier}">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier" />
  <qti-item-body><p>${identifier}</p></qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>`;

describe('getOrderedItemHrefs', () => {
  it('uses assessment-test item ref order when available', async () => {
    const zip = new JSZip();
    zip.file('imsmanifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <resources>
    <resource identifier="item-a" type="imsqti_item_xmlv3p0" href="items/a.xml" />
    <resource identifier="item-b" type="imsqti_item_xmlv3p0" href="items/b.xml" />
  </resources>
</manifest>`);
    zip.file('assessment-test.xml', `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test>
  <qti-test-part>
    <qti-assessment-section>
      <qti-assessment-item-ref identifier="item-b" href="items/b.xml" />
      <qti-assessment-item-ref identifier="item-a" href="items/a.xml" />
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`);
    zip.file('items/a.xml', itemXml('a'));
    zip.file('items/b.xml', itemXml('b'));

    await expect(getOrderedItemHrefs(zip)).resolves.toEqual(['items/b.xml', 'items/a.xml']);
  });

  it('falls back to manifest item resources', async () => {
    const zip = new JSZip();
    zip.file('imsmanifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <resources>
    <resource identifier="item-a" type="imsqti_item_xmlv3p0" href="items/a.xml" />
    <resource identifier="item-b" type="imsqti_item_xmlv3p0" href="items/b.xml" />
  </resources>
</manifest>`);
    zip.file('items/a.xml', itemXml('a'));
    zip.file('items/b.xml', itemXml('b'));

    await expect(getOrderedItemHrefs(zip)).resolves.toEqual(['items/a.xml', 'items/b.xml']);
  });

  it('falls back to package XML files when no manifest is present', async () => {
    const zip = new JSZip();
    zip.file('items/b.xml', itemXml('b'));
    zip.file('items/a.xml', itemXml('a'));

    await expect(getOrderedItemHrefs(zip)).resolves.toEqual(['items/a.xml', 'items/b.xml']);
  });
});

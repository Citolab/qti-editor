import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createQtiPackageFromItems } from './index.js';

const itemXml = (identifier: string, body = '<p>Question</p>') => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${identifier}" title="${identifier}" adaptive="false" time-dependent="false">
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

async function unzip(blob: Blob) {
  return JSZip.loadAsync(await blob.arrayBuffer());
}

describe('createQtiPackageFromItems', () => {
  it('creates a QTI 3 package with one item', async () => {
    const zip = await unzip(await createQtiPackageFromItems([
      { identifier: 'item-1', title: 'Item 1', xml: itemXml('item-1') },
    ], { identifier: 'demo' }));

    const manifest = await zip.file('imsmanifest.xml')?.async('string');
    const assessmentTest = await zip.file('assessment-test.xml')?.async('string');
    const item = await zip.file('items/item-1.xml')?.async('string');

    expect(manifest).toContain('type="imsqti_test_xmlv3p0"');
    expect(manifest).toContain('type="imsqti_item_xmlv3p0"');
    expect(manifest).not.toContain('imsqti_item_xmlv2p');
    expect(assessmentTest).toContain('<qti-assessment-test');
    expect(assessmentTest).toContain('href="items/item-1.xml"');
    expect(item).toContain('identifier="item-1"');
  });

  it('creates item refs for multiple items', async () => {
    const zip = await unzip(await createQtiPackageFromItems([
      { identifier: 'item-1', title: 'Item 1', xml: itemXml('item-1') },
      { identifier: 'item-2', title: 'Item 2', xml: itemXml('item-2') },
    ], { identifier: 'demo' }));

    const assessmentTest = await zip.file('assessment-test.xml')?.async('string');

    expect(zip.file('items/item-1.xml')).not.toBeNull();
    expect(zip.file('items/item-2.xml')).not.toBeNull();
    expect(assessmentTest).toContain('href="items/item-1.xml"');
    expect(assessmentTest).toContain('href="items/item-2.xml"');
  });

  it('extracts base64 images into assets', async () => {
    const png = 'iVBORw0KGgo=';
    const zip = await unzip(await createQtiPackageFromItems([
      {
        identifier: 'image-item',
        title: 'Image Item',
        xml: itemXml('image-item', `<img src="data:image/png;base64,${png}" alt="Map" />`),
      },
    ], { identifier: 'demo' }));

    const item = await zip.file('items/image-item.xml')?.async('string');
    const manifest = await zip.file('imsmanifest.xml')?.async('string');
    const asset = zip.file('assets/image-item-image-1.png');

    expect(asset).not.toBeNull();
    expect(item).toContain('src="../assets/image-item-image-1.png"');
    expect(manifest).toContain('type="associatedcontent/learning-application-resource"');
    expect(manifest).toContain('href="assets/image-item-image-1.png"');
  });

  it('passes interaction XML through without rewriting attributes', async () => {
    const zip = await unzip(await createQtiPackageFromItems([
      {
        identifier: 'editor-data-item',
        title: 'Editor Data Item',
        xml: itemXml('editor-data-item', `
          <qti-choice-interaction response-identifier="CHOICE" correct-response="choice-a" score="2">
            <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
          </qti-choice-interaction>
          <p>
            <qti-text-entry-interaction
              response-identifier="TEXT"
              correct-response="alpha,beta"
              score="3" />
          </p>
          <qti-extended-text-interaction response-identifier="EXTENDED" correct-response="Model answer" score="4" />
        `),
      },
    ], { identifier: 'demo' }));

    const item = await zip.file('items/editor-data-item.xml')?.async('string');

    // The package builder emits standard QTI 3.0 with no data-* mirrors.
    expect(item).not.toContain('data-correct-response');
    expect(item).not.toContain('data-score');
    expect(item).toContain('correct-response="choice-a"');
    expect(item).toContain('correct-response="alpha,beta"');
    expect(item).toContain('correct-response="Model answer"');
  });
});

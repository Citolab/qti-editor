/**
 * What `roundtripXmlToPm` makes of the item body's non-element nodes.
 *
 * It rebuilds the XML tree as HTML node by node, and only text and CDATA are content. A comment or
 * processing instruction has no place in a ProseMirror document; rebuilt as a text node it showed
 * up as a paragraph of its own text, and was saved back into the item as content.
 *
 * Through `importItemFromString` and back out through `exportItemXml`, because that is the path an
 * author's file takes.
 */
import { createEditor } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../integration/interactions/prosekit.js';
import { exportItemXml, importItemFromString } from '../../item-roundtrip/index.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const item = (body: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Comments">
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

/** The document's top-level blocks as `type: text`. */
const blocks = (doc: PmNode): string[] => {
  const found: string[] = [];
  doc.forEach(node => found.push(`${node.type.name}: ${node.textContent}`));
  return found;
};

describe('roundtripXmlToPm and non-element nodes', () => {
  test('a comment between blocks does not become a paragraph', () => {
    const doc = importItemFromString(item('<p>Eerste</p><!-- author note --><p>Tweede</p>'), schema);

    expect(blocks(doc)).toEqual(['paragraph: Eerste', 'paragraph: Tweede']);
  });

  test('a comment inside a paragraph does not become text', () => {
    const doc = importItemFromString(item('<p>Een <!-- check this -->zin.</p>'), schema);

    expect(blocks(doc)).toEqual(['paragraph: Een zin.']);
  });

  test('a processing instruction does not become text', () => {
    const doc = importItemFromString(item('<p>Een <?editor hint?>zin.</p>'), schema);

    expect(blocks(doc)).toEqual(['paragraph: Een zin.']);
  });

  test('CDATA is still text', () => {
    const doc = importItemFromString(item('<p><![CDATA[a < b]]></p>'), schema);

    expect(blocks(doc)).toEqual(['paragraph: a < b']);
  });

  test('the comment is not written back as content', () => {
    const doc = importItemFromString(item('<p>Eerste</p><!-- author note --><p>Tweede</p>'), schema);

    expect(exportItemXml(doc, schema)).not.toContain('author note');
  });
});

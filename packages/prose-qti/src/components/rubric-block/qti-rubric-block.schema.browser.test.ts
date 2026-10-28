/**
 * The rubric block's `class` and `id` through an import and an export.
 *
 * The node used to write `class="qti-rubric-block"` on every block and keep no class or id of its
 * own, so an author's tokens were replaced by the editor's. That is not cosmetic: qti-components
 * reads `qti-rubric-inline` and `qti-rubric-discretionary-placement` from the class to decide where
 * the block renders. Nothing reads `qti-rubric-block` as a class — the editor's CSS and the theme
 * both select the element — so it is no longer written, and dropped from items saved with it.
 *
 * Through `importItemFromString` and `exportItemXml`, the path an author's file takes.
 */
import { createEditor } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../integration/interactions/prosekit.js';
import { exportItemXml, importItemFromString } from '../../item-roundtrip/index.js';

import type { Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const item = (rubricAttrs: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Rubric">
  <qti-item-body>
    <qti-rubric-block use="instructions" view="candidate"${rubricAttrs}>
      <qti-content-body><p>Lees de tekst.</p></qti-content-body>
    </qti-rubric-block>
  </qti-item-body>
</qti-assessment-item>`;

/** Import `item(rubricAttrs)`, export it again, and return the exported rubric block. */
function roundTrip(rubricAttrs: string): Element {
  const doc = importItemFromString(item(rubricAttrs), schema);
  const exported = new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');
  const rubric = exported.querySelector('qti-rubric-block');
  if (!rubric) throw new Error('no rubric block in the export');
  return rubric;
}

describe('qti-rubric-block class and id', () => {
  test("the author's class and id survive a round trip", () => {
    const rubric = roundTrip(' class="qti-rubric-inline intro" id="rubric-intro"');

    expect(rubric.getAttribute('class')).toBe('qti-rubric-inline intro');
    expect(rubric.getAttribute('id')).toBe('rubric-intro');
    expect(rubric.getAttribute('use')).toBe('instructions');
    expect(rubric.getAttribute('view')).toBe('candidate');
  });

  test('a block without a class is written without one', () => {
    const rubric = roundTrip('');

    expect(rubric.hasAttribute('class')).toBe(false);
    expect(rubric.hasAttribute('id')).toBe(false);
  });

  test('the class an earlier export wrote is dropped, the rest kept', () => {
    expect(roundTrip(' class="qti-rubric-block"').hasAttribute('class')).toBe(false);
    expect(roundTrip(' class="qti-rubric-block qti-rubric-inline"').getAttribute('class')).toBe('qti-rubric-inline');
  });
});

/**
 * The rubric block's `class` through an import and an export (`importItemFromString` and
 * `exportItemXml`, the path an author's file takes). Why it matters: see `qti-rubric-block.schema.ts`.
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

describe('qti-rubric-block class', () => {
  test("the author's class survives a round trip", () => {
    const rubric = roundTrip(' class="qti-rubric-inline intro"');

    expect(rubric.getAttribute('class')).toBe('qti-rubric-inline intro');
    expect(rubric.getAttribute('use')).toBe('instructions');
    expect(rubric.getAttribute('view')).toBe('candidate');
  });

  test('a block without a class is written without one', () => {
    expect(roundTrip('').hasAttribute('class')).toBe(false);
  });

  test('the class an earlier export wrote is dropped, the rest kept', () => {
    expect(roundTrip(' class="qti-rubric-block"').hasAttribute('class')).toBe(false);
    expect(roundTrip(' class="qti-rubric-block qti-rubric-inline"').getAttribute('class')).toBe('qti-rubric-inline');
  });
});

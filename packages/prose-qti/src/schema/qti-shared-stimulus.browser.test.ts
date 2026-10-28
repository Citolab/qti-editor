/**
 * The shared-stimulus placeholder survives import and export, in both schemas, and never becomes a
 * filler. Before the node existed the div matched no rule and was dropped on import.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const PLACEHOLDER = '<div class="qti-shared-stimulus" data-stimulus-idref="Stimulus1"></div>';

const ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="STIM" title="Stimulus" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-assessment-stimulus-ref identifier="Stimulus1" href="stimulus.xml"/>
  <qti-item-body>
    ${PLACEHOLDER}
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A">Yes</qti-simple-choice>
      <qti-simple-choice identifier="B">No</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const plainSchema: Schema = createQtiSchema();
const prosekitSchema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

describe('the shared-stimulus placeholder', () => {
  test('a QTI item keeps it through qti3ToPm -> pmToQti3, in place and unchanged', () => {
    const doc = qti3ToPm(ITEM);
    expect(doc.firstChild?.type.name).toBe('qtiSharedStimulus');
    expect(doc.firstChild?.attrs).toEqual({ stimulusIdref: 'Stimulus1', class: 'qti-shared-stimulus' });

    const exported = new DOMParser().parseFromString(pmToQti3(doc), 'application/xml');
    const body = exported.getElementsByTagName('qti-item-body')[0];
    const first = body.firstElementChild!;
    expect(first.localName).toBe('div');
    expect(first.getAttribute('class')).toBe('qti-shared-stimulus');
    expect(first.getAttribute('data-stimulus-idref')).toBe('Stimulus1');
    expect(first.attributes).toHaveLength(2);
    expect(first.childNodes).toHaveLength(0);
    expect(first.nextElementSibling?.localName).toBe('qti-choice-interaction');
  });

  test.each([
    ['createQtiSchema', plainSchema],
    ['defineQtiExtension', prosekitSchema],
  ])('%s parses and serialises it unchanged', (_name, schema) => {
    const host = document.createElement('div');
    host.innerHTML = PLACEHOLDER;
    const node = PmDOMParser.fromSchema(schema).parseSlice(host).content.firstChild!;
    expect(node.type.name).toBe('qtiSharedStimulus');

    const out = document.createElement('div');
    out.appendChild(DOMSerializer.fromSchema(schema).serializeNode(node, { document }));
    expect(out.innerHTML).toBe(PLACEHOLDER);
  });

  test('a class other than qti-shared-stimulus is kept, and no class is not invented', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="reading wide" data-stimulus-idref="S2"></div><div data-stimulus-idref="S3"></div>';
    const slice = PmDOMParser.fromSchema(plainSchema).parseSlice(host).content;
    const out = document.createElement('div');
    out.appendChild(DOMSerializer.fromSchema(plainSchema).serializeFragment(slice, { document }));
    expect(out.innerHTML).toBe(host.innerHTML);
  });

  test('a layout div without the attribute is still a layout div', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="qti-layout-row"><p>x</p></div>';
    expect(PmDOMParser.fromSchema(plainSchema).parseSlice(host).content.firstChild?.type.name).toBe('qtiLayoutDiv');
  });

  test('it is never chosen to fill an empty container', () => {
    // It is in `block`, so a lookup that takes the first member of the group could pick it. The
    // required `stimulusIdref` is what rules it out of `defaultType`; asserted, not assumed.
    expect(prosekitSchema.nodes.doc.createAndFill()?.firstChild?.type.name).toBe('paragraph');
    expect(prosekitSchema.nodes.tableCell.createAndFill()?.firstChild?.type.name).toBe('paragraph');
    for (const schema of [plainSchema, prosekitSchema]) {
      for (const type of Object.values(schema.nodes)) {
        expect(type.contentMatch.defaultType?.name, `${type.name} fills with the placeholder`).not.toBe(
          'qtiSharedStimulus',
        );
      }
    }
  });
});

/**
 * The shared-stimulus placeholder survives import and export, in both schemas, and never becomes a
 * filler. Before the node existed the div matched no rule and was dropped on import.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, test } from 'vitest';

import '../core-css/core-css.css';

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

const parseHtml = (schema: Schema, html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return PmDOMParser.fromSchema(schema).parseSlice(host).content;
};

const roundTripHtml = (schema: Schema, html: string) => {
  const out = document.createElement('div');
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(parseHtml(schema, html), { document }));
  return out.innerHTML;
};

const typeNamesIn = (schema: Schema, html: string) => {
  const names: string[] = [];
  parseHtml(schema, html).descendants(node => {
    names.push(node.type.name);
  });
  return names;
};

describe('the shared-stimulus placeholder', () => {
  test('a QTI item keeps it through qti3ToPm -> pmToQti3, in place and unchanged', () => {
    const doc = qti3ToPm(ITEM);
    expect(doc.firstChild?.type.name).toBe('qtiSharedStimulus');
    expect(doc.firstChild?.attrs).toEqual({ stimulusIdref: 'Stimulus1', class: 'qti-shared-stimulus', id: null, data: null });

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

  test.each([
    ['createQtiSchema', plainSchema],
    ['defineQtiExtension', prosekitSchema],
  ])('%s keeps id and the other data-* attributes, in order', (_name, schema) => {
    // Cito items carry more on the slot than the idref (qti-components' qb-stimulusref.xml).
    const html =
      '<div class="qti-shared-stimulus" id="slot-1" data-stimulus-idref="S1" data-dep-dialog-height="600" data-dep-dialog-width="800"></div>';
    expect(roundTripHtml(schema, html)).toBe(html);
    expect(parseHtml(schema, html).firstChild?.attrs).toEqual({
      stimulusIdref: 'S1',
      class: 'qti-shared-stimulus',
      id: 'slot-1',
      data: { 'data-dep-dialog-height': '600', 'data-dep-dialog-width': '800' },
    });
  });

  test('whitespace inside the div still counts as empty', () => {
    const node = parseHtml(plainSchema, '<div data-stimulus-idref="S1">\n    </div>').firstChild;
    expect(node?.type.name).toBe('qtiSharedStimulus');
  });

  test.each([
    ['createQtiSchema', plainSchema],
    ['defineQtiExtension', prosekitSchema],
  ])('%s does not turn a div with content into the atom, so the content is kept', (_name, schema) => {
    // From qti-components' api/biologie/items/32cdpg.xml: a Cito dialog trigger, not a slot. As an
    // atom its image would be deleted.
    const trigger = typeNamesIn(
      schema,
      '<div class="dep-dialogTrigger" data-stimulus-idref="WIN_1"><img src="doc.jpg" alt="" width="50" height="50"></div>',
    );
    expect(trigger).not.toContain('qtiSharedStimulus');
    expect(trigger).toContain('image');

    // From qb-stimulusref.xml: a slot holding placeholder text. The text is kept; the runtime empties
    // the slot before it loads the stimulus, but that is the runtime's call, not the importer's.
    const placeholder = parseHtml(
      schema,
      '<div class="qti-shared-stimulus" data-stimulus-idref="S1" data-dep-dialog-height="600">Placeholder stimulus target</div>',
    );
    expect(placeholder.textBetween(0, placeholder.size)).toBe('Placeholder stimulus target');
    expect(typeNamesIn(schema, '<div data-stimulus-idref="S1">text</div>')).not.toContain('qtiSharedStimulus');
  });

  test.each([
    ['createQtiSchema', plainSchema],
    ['defineQtiExtension', prosekitSchema],
  ])('%s keeps the slot in its layout column', (_name, schema) => {
    // The usual Cito shape. The ProseKit path had no qtiLayoutDiv until defineQtiBaseNodesExtension,
    // so it kept the slot and dropped the grid around it.
    const html =
      '<div class="qti-layout-row"><div class="qti-layout-col6"><div class="qti-shared-stimulus" data-stimulus-idref="S1"></div></div><div class="qti-layout-col6"><p>Question</p></div></div>';
    expect(roundTripHtml(schema, html)).toBe(html);
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
    expect(prosekitSchema.nodes.qtiLayoutDiv.createAndFill()?.firstChild?.type.name).toBe('paragraph');
    for (const schema of [plainSchema, prosekitSchema]) {
      for (const type of Object.values(schema.nodes)) {
        expect(type.contentMatch.defaultType?.name, `${type.name} fills with the placeholder`).not.toBe(
          'qtiSharedStimulus',
        );
        // The layout div is new to the ProseKit schema; nothing, itself included, may fill with it.
        expect(type.contentMatch.defaultType?.name, `${type.name} fills with a layout div`).not.toBe('qtiLayoutDiv');
      }
    }
  });
});

describe('the placeholder in the editor', () => {
  test('is drawn as a labelled box, not as a 0px div', () => {
    // core-css.css's editor-only affordance. Without it the empty atom had no height, so an author
    // could select and delete it without ever seeing it.
    const host = document.body.appendChild(document.createElement('div'));
    const doc = plainSchema.nodes.doc.create({ identifier: 'I', title: 'T' }, [
      plainSchema.nodes.qtiSharedStimulus.create({ stimulusIdref: 'Stimulus1', class: 'qti-shared-stimulus' }),
      plainSchema.nodes.paragraph.create(null, plainSchema.text('Question')),
    ]);
    const view = new EditorView(host, { state: EditorState.create({ doc }) });
    try {
      const slot = host.querySelector<HTMLElement>('div[data-stimulus-idref]')!;
      expect(slot.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(getComputedStyle(slot).borderTopStyle).toBe('dashed');
      expect(getComputedStyle(slot, '::before').content).toBe('"Shared stimulus: Stimulus1"');
    } finally {
      view.destroy();
      host.remove();
    }
  });
});

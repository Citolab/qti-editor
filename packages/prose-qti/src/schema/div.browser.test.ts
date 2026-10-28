/**
 * `<div>` in an item, through a full load → save, in both schemas: `createQtiSchema()` (the roundtrip
 * schema, and the Node conversion's) and the ProseKit one (`defineQtiExtension()`). Before, a div no
 * rule owned was unwrapped (its class and id lost), and a `<div>` of text came back as a `<p>`, also
 * inside a choice or a prompt.
 */
import { createEditor, defineNodeSpec, union } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { listInteractionSchemaNodeSpecs } from '../core/interactions/composer.js';
import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { createQtiSchema } from './create-qti-schema.js';
import { QTI_INLINE_ELEMENTS } from './qti-inline-elements.js';
import { qtiLayoutDivNodeSpec } from './qti-layout-div.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const SCHEMAS: ReadonlyArray<readonly [string, Schema]> = [
  ['createQtiSchema()', createQtiSchema()],
  ['the ProseKit schema', createEditor({ extension: defineQtiExtension() }).schema],
];

const CHOICE =
  '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">' +
  '<qti-simple-choice identifier="A">Maas</qti-simple-choice>' +
  '<qti-simple-choice identifier="B">Waal</qti-simple-choice>' +
  '</qti-choice-interaction>';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Item" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>B</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const classesOf = (doc: Document, selector: string) =>
  Array.from(doc.querySelectorAll(selector)).map(element => element.getAttribute('class'));
/** Text content, without the export's pretty-printing whitespace. */
const textsOf = (doc: Document, selector: string) =>
  Array.from(doc.querySelectorAll(selector)).map(element => element.textContent?.replace(/\s+/g, ' ').trim());

describe.each(SCHEMAS)('in %s', (_label, schema) => {
  const roundtrip = (body: string): Document =>
    new DOMParser().parseFromString(pmToQti3(qti3ToPm(item(body), { schema }), { schema }), 'application/xml');

  describe('a div of blocks with a class, id or language survives load → save', () => {
    test.each([
      ['around paragraphs', '<div class="foo"><p>a</p><p>b</p></div>', 'qti-item-body > div', ['foo']],
      ['nested', '<div class="a"><div class="b"><p>x</p></div></div>', 'qti-item-body div', ['a', 'b']],
      ['around an interaction', `<div class="qti-bordered"><p>Vraag</p>${CHOICE}</div>`, 'qti-item-body > div', ['qti-bordered']],
      [
        'inside a rubric block',
        '<qti-rubric-block use="scoring" view="scorer"><qti-content-body><div class="kader"><p>x</p></div></qti-content-body></qti-rubric-block>',
        'qti-rubric-block div',
        ['kader'],
      ],
    ])('%s', (_name, body, selector, expected) => {
      expect(classesOf(roundtrip(body.includes('qti-choice') ? body : body + CHOICE), selector)).toEqual(expected);
    });

    test('with an id and a language', () => {
      const doc = roundtrip(`<div id="k1" lang="fr"><p id="p1">a</p></div>${CHOICE}`);
      const div = doc.querySelector('qti-item-body > div');
      expect([div?.getAttribute('id'), div?.getAttribute('lang')]).toEqual(['k1', 'fr']);
    });

    test('a bare div of blocks is still unwrapped', () => {
      const doc = roundtrip(`<div><p>a</p><p>b</p></div>${CHOICE}`);
      expect(doc.querySelectorAll('qti-item-body > div')).toHaveLength(0);
      expect(textsOf(doc, 'qti-item-body > p')).toEqual(['a', 'b']);
    });
  });

  describe('a div of text stays a div', () => {
    test('in the body, as the children of a styled div, and inside a choice and a prompt', () => {
      const choice = CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt><div>Kies</div></qti-prompt>').replace(
        '>Maas<',
        '><div class="optie">option A</div><',
      );
      const doc = roundtrip(`<div class="flex"><div>left</div><div>right <strong>vet</strong></div></div><div>los</div>${choice}`);

      expect(textsOf(doc, 'div.flex > div')).toEqual(['left', 'right vet']);
      expect(textsOf(doc, 'qti-item-body > div')).toEqual(['left right vet', 'los']);
      expect(textsOf(doc, 'qti-simple-choice > div.optie')).toEqual(['option A']);
      expect(textsOf(doc, 'qti-prompt > div')).toEqual(['Kies']);
      // No `<p>` was added around, or instead of, any of them.
      expect(doc.querySelectorAll('div > p, qti-prompt > p, qti-simple-choice[identifier="A"] > p')).toHaveLength(0);
    });

    test.each([
      ['a text entry', '<qti-text-entry-interaction response-identifier="RESPONSE"></qti-text-entry-interaction>', 'qti-text-entry-interaction'],
      [
        'an inline choice',
        '<qti-inline-choice-interaction response-identifier="RESPONSE"><qti-inline-choice identifier="A">a</qti-inline-choice></qti-inline-choice-interaction>',
        'qti-inline-choice-interaction',
      ],
    ])('with %s in it', (_name, inline, tag) => {
      const doc = roundtrip(`<div>Vul in: ${inline}</div>`);
      expect(doc.querySelector(`qti-item-body > div > ${tag}`)).not.toBeNull();
      expect(doc.querySelector('qti-item-body > div > p')).toBeNull();
    });
  });

  describe('the div is never the filler for empty content', () => {
    test.each(['doc', 'div', 'list_item', 'qtiRubricBlock', 'qtiHottextInteraction'])('%s fills with a paragraph', type => {
      expect(schema.nodes[type].contentMatch.defaultType?.name).toBe('paragraph');
    });
  });
});

test('qti-layout-* divs keep going to qtiLayoutDiv in a ProseKit host that registers it', () => {
  const schema = createEditor({
    extension: union(defineQtiExtension(), defineNodeSpec({ name: 'qtiLayoutDiv', ...qtiLayoutDivNodeSpec })),
  }).schema;
  const doc = qti3ToPm(item(`<div class="qti-layout-row"><div class="qti-layout-col6"><div class="kader"><p>x</p></div></div></div>${CHOICE}`), {
    schema,
  });
  const types: string[] = [];
  doc.descendants((node: PmNode) => {
    if (node.type.name === 'qtiLayoutDiv' || node.type.name === 'div') types.push(`${node.type.name}.${node.attrs.class}`);
  });
  expect(types).toEqual(['qtiLayoutDiv.qti-layout-row', 'qtiLayoutDiv.qti-layout-col6', 'div.kader']);
});

test('QTI_INLINE_ELEMENTS names every node the interactions put in a line of text', () => {
  // The `inline` group is what a paragraph admits. `qti-inline-choice` is in it too, but is only
  // valid inside its interaction (docs/testing-findings.md #34), so it is not phrasing content.
  const inlineTags = listInteractionSchemaNodeSpecs()
    .filter(({ name, spec }) => spec.inline && (spec.group ?? '').split(' ').includes('inline') && name !== 'qtiInlineChoice')
    .flatMap(({ spec }) => (spec.parseDOM ?? []).map(rule => ('tag' in rule ? rule.tag : undefined)))
    .filter((tag): tag is string => typeof tag === 'string' && tag.startsWith('qti-'))
    .map(tag => tag.split(/[[.:#\s]/)[0]);
  expect(inlineTags.length).toBeGreaterThan(0);
  for (const tag of inlineTags) expect(QTI_INLINE_ELEMENTS, tag).toContain(tag);
});

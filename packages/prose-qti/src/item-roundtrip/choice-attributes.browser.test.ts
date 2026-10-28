/**
 * QTI attributes of choices and gaps that their node specs did not model, so a load → save round
 * trip dropped them: `fixed` on inline choices, `match-group` on associable choices, gap texts and
 * gaps, `match-min` on gap texts and `required` on gaps.
 *
 * Through the real pipeline (`qti3ToPm` → `pmToQti3`), so the composer is covered too.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Choices">
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

const CASES: { tag: string; within: string; body: (attributes: string) => string }[] = [
  {
    tag: 'qti-inline-choice',
    within: 'qti-inline-choice-interaction',
    body: a => `
      <p>De hoofdstad is
        <qti-inline-choice-interaction response-identifier="RESPONSE" shuffle="true">
          <qti-inline-choice identifier="X" ${a}>Amsterdam</qti-inline-choice>
          <qti-inline-choice identifier="B">Brussel</qti-inline-choice>
        </qti-inline-choice-interaction>.
      </p>`,
  },
  {
    tag: 'qti-simple-associable-choice',
    within: 'qti-match-interaction',
    body: a => `
      <qti-match-interaction response-identifier="RESPONSE">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="X" match-max="1" ${a}>Amsterdam</qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="NL" match-max="1">Nederland</qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction>`,
  },
  {
    tag: 'qti-gap-text',
    within: 'qti-gap-match-interaction',
    body: a => `
      <qti-gap-match-interaction response-identifier="RESPONSE" max-associations="1">
        <qti-gap-text identifier="X" match-max="1" ${a}>Waal</qti-gap-text>
        <p>De <qti-gap identifier="G1"/> stroomt naar zee.</p>
      </qti-gap-match-interaction>`,
  },
  {
    tag: 'qti-gap',
    within: 'qti-gap-match-interaction',
    body: a => `
      <qti-gap-match-interaction response-identifier="RESPONSE" max-associations="1">
        <qti-gap-text identifier="W" match-max="1">Waal</qti-gap-text>
        <p>De <qti-gap identifier="X" ${a}/> stroomt naar zee.</p>
      </qti-gap-match-interaction>`,
  },
];

/** What each element must keep. Values are what an item would write; the test only needs them back. */
const ATTRIBUTES: Record<string, Record<string, string>> = {
  'qti-inline-choice': { fixed: 'true' },
  'qti-simple-associable-choice': { 'match-group': 'NL' },
  'qti-gap-text': { 'match-group': 'G1', 'match-min': '1' },
  'qti-gap': { 'match-group': 'W', required: 'true' },
};

const NODE_TYPES: Record<string, string> = {
  'qti-inline-choice': 'qtiInlineChoice',
  'qti-simple-associable-choice': 'qtiSimpleAssociableChoice',
  'qti-gap-text': 'qtiGapText',
  'qti-gap': 'qtiGap',
};

const spell = (attributes: Record<string, string>) =>
  Object.entries(attributes).map(([name, value]) => `${name}="${value}"`).join(' ');

const exported = (tag: string, body: string): Element => {
  const doc = new DOMParser().parseFromString(pmToQti3(qti3ToPm(item(body))), 'application/xml');
  const element = Array.from(doc.getElementsByTagName(tag)).find(el => el.getAttribute('identifier') === 'X');
  expect(element, tag).toBeDefined();
  return element!;
};

describe('choice-level attributes survive import → export', () => {
  test.each(CASES.map(c => ({ ...c, label: `${c.tag} in ${c.within}` })))('$label', ({ tag, body }) => {
    const element = exported(tag, body(spell(ATTRIBUTES[tag])));
    for (const [name, value] of Object.entries(ATTRIBUTES[tag])) {
      expect(element.getAttribute(name), name).toBe(value);
    }
  });

  // One convention for `match-min` on both choice types: the XSD default 0 is not written.
  test.each(['qti-gap-text', 'qti-simple-associable-choice'])('%s writes match-min="2" and drops match-min="0"', tag => {
    const body = CASES.find(c => c.tag === tag)!.body;
    expect(exported(tag, body('match-min="2"')).getAttribute('match-min')).toBe('2');
    expect(exported(tag, body('match-min="0"')).hasAttribute('match-min')).toBe(false);
  });

  test.each(Object.entries(NODE_TYPES))('a new %s writes none of them', (tag, type) => {
    const schema = createQtiSchema();
    const node = schema.nodes[type].createAndFill({ identifier: 'X' });
    expect(node).not.toBeNull();
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node!, { document }) as HTMLElement;
    for (const name of Object.keys(ATTRIBUTES[tag])) {
      expect(dom.hasAttribute(name), name).toBe(false);
    }
  });
});

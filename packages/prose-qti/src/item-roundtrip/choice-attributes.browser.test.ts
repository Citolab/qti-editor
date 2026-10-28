/**
 * QTI attributes of choices, gaps and hottexts that their node specs did not model, so a load →
 * save round trip dropped them: `class` and `show-hide` everywhere, `match-group` on associable
 * choices, gap texts and gaps, `match-min` on gap texts, `required` on gaps and `fixed` on inline
 * choices. They only have to survive, in the spelling the item used.
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
    tag: 'qti-simple-choice',
    within: 'qti-choice-interaction',
    body: a => `
      <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
        <qti-simple-choice identifier="X" ${a}>Amsterdam</qti-simple-choice>
        <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
      </qti-choice-interaction>`,
  },
  {
    tag: 'qti-simple-choice',
    within: 'qti-order-interaction',
    body: a => `
      <qti-order-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="X" ${a}>Eerst</qti-simple-choice>
        <qti-simple-choice identifier="B">Dan</qti-simple-choice>
      </qti-order-interaction>`,
  },
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
  {
    tag: 'qti-hottext',
    within: 'qti-hottext-interaction',
    body: a => `
      <qti-hottext-interaction response-identifier="RESPONSE" max-choices="1">
        <p>De <qti-hottext identifier="X" ${a}>Waal</qti-hottext> stroomt naar zee.</p>
      </qti-hottext-interaction>`,
  },
];

/** What each element must keep. Values are what an item would write; the test only needs them back. */
const ATTRIBUTES: Record<string, Record<string, string>> = {
  'qti-simple-choice': { class: 'antwoord-breed', 'show-hide': 'show' },
  'qti-inline-choice': { class: 'antwoord-breed', 'show-hide': 'show', fixed: 'true' },
  'qti-simple-associable-choice': { class: 'antwoord-breed', 'show-hide': 'show', 'match-group': 'NL' },
  'qti-gap-text': { class: 'antwoord-breed', 'show-hide': 'show', 'match-group': 'G1', 'match-min': '1' },
  'qti-gap': { class: 'antwoord-breed', 'show-hide': 'show', 'match-group': 'W', required: 'true' },
  'qti-hottext': { class: 'antwoord-breed', 'show-hide': 'show' },
};

const NODE_TYPES: Record<string, string> = {
  'qti-simple-choice': 'qtiSimpleChoice',
  'qti-inline-choice': 'qtiInlineChoice',
  'qti-simple-associable-choice': 'qtiSimpleAssociableChoice',
  'qti-gap-text': 'qtiGapText',
  'qti-gap': 'qtiGap',
  'qti-hottext': 'qtiHottext',
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

  test('qti-gap keeps an explicit required="false"', () => {
    const body = CASES.find(c => c.tag === 'qti-gap')!.body('required="false"');
    expect(exported('qti-gap', body).getAttribute('required')).toBe('false');
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

/**
 * Selection limits and layout attributes the interaction node specs did not model, so a load →
 * save round trip dropped them. Nothing in the editor edits them; they only have to survive, in
 * the spelling the item used — `min-choices="0"` included.
 *
 * Through the real pipeline (`qti3ToPm` → `pmToQti3`), because the composer is part of the path: it
 * used to strip `min-choices="0"` from a choice interaction even once the node kept it.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Limits">
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

const choice = (attributes: string) => `
  <qti-choice-interaction response-identifier="RESPONSE" max-choices="2" ${attributes}>
    <qti-simple-choice identifier="A">Amsterdam</qti-simple-choice>
    <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
  </qti-choice-interaction>`;

const order = (attributes: string) => `
  <qti-order-interaction response-identifier="RESPONSE" ${attributes}>
    <qti-simple-choice identifier="A">Eerst</qti-simple-choice>
    <qti-simple-choice identifier="B">Dan</qti-simple-choice>
    <qti-simple-choice identifier="C">Als laatste</qti-simple-choice>
  </qti-order-interaction>`;

const inlineChoice = (attributes: string) => `
  <p>De hoofdstad is
    <qti-inline-choice-interaction response-identifier="RESPONSE" ${attributes}>
      <qti-inline-choice identifier="A">Amsterdam</qti-inline-choice>
      <qti-inline-choice identifier="B">Brussel</qti-inline-choice>
    </qti-inline-choice-interaction>.
  </p>`;

const CASES = [
  { tag: 'qti-choice-interaction', body: choice, attributes: { 'min-choices': '1', orientation: 'horizontal' } },
  { tag: 'qti-choice-interaction', body: choice, attributes: { 'min-choices': '0' } },
  { tag: 'qti-order-interaction', body: order, attributes: { 'min-choices': '2', 'max-choices': '3' } },
  { tag: 'qti-inline-choice-interaction', body: inlineChoice, attributes: { required: 'true', 'min-choices': '1' } },
  { tag: 'qti-inline-choice-interaction', body: inlineChoice, attributes: { required: 'false', 'min-choices': '0' } },
];

const spell = (attributes: Record<string, string>) =>
  Object.entries(attributes).map(([name, value]) => `${name}="${value}"`).join(' ');

const roundtrip = (tag: string, body: string): Element => {
  const exported = new DOMParser().parseFromString(pmToQti3(qti3ToPm(item(body))), 'application/xml');
  const interaction = exported.getElementsByTagName(tag)[0];
  expect(interaction).toBeDefined();
  return interaction;
};

describe('interaction selection limits survive import → export', () => {
  test.each(CASES.map(c => ({ ...c, label: `${c.tag} ${spell(c.attributes)}` })))('$label', ({ tag, body, attributes }) => {
    const interaction = roundtrip(tag, body(spell(attributes)));
    for (const [name, value] of Object.entries(attributes)) {
      expect(interaction.getAttribute(name), name).toBe(value);
    }
  });

  test.each([
    { type: 'qtiChoiceInteraction', names: ['min-choices', 'orientation'] },
    { type: 'qtiOrderInteraction', names: ['min-choices', 'max-choices'] },
    { type: 'qtiInlineChoiceInteraction', names: ['required', 'min-choices'] },
  ])('a new $type writes none of them', ({ type, names }) => {
    const schema = createQtiSchema();
    const node = schema.nodes[type].createAndFill({ responseIdentifier: 'RESPONSE' });
    expect(node).not.toBeNull();
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node!, { document }) as HTMLElement;
    for (const name of names) {
      expect(dom.hasAttribute(name), name).toBe(false);
    }
  });
});

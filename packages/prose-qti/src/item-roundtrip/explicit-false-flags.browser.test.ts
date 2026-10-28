/**
 * `shuffle` and `fixed` are written only when true, so an item that spelled out `shuffle="false"`
 * or `fixed="false"` lost the attribute on a load → save round trip. Absent and `"false"` mean the
 * same to QTI, but a tool that compares input and output to decide whether the editor can hold an
 * item sees a lost attribute. The node now remembers that the source wrote the flag.
 *
 * Through the real pipeline (`qti3ToPm` → `pmToQti3`), so the composer is covered too.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Flags">
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

const matchSets = (fixed: string) => `
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="X" match-max="1" ${fixed}>Amsterdam</qti-simple-associable-choice>
  </qti-simple-match-set>
  <qti-simple-match-set>
    <qti-simple-associable-choice identifier="NL" match-max="1">Nederland</qti-simple-associable-choice>
  </qti-simple-match-set>`;

/** Each case puts `flag` (an attribute string, possibly empty) on the element under test. */
const CASES: { label: string; tag: string; name: string; type: string; body: (flag: string) => string }[] = [
  {
    label: 'qti-choice-interaction shuffle',
    tag: 'qti-choice-interaction',
    name: 'shuffle',
    type: 'qtiChoiceInteraction',
    body: f => `
      <qti-choice-interaction response-identifier="RESPONSE" max-choices="1" ${f}>
        <qti-simple-choice identifier="A">Amsterdam</qti-simple-choice>
      </qti-choice-interaction>`,
  },
  {
    label: 'qti-order-interaction shuffle',
    tag: 'qti-order-interaction',
    name: 'shuffle',
    type: 'qtiOrderInteraction',
    body: f => `
      <qti-order-interaction response-identifier="RESPONSE" ${f}>
        <qti-simple-choice identifier="A">Eerst</qti-simple-choice>
        <qti-simple-choice identifier="B">Dan</qti-simple-choice>
      </qti-order-interaction>`,
  },
  {
    label: 'qti-match-interaction shuffle',
    tag: 'qti-match-interaction',
    name: 'shuffle',
    type: 'qtiMatchInteraction',
    body: f => `<qti-match-interaction response-identifier="RESPONSE" ${f}>${matchSets('')}</qti-match-interaction>`,
  },
  {
    label: 'tabular qti-match-interaction shuffle',
    tag: 'qti-match-interaction',
    name: 'shuffle',
    type: 'qtiMatchInteractionTabular',
    body: f =>
      `<qti-match-interaction class="qti-match-tabular" response-identifier="RESPONSE" ${f}>${matchSets('')}</qti-match-interaction>`,
  },
  {
    label: 'qti-gap-match-interaction shuffle',
    tag: 'qti-gap-match-interaction',
    name: 'shuffle',
    type: 'qtiGapMatchInteraction',
    body: f => `
      <qti-gap-match-interaction response-identifier="RESPONSE" max-associations="1" ${f}>
        <qti-gap-text identifier="W" match-max="1">Waal</qti-gap-text>
        <p>De <qti-gap identifier="G1"/> stroomt naar zee.</p>
      </qti-gap-match-interaction>`,
  },
  {
    label: 'qti-simple-choice fixed (choice interaction)',
    tag: 'qti-simple-choice',
    name: 'fixed',
    type: 'qtiSimpleChoice',
    body: f => `
      <qti-choice-interaction response-identifier="RESPONSE" max-choices="1" shuffle="true">
        <qti-simple-choice identifier="X" ${f}>Amsterdam</qti-simple-choice>
        <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
      </qti-choice-interaction>`,
  },
  {
    label: 'qti-simple-choice fixed (order interaction)',
    tag: 'qti-simple-choice',
    name: 'fixed',
    type: 'qtiSimpleChoice',
    body: f => `
      <qti-order-interaction response-identifier="RESPONSE" shuffle="true">
        <qti-simple-choice identifier="X" ${f}>Eerst</qti-simple-choice>
        <qti-simple-choice identifier="B">Dan</qti-simple-choice>
      </qti-order-interaction>`,
  },
  {
    label: 'qti-simple-associable-choice fixed',
    tag: 'qti-simple-associable-choice',
    name: 'fixed',
    type: 'qtiSimpleAssociableChoice',
    body: f => `<qti-match-interaction response-identifier="RESPONSE" shuffle="true">${matchSets(f)}</qti-match-interaction>`,
  },
];

/** The flag as exported: the element is the one with identifier X, or the interaction itself. */
const exportedFlag = (tag: string, name: string, body: string): string | null => {
  const doc = new DOMParser().parseFromString(pmToQti3(qti3ToPm(item(body))), 'application/xml');
  const elements = Array.from(doc.getElementsByTagName(tag));
  const element = elements.find(el => el.getAttribute('identifier') === 'X') ?? elements[0];
  expect(element, tag).toBeDefined();
  return element.getAttribute(name);
};

describe('explicit boolean flags survive import → export', () => {
  test.each(CASES)('$label: an authored "false" stays "false"', ({ tag, name, body }) => {
    expect(exportedFlag(tag, name, body(`${name}="false"`))).toBe('false');
  });

  test.each(CASES)('$label: an authored "true" stays "true"', ({ tag, name, body }) => {
    expect(exportedFlag(tag, name, body(`${name}="true"`))).toBe('true');
  });

  test.each(CASES)('$label: stays absent when the source had none', ({ tag, name, body }) => {
    expect(exportedFlag(tag, name, body(''))).toBeNull();
  });

  test.each(CASES)('$label: a new node writes none', ({ name, type }) => {
    const schema = createQtiSchema();
    const node = schema.nodes[type].createAndFill({ identifier: 'X', responseIdentifier: 'RESPONSE' });
    expect(node).not.toBeNull();
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node!, { document }) as HTMLElement;
    expect(dom.hasAttribute(name)).toBe(false);
  });

  test('an authored flag switched on and off again is written as "false"', () => {
    const schema = createQtiSchema();
    const serializer = DOMSerializer.fromSchema(schema);
    const choice = schema.nodes.qtiSimpleChoice.createAndFill({ identifier: 'X', fixed: false, fixedExplicit: true })!;
    const write = (fixed: boolean) =>
      (serializer.serializeNode(choice.type.create({ ...choice.attrs, fixed }, choice.content), { document }) as HTMLElement)
        .getAttribute('fixed');
    expect(write(true)).toBe('true');
    expect(write(false)).toBe('false');
  });
});

/**
 * Selection limits the interaction node specs did not model, so a load → save round trip dropped
 * them. Through the real pipeline (`qti3ToPm` → `pmToQti3`), because the composer is part of the
 * path: it reconciles a kept limit with what the author has edited (see "QTI attributes kept as
 * authored" in docs/roundtrip-format.md).
 */
import { DOMSerializer } from 'prosemirror-model';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const item = (body: string, correct: string[] = []) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Limits">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">${
    correct.length > 0
      ? `<qti-correct-response>${correct.map(value => `<qti-value>${value}</qti-value>`).join('')}</qti-correct-response>`
      : ''
  }</qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const choice = (attributes: string) => `
  <qti-choice-interaction response-identifier="RESPONSE" ${attributes}>
    <qti-simple-choice identifier="A">Amsterdam</qti-simple-choice>
    <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
    <qti-simple-choice identifier="C">Parijs</qti-simple-choice>
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

const spell = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');

const roundtrip = (tag: string, xml: string): Element => {
  const exported = new DOMParser().parseFromString(pmToQti3(qti3ToPm(xml)), 'application/xml');
  const interaction = exported.getElementsByTagName(tag)[0];
  expect(interaction).toBeDefined();
  return interaction;
};

const MESSAGES = { 'data-min-selections-message': 'Kies er minstens één', 'data-max-selections-message': 'Te veel' };

const KEPT = [
  { tag: 'qti-choice-interaction', body: choice, attributes: { 'max-choices': '2', 'min-choices': '1', ...MESSAGES } },
  { tag: 'qti-order-interaction', body: order, attributes: { 'min-choices': '2', 'max-choices': '3', ...MESSAGES } },
  {
    tag: 'qti-inline-choice-interaction',
    body: inlineChoice,
    attributes: { required: 'true', 'min-choices': '1', 'data-min-selections-message': 'Kies een stad' },
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('interaction selection limits survive import → export', () => {
  test.each(KEPT.map(c => ({ ...c, label: `${c.tag} ${spell(c.attributes)}` })))('$label', ({ tag, body, attributes }) => {
    const interaction = roundtrip(tag, item(body(spell(attributes))));
    for (const [name, value] of Object.entries(attributes)) {
      expect(interaction.getAttribute(name), name).toBe(value);
    }
  });

  test('a choice interaction still drops min-choices="0", which only spells the default', () => {
    expect(roundtrip('qti-choice-interaction', item(choice('min-choices="0"'))).hasAttribute('min-choices')).toBe(false);
  });

  test.each([
    { type: 'qtiChoiceInteraction', names: ['min-choices', ...Object.keys(MESSAGES)] },
    { type: 'qtiOrderInteraction', names: ['min-choices', 'max-choices', ...Object.keys(MESSAGES)] },
    { type: 'qtiInlineChoiceInteraction', names: ['required', 'min-choices', 'data-min-selections-message'] },
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

describe('choice orientation becomes the qti-orientation class', () => {
  test('an orientation attribute is exported as the class the class editor manages', () => {
    const interaction = roundtrip('qti-choice-interaction', item(choice('orientation="horizontal"')));
    expect(interaction.hasAttribute('orientation')).toBe(false);
    expect(interaction.getAttribute('class')?.split(' ')).toContain('qti-orientation-horizontal');
  });

  test('a class that already names an orientation wins, and the attribute is not written next to it', () => {
    const interaction = roundtrip(
      'qti-choice-interaction',
      item(choice('class="qti-labels-upper-alpha qti-orientation-horizontal" orientation="vertical"')),
    );
    expect(interaction.hasAttribute('orientation')).toBe(false);
    expect(interaction.getAttribute('class')?.split(' ').sort()).toEqual([
      'qti-labels-upper-alpha',
      'qti-orientation-horizontal',
    ]);
  });
});

describe('a kept limit that contradicts the authored response is reconciled, with a warning', () => {
  test('choice min-choices above the max-choices one correct answer gives', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const interaction = roundtrip('qti-choice-interaction', item(choice('max-choices="1" min-choices="2"'), ['A']));
    expect(interaction.getAttribute('max-choices')).toBe('1');
    expect(interaction.getAttribute('min-choices')).toBe('1');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('min-choices="2" on qti-choice-interaction'));
  });

  test('order max-choices below the length of the correct order, min-choices above the choices left', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const interaction = roundtrip(
      'qti-order-interaction',
      item(order('max-choices="2" min-choices="5"'), ['A', 'B', 'C']),
    );
    expect(interaction.getAttribute('max-choices')).toBe('3');
    expect(interaction.getAttribute('min-choices')).toBe('3');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('max-choices="2" on qti-order-interaction'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('min-choices="5" on qti-order-interaction'));
  });

  test('a limit in range is exported unchanged and silently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    roundtrip('qti-order-interaction', item(order('max-choices="3" min-choices="3"'), ['A', 'B', 'C']));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('exported as'));
  });
});

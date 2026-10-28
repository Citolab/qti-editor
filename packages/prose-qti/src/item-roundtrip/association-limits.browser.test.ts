/**
 * Association limits on match and gap-match interactions. The node specs had no slot for
 * `max-associations` / `min-associations` on match, or `min-associations` on gap-match, and the
 * gap-match composer stripped it, so a load → save round trip dropped them. A newly created
 * interaction still writes none of them. The composer raises or lowers a kept limit that the
 * authored correct response contradicts, with a warning.
 */
import { DOMSerializer } from 'prosemirror-model';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const item = (body: string, correct: string[] = []) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Limits">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">${
    correct.length > 0
      ? `<qti-correct-response>${correct.map(value => `<qti-value>${value}</qti-value>`).join('')}</qti-correct-response>`
      : ''
  }</qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const matchSets = `
    <qti-simple-match-set>
      <qti-simple-associable-choice identifier="A" match-max="1">Amsterdam</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="B" match-max="1">Brussel</qti-simple-associable-choice>
    </qti-simple-match-set>
    <qti-simple-match-set>
      <qti-simple-associable-choice identifier="NL" match-max="1">Nederland</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="BE" match-max="1">België</qti-simple-associable-choice>
    </qti-simple-match-set>`;

const match = (attributes: string) => `
  <qti-match-interaction response-identifier="RESPONSE" ${attributes}>${matchSets}
  </qti-match-interaction>`;

const tabularMatch = (attributes: string) => `
  <qti-match-interaction class="qti-match-tabular" response-identifier="RESPONSE" ${attributes}>${matchSets}
  </qti-match-interaction>`;

const gapMatch = (attributes: string) => `
  <qti-gap-match-interaction response-identifier="RESPONSE" ${attributes}>
    <qti-gap-text identifier="W" match-max="1">Waal</qti-gap-text>
    <qti-gap-text identifier="M" match-max="1">Maas</qti-gap-text>
    <p>De <qti-gap identifier="G1"/> en de <qti-gap identifier="G2"/> stromen naar zee.</p>
  </qti-gap-match-interaction>`;

const MESSAGES = { 'data-min-selections-message': 'Maak minstens één paar', 'data-max-selections-message': 'Te veel' };

const CASES = [
  {
    tag: 'qti-match-interaction',
    body: match,
    attributes: { 'max-associations': '2', 'min-associations': '1', ...MESSAGES },
  },
  // `min-associations="0"` spells the XSD default, but qti-components defaults it to 1, so it is
  // not spelling only there.
  { tag: 'qti-match-interaction', body: tabularMatch, attributes: { 'max-associations': '4', 'min-associations': '0' } },
  {
    tag: 'qti-gap-match-interaction',
    body: gapMatch,
    attributes: { 'max-associations': '2', 'min-associations': '1', ...MESSAGES },
  },
];

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('association limits survive import → export', () => {
  test.each(CASES.map(c => ({ ...c, label: `${c.tag} ${spell(c.attributes)}` })))('$label', ({ tag, body, attributes }) => {
    const interaction = roundtrip(tag, item(body(spell(attributes))));
    for (const [name, value] of Object.entries(attributes)) {
      expect(interaction.getAttribute(name), name).toBe(value);
    }
  });

  test.each([
    { type: 'qtiMatchInteraction', names: ['max-associations', 'min-associations', ...Object.keys(MESSAGES)] },
    { type: 'qtiMatchInteractionTabular', names: ['max-associations', 'min-associations', ...Object.keys(MESSAGES)] },
    { type: 'qtiGapMatchInteraction', names: ['min-associations', ...Object.keys(MESSAGES)] },
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

describe('a kept limit that the correct response contradicts is reconciled, with a warning', () => {
  test.each([
    { tag: 'qti-match-interaction', body: match, correct: ['A NL', 'B BE'] },
    { tag: 'qti-gap-match-interaction', body: gapMatch, correct: ['W G1', 'M G2'] },
  ])('$tag: max-associations is raised to the correct pairs, min-associations lowered to them', ({ tag, body, correct }) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const interaction = roundtrip(tag, item(body('max-associations="1" min-associations="3"'), correct));
    expect(interaction.getAttribute('max-associations')).toBe('2');
    expect(interaction.getAttribute('min-associations')).toBe('2');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`max-associations="1" on ${tag}`));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`min-associations="3" on ${tag}`));
  });

  test('max-associations="0" is no limit and stays', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const interaction = roundtrip('qti-match-interaction', item(match('max-associations="0"'), ['A NL', 'B BE']));
    expect(interaction.getAttribute('max-associations')).toBe('0');
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('exported as'));
  });
});

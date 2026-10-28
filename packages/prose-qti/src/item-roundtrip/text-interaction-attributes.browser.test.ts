/**
 * QTI attributes of the text interactions that the node specs did not model, so a load → save round
 * trip dropped them. Through the real pipeline (`qti3ToPm` → `pmToQti3`: import transforms, schema
 * and composer), because each of those can lose an attribute.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from '../schema/create-qti-schema.js';
import { pmToQti3, qti3ToPm } from './convert.js';

const textEntryItem = (attributes: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Text entry">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response><qti-value>12</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <p>Twaalf in cijfers: <qti-text-entry-interaction response-identifier="RESPONSE" ${attributes}/></p>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const extendedTextItem = (attributes: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Extended text">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-extended-text-interaction response-identifier="RESPONSE" pattern-mask="^(\\S+\\s*){0,50}$" ${attributes}>
      <qti-prompt><p>Beschrijf de proef.</p></qti-prompt>
    </qti-extended-text-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const CASES = [
  {
    tag: 'qti-text-entry-interaction',
    type: 'qtiTextEntryInteraction',
    item: textEntryItem,
    attributes: {
      'expected-length': '12',
      'pattern-mask': '[0-9]*',
      'data-patternmask-message': 'Alleen cijfers',
      format: '%d',
      base: '10',
    },
  },
  {
    tag: 'qti-extended-text-interaction',
    type: 'qtiExtendedTextInteraction',
    item: extendedTextItem,
    attributes: { 'data-patternmask-message': 'Maximaal 50 woorden', format: 'xhtml', base: '10' },
  },
];

const spell = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');

const exported = (tag: string, xml: string): Element => {
  const doc = new DOMParser().parseFromString(pmToQti3(qti3ToPm(xml)), 'application/xml');
  const interaction = doc.getElementsByTagName(tag)[0];
  expect(interaction).toBeDefined();
  return interaction;
};

describe.each(CASES)('$tag attributes', ({ tag, type, item, attributes }) => {
  test.each(Object.entries(attributes))('keeps %s through import → export', (name, value) => {
    expect(exported(tag, item(`${name}="${value}"`)).getAttribute(name)).toBe(value);
  });

  test('keeps all of them together', () => {
    const interaction = exported(tag, item(spell(attributes)));
    for (const [name, value] of Object.entries(attributes)) {
      expect(interaction.getAttribute(name), name).toBe(value);
    }
  });

  test('drops a base that is not a number rather than writing NaN', () => {
    expect(exported(tag, item('base="ten"')).hasAttribute('base')).toBe(false);
  });

  test('a new interaction writes none of them', () => {
    const schema = createQtiSchema();
    const node = schema.nodes[type].createAndFill({ responseIdentifier: 'RESPONSE' });
    expect(node).not.toBeNull();
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node!, { document }) as HTMLElement;
    for (const name of Object.keys(attributes)) {
      expect(dom.hasAttribute(name), name).toBe(false);
    }
  });
});

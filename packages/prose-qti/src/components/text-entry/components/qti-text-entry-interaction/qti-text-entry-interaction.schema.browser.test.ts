/**
 * QTI attributes of qti-text-entry-interaction that the node spec did not model, so a load → save
 * round trip dropped them: `expected-length`, `pattern-mask`, `data-patternmask-message`, `format`
 * and `base`. Nothing in the editor edits them; they only have to survive.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { pmToQti3, qti3ToPm } from '../../../../item-roundtrip/convert.js';
import { createQtiSchema } from '../../../../schema/create-qti-schema.js';

const ATTRIBUTES = {
  'expected-length': '12',
  'pattern-mask': '[0-9]*',
  'data-patternmask-message': 'Alleen cijfers',
  format: '%d',
  base: '10',
};

const item = (attributes: string) => `<?xml version="1.0" encoding="UTF-8"?>
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

const exportedInteraction = (xml: string): Element => {
  const exported = new DOMParser().parseFromString(pmToQti3(qti3ToPm(xml)), 'application/xml');
  const interaction = exported.getElementsByTagName('qti-text-entry-interaction')[0];
  expect(interaction).toBeDefined();
  return interaction;
};

describe('qti-text-entry-interaction attributes', () => {
  test.each(Object.entries(ATTRIBUTES))('keeps %s through import → export', (name, value) => {
    expect(exportedInteraction(item(`${name}="${value}"`)).getAttribute(name)).toBe(value);
  });

  test('keeps all of them together', () => {
    const written = Object.entries(ATTRIBUTES).map(([name, value]) => `${name}="${value}"`).join(' ');
    const interaction = exportedInteraction(item(written));
    for (const [name, value] of Object.entries(ATTRIBUTES)) {
      expect(interaction.getAttribute(name)).toBe(value);
    }
  });

  test('a new interaction writes none of them', () => {
    const schema = createQtiSchema();
    const node = schema.nodes.qtiTextEntryInteraction.create({ responseIdentifier: 'RESPONSE' });
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node, { document }) as HTMLElement;
    for (const name of Object.keys(ATTRIBUTES)) {
      expect(dom.hasAttribute(name)).toBe(false);
    }
  });
});

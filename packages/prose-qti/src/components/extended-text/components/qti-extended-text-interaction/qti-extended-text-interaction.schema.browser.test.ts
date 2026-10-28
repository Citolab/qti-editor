/**
 * QTI attributes of qti-extended-text-interaction that the node spec did not model, so a load →
 * save round trip dropped them: `data-patternmask-message`, `format` and `base`. Nothing in the
 * editor edits them; they only have to survive.
 */
import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { pmToQti3, qti3ToPm } from '../../../../item-roundtrip/convert.js';
import { createQtiSchema } from '../../../../schema/create-qti-schema.js';

const ATTRIBUTES = {
  'data-patternmask-message': 'Maximaal 50 woorden',
  format: 'xhtml',
  base: '10',
};

const item = (attributes: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Extended text">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-extended-text-interaction response-identifier="RESPONSE" pattern-mask="^(\\S+\\s*){0,50}$" ${attributes}>
      <qti-prompt><p>Beschrijf de proef.</p></qti-prompt>
    </qti-extended-text-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const exportedInteraction = (xml: string): Element => {
  const exported = new DOMParser().parseFromString(pmToQti3(qti3ToPm(xml)), 'application/xml');
  const interaction = exported.getElementsByTagName('qti-extended-text-interaction')[0];
  expect(interaction).toBeDefined();
  return interaction;
};

describe('qti-extended-text-interaction attributes', () => {
  test.each(Object.entries(ATTRIBUTES))('keeps %s through import → export', (name, value) => {
    expect(exportedInteraction(item(`${name}="${value}"`)).getAttribute(name)).toBe(value);
  });

  test('a new interaction writes none of them', () => {
    const schema = createQtiSchema();
    const node = schema.nodes.qtiExtendedTextInteraction.create({ responseIdentifier: 'RESPONSE' });
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node, { document }) as HTMLElement;
    for (const name of Object.keys(ATTRIBUTES)) {
      expect(dom.hasAttribute(name)).toBe(false);
    }
  });
});

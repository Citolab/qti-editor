import { describe, expect, it } from 'vitest';

import { roundtripOrder } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const orderFor = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-order-interaction response-identifier="${responseIdentifier}" shuffle="false" ${extra}>
    <qti-simple-choice identifier="step_hypothese">Hypothese formuleren</qti-simple-choice>
    <qti-simple-choice identifier="step_conclusies">Conclusies trekken</qti-simple-choice>
    <qti-simple-choice identifier="step_data">Data verzamelen</qti-simple-choice>
  </qti-order-interaction>`;

const declaration = (identifier: string, ...values: string[]) =>
  `<qti-response-declaration identifier="${identifier}" cardinality="ordered" base-type="identifier">
    <qti-correct-response>${values.map((v) => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const matchResponse = `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`;

describe('roundtripOrder', () => {
  it('converts ordered qti-values into a comma-separated identifier list, preserving order', () => {
    const doc = itemXml(orderFor(), matchResponse, declaration('RESPONSE', 'step_hypothese', 'step_data', 'step_conclusies'));
    roundtripOrder(doc);
    const interaction = doc.querySelector('qti-order-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('step_hypothese,step_data,step_conclusies');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('extracts explicit score from qti-set-outcome-value', () => {
    const doc = itemXml(
      orderFor(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">3</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      declaration('RESPONSE', 'step_hypothese', 'step_data', 'step_conclusies'),
    );
    roundtripOrder(doc);
    expect(doc.querySelector('qti-order-interaction')!.getAttribute('score')).toBe('3');
  });

  it('is idempotent — preserves an existing canonical correct-response/score', () => {
    const doc = itemXml(
      orderFor('RESPONSE', 'correct-response=\'a,b\' score="9"'),
      matchResponse,
      declaration('RESPONSE', 'step_hypothese', 'step_data', 'step_conclusies'),
    );
    roundtripOrder(doc);
    const interaction = doc.querySelector('qti-order-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('a,b');
    expect(interaction.getAttribute('score')).toBe('9');
  });

  it('no-ops when there is no matching declaration', () => {
    const doc = itemXml(orderFor(), matchResponse);
    roundtripOrder(doc);
    expect(doc.querySelector('qti-order-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when the declaration has no values', () => {
    const doc = itemXml(orderFor(), matchResponse, declaration('RESPONSE'));
    roundtripOrder(doc);
    expect(doc.querySelector('qti-order-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when there is more than one order interaction', () => {
    const doc = itemXml(
      `${orderFor('R1')}${orderFor('R2')}`,
      matchResponse,
      `${declaration('R1', 'step_hypothese', 'step_data')}${declaration('R2', 'step_data', 'step_hypothese')}`,
    );
    roundtripOrder(doc);
    expect(doc.querySelectorAll('qti-order-interaction')[0].hasAttribute('correct-response')).toBe(false);
  });
});

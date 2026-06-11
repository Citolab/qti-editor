import { describe, expect, it } from 'vitest';

import { roundtripInteractions } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const declaration = (identifier: string, ...values: string[]) =>
  `<qti-response-declaration identifier="${identifier}" cardinality="single" base-type="identifier">
    <qti-correct-response>${values.map((v) => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const matchCorrect = `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`;

describe('roundtripInteractions (generic fallback)', () => {
  it.each([
    ['qti-order-interaction', 'ORDER'],
    ['qti-associate-interaction', 'ASSOC'],
    ['qti-match-interaction', 'MATCH'],
    ['qti-gap-match-interaction', 'GAP'],
    ['qti-hottext-interaction', 'HOT'],
    ['qti-inline-choice-interaction', 'INLINE'],
    ['qti-select-point-interaction', 'POINT'],
  ])('hoists correct-response and score onto %s', (tag, id) => {
    const doc = itemXml(
      `<${tag} response-identifier="${id}"></${tag}>`,
      matchCorrect,
      declaration(id, 'A'),
    );
    roundtripInteractions(doc);
    const interaction = doc.querySelector(tag)!;
    expect(interaction.getAttribute('correct-response')).toBe('A');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('hoists onto multiple interactions, matching each by response-identifier', () => {
    const doc = itemXml(
      `<qti-order-interaction response-identifier="R1"></qti-order-interaction>
       <qti-inline-choice-interaction response-identifier="R2"></qti-inline-choice-interaction>`,
      matchCorrect,
      `${declaration('R1', 'X')}${declaration('R2', 'Y')}`,
    );
    roundtripInteractions(doc);
    expect(doc.querySelector('qti-order-interaction')!.getAttribute('correct-response')).toBe('X');
    expect(doc.querySelector('qti-inline-choice-interaction')!.getAttribute('correct-response')).toBe('Y');
  });

  it('is idempotent — preserves an existing canonical correct-response/score', () => {
    const doc = itemXml(
      `<qti-order-interaction response-identifier="R1" correct-response="existing" score="9"></qti-order-interaction>`,
      matchCorrect,
      declaration('R1', 'fromDeclaration'),
    );
    roundtripInteractions(doc);
    const interaction = doc.querySelector('qti-order-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('existing');
    expect(interaction.getAttribute('score')).toBe('9');
  });

  it('skips interactions whose response-identifier has no declared correct-response', () => {
    const doc = itemXml(
      `<qti-order-interaction response-identifier="R1"></qti-order-interaction>`,
      matchCorrect,
      `<qti-response-declaration identifier="R1" cardinality="single" base-type="identifier"><qti-correct-response /></qti-response-declaration>`,
    );
    roundtripInteractions(doc);
    const interaction = doc.querySelector('qti-order-interaction')!;
    expect(interaction.hasAttribute('correct-response')).toBe(false);
    expect(interaction.hasAttribute('score')).toBe(false);
  });

  it('does nothing when there are no declarations with correct responses', () => {
    const doc = itemXml(`<qti-order-interaction response-identifier="R1"></qti-order-interaction>`);
    roundtripInteractions(doc);
    expect(doc.querySelector('qti-order-interaction')!.hasAttribute('correct-response')).toBe(false);
  });
});

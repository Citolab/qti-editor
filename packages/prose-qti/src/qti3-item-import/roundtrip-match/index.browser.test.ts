import { describe, expect, it } from 'vitest';

import { roundtripMatch } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const matchFor = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-match-interaction response-identifier="${responseIdentifier}" max-associations="5" ${extra}>
    <qti-simple-match-set>
      <qti-simple-associable-choice identifier="C">Capulet</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="D">Demetrius</qti-simple-associable-choice>
    </qti-simple-match-set>
    <qti-simple-match-set>
      <qti-simple-associable-choice identifier="M">Midsummer</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="R">Romeo</qti-simple-associable-choice>
    </qti-simple-match-set>
  </qti-match-interaction>`;

const declaration = (identifier: string, ...values: string[]) =>
  `<qti-response-declaration identifier="${identifier}" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>${values.map((v) => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const mapResponse = `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`;

describe('roundtripMatch', () => {
  it('converts directedPair qti-values into the editor JSON pairs format', () => {
    const doc = itemXml(matchFor(), mapResponse, declaration('RESPONSE', 'C R', 'D M'));
    roundtripMatch(doc);
    const interaction = doc.querySelector('qti-match-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('["C R","D M"]');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('parses tab/multi-space separated pairs', () => {
    const doc = itemXml(matchFor(), mapResponse, declaration('RESPONSE', 'C   R'));
    roundtripMatch(doc);
    expect(doc.querySelector('qti-match-interaction')!.getAttribute('correct-response')).toBe('["C R"]');
  });

  it('extracts explicit score from qti-set-outcome-value', () => {
    const doc = itemXml(
      matchFor(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">4</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      declaration('RESPONSE', 'C R'),
    );
    roundtripMatch(doc);
    expect(doc.querySelector('qti-match-interaction')!.getAttribute('score')).toBe('4');
  });

  it('is idempotent — preserves an existing canonical correct-response/score', () => {
    const doc = itemXml(
      matchFor('RESPONSE', 'correct-response=\'["X Y"]\' score="9"'),
      mapResponse,
      declaration('RESPONSE', 'C R'),
    );
    roundtripMatch(doc);
    const interaction = doc.querySelector('qti-match-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('["X Y"]');
    expect(interaction.getAttribute('score')).toBe('9');
  });

  it('no-ops when there is no matching declaration', () => {
    const doc = itemXml(matchFor(), mapResponse);
    roundtripMatch(doc);
    expect(doc.querySelector('qti-match-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when the declaration has no parseable pairs', () => {
    const doc = itemXml(matchFor(), mapResponse, declaration('RESPONSE', 'C', ''));
    roundtripMatch(doc);
    expect(doc.querySelector('qti-match-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when there is more than one match interaction', () => {
    const doc = itemXml(
      `${matchFor('R1')}${matchFor('R2')}`,
      mapResponse,
      `${declaration('R1', 'C R')}${declaration('R2', 'D M')}`,
    );
    roundtripMatch(doc);
    expect(doc.querySelectorAll('qti-match-interaction')[0].hasAttribute('correct-response')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { roundtripGapMatch } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const gapMatchFor = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-gap-match-interaction response-identifier="${responseIdentifier}" ${extra}>
    <qti-gap-text identifier="ht_basisch" match-max="1">basisch</qti-gap-text>
    <qti-gap-text identifier="ht_zuur" match-max="1">zuur</qti-gap-text>
    <p>pH &lt; 7 is <qti-gap identifier="gap_low"/>, pH &gt; 7 is <qti-gap identifier="gap_high"/>.</p>
  </qti-gap-match-interaction>`;

const declaration = (identifier: string, ...values: string[]) =>
  `<qti-response-declaration identifier="${identifier}" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>${values.map((v) => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const mapResponse = `<qti-response-processing>
  <qti-set-outcome-value identifier="SCORE"><qti-map-response identifier="RESPONSE"/></qti-set-outcome-value>
</qti-response-processing>`;

describe('roundtripGapMatch', () => {
  it('converts directedPair qti-values into the editor JSON pairs format', () => {
    const doc = itemXml(gapMatchFor(), mapResponse, declaration('RESPONSE', 'ht_zuur gap_low', 'ht_basisch gap_high'));
    roundtripGapMatch(doc);
    const interaction = doc.querySelector('qti-gap-match-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('["ht_zuur gap_low","ht_basisch gap_high"]');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('parses tab/multi-space separated pairs', () => {
    const doc = itemXml(gapMatchFor(), mapResponse, declaration('RESPONSE', 'ht_zuur   gap_low'));
    roundtripGapMatch(doc);
    expect(doc.querySelector('qti-gap-match-interaction')!.getAttribute('correct-response')).toBe('["ht_zuur gap_low"]');
  });

  it('extracts explicit score from qti-set-outcome-value', () => {
    const doc = itemXml(
      gapMatchFor(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">2</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      declaration('RESPONSE', 'ht_zuur gap_low'),
    );
    roundtripGapMatch(doc);
    expect(doc.querySelector('qti-gap-match-interaction')!.getAttribute('score')).toBe('2');
  });

  it('is idempotent — preserves an existing canonical correct-response/score', () => {
    const doc = itemXml(
      gapMatchFor('RESPONSE', 'correct-response=\'["x g"]\' score="9"'),
      mapResponse,
      declaration('RESPONSE', 'ht_zuur gap_low'),
    );
    roundtripGapMatch(doc);
    const interaction = doc.querySelector('qti-gap-match-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('["x g"]');
    expect(interaction.getAttribute('score')).toBe('9');
  });

  it('no-ops when there is no matching declaration', () => {
    const doc = itemXml(gapMatchFor(), mapResponse);
    roundtripGapMatch(doc);
    expect(doc.querySelector('qti-gap-match-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when the declaration has no parseable pairs', () => {
    const doc = itemXml(gapMatchFor(), mapResponse, declaration('RESPONSE', 'ht_zuur', ''));
    roundtripGapMatch(doc);
    expect(doc.querySelector('qti-gap-match-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when there is more than one gap-match interaction', () => {
    const doc = itemXml(
      `${gapMatchFor('R1')}${gapMatchFor('R2')}`,
      mapResponse,
      `${declaration('R1', 'ht_zuur gap_low')}${declaration('R2', 'ht_basisch gap_high')}`,
    );
    roundtripGapMatch(doc);
    expect(doc.querySelectorAll('qti-gap-match-interaction')[0].hasAttribute('correct-response')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { roundtripQtiItem } from './roundtrip-qti-item';

const SAMPLE_QTI3 = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="example-choice" title="Example Choice" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>ChoiceA</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Pick A</qti-prompt>
      <qti-simple-choice identifier="ChoiceA">A</qti-simple-choice>
      <qti-simple-choice identifier="ChoiceB">B</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>`;

describe('roundtripQtiItem end-to-end via qtiTransformItem chain', () => {
  it('hoists correct-response and score onto the choice interaction', () => {
    const output = roundtripQtiItem(SAMPLE_QTI3);
    const doc = new DOMParser().parseFromString(output, 'text/xml');
    const interaction = doc.querySelector('qti-choice-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('ChoiceA');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('leaves source qti-response-declaration and qti-response-processing intact', () => {
    const output = roundtripQtiItem(SAMPLE_QTI3);
    const doc = new DOMParser().parseFromString(output, 'text/xml');
    expect(doc.querySelector('qti-response-declaration')).not.toBeNull();
    expect(doc.querySelector('qti-response-processing')).not.toBeNull();
  });

  it('produces output whose hoisted attributes satisfy the editor schema parseDOM contract', () => {
    const output = roundtripQtiItem(SAMPLE_QTI3);
    const htmlDoc = new DOMParser().parseFromString(output, 'text/html');
    const interaction = htmlDoc.querySelector('qti-choice-interaction')!;
    const correctResponseRaw = interaction.getAttribute('correct-response');
    const scoreRaw = interaction.getAttribute('score');

    // Mirrors the parseDOM getAttrs logic in qti-choice-interaction.schema.ts
    expect(correctResponseRaw).toBe('ChoiceA');
    expect(Number(scoreRaw)).toBe(1);
    expect(interaction.getAttribute('response-identifier')).toBe('RESPONSE');
  });
});

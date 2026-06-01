import { describe, expect, it } from 'vitest';

import { roundtripChoice } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const choiceFor = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-choice-interaction response-identifier="${responseIdentifier}" max-choices="1" ${extra}>
    <qti-simple-choice identifier="ChoiceA">A</qti-simple-choice>
    <qti-simple-choice identifier="ChoiceB">B</qti-simple-choice>
  </qti-choice-interaction>`;

describe('roundtripChoice', () => {
  it('hoists single correct-response and match_correct score=1', () => {
    const doc = itemXml(
      choiceFor(),
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    const interaction = doc.querySelector('qti-choice-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('ChoiceA');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('hoists multi correct-response as comma-joined', () => {
    const doc = itemXml(
      `<qti-choice-interaction response-identifier="RESPONSE" max-choices="2">
        <qti-simple-choice identifier="ChoiceA">A</qti-simple-choice>
        <qti-simple-choice identifier="ChoiceB">B</qti-simple-choice>
      </qti-choice-interaction>`,
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
          <qti-value>ChoiceA</qti-value>
          <qti-value>ChoiceB</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    expect(doc.querySelector('qti-choice-interaction')!.getAttribute('correct-response')).toBe('ChoiceA,ChoiceB');
  });

  it('extracts explicit score from qti-set-outcome-value', () => {
    const doc = itemXml(
      choiceFor(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">3</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    expect(doc.querySelector('qti-choice-interaction')!.getAttribute('score')).toBe('3');
  });

  it('passes through when two choice interactions present', () => {
    const doc = itemXml(
      `${choiceFor('R1')}${choiceFor('R2')}`,
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="R1" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    const all = doc.querySelectorAll('qti-choice-interaction');
    expect(all[0].hasAttribute('correct-response')).toBe(false);
    expect(all[1].hasAttribute('correct-response')).toBe(false);
  });

  it('passes through when no qti-correct-response is present', () => {
    const doc = itemXml(
      choiceFor(),
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
    );
    roundtripChoice(doc);
    const interaction = doc.querySelector('qti-choice-interaction')!;
    expect(interaction.hasAttribute('correct-response')).toBe(false);
    expect(interaction.hasAttribute('score')).toBe(false);
  });

  it('idempotent: existing correct-response is preserved', () => {
    const doc = itemXml(
      choiceFor('RESPONSE', 'correct-response="ChoiceB" score="5"'),
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    const interaction = doc.querySelector('qti-choice-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('ChoiceB');
    expect(interaction.getAttribute('score')).toBe('5');
  });

  it('ignores sibling text-entry interaction', () => {
    const doc = itemXml(
      `${choiceFor()}<qti-text-entry-interaction response-identifier="RESPONSE2" />`,
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripChoice(doc);
    expect(doc.querySelector('qti-text-entry-interaction')!.hasAttribute('correct-response')).toBe(false);
    expect(doc.querySelector('qti-choice-interaction')!.getAttribute('correct-response')).toBe('ChoiceA');
  });
});

import { describe, expect, it } from 'vitest';

import { roundtripTextEntry } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const textEntry = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-text-entry-interaction response-identifier="${responseIdentifier}" ${extra} />`;

describe('roundtripTextEntry', () => {
  it('hoists correct-response and match_correct score', () => {
    const doc = itemXml(
      textEntry(),
      `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripTextEntry(doc);
    const interaction = doc.querySelector('qti-text-entry-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('Paris');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('hoists multiple correct values', () => {
    const doc = itemXml(
      textEntry(),
      ``,
      `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="string">
        <qti-correct-response>
          <qti-value>Paris</qti-value>
          <qti-value>paris</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripTextEntry(doc);
    expect(doc.querySelector('qti-text-entry-interaction')!.getAttribute('correct-response')).toBe('Paris,paris');
  });

  it('extracts explicit score', () => {
    const doc = itemXml(
      textEntry(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">2</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripTextEntry(doc);
    expect(doc.querySelector('qti-text-entry-interaction')!.getAttribute('score')).toBe('2');
  });

  it('passes through when two text-entry interactions present', () => {
    const doc = itemXml(
      `${textEntry('R1')}${textEntry('R2')}`,
      ``,
      `<qti-response-declaration identifier="R1" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripTextEntry(doc);
    const all = doc.querySelectorAll('qti-text-entry-interaction');
    expect(all[0].hasAttribute('correct-response')).toBe(false);
    expect(all[1].hasAttribute('correct-response')).toBe(false);
  });

  it('passes through with no correct-response', () => {
    const doc = itemXml(textEntry());
    roundtripTextEntry(doc);
    expect(doc.querySelector('qti-text-entry-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('idempotent', () => {
    const doc = itemXml(
      textEntry('RESPONSE', 'correct-response="Berlin" score="9"'),
      ``,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
      </qti-response-declaration>`,
    );
    roundtripTextEntry(doc);
    const interaction = doc.querySelector('qti-text-entry-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('Berlin');
    expect(interaction.getAttribute('score')).toBe('9');
  });
});

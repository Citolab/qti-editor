import { describe, expect, it } from 'vitest';

import { roundtripSelectPoint } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '', declarations = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const selectPointFor = (responseIdentifier = 'RESPONSE', extra = '') =>
  `<qti-select-point-interaction response-identifier="${responseIdentifier}" max-choices="1" ${extra}>
    <qti-prompt>Mark the point.</qti-prompt>
    <img src="resources/europe.svg" width="600" height="513" />
  </qti-select-point-interaction>`;

const areaMappingDeclaration = (identifier: string, entries: string, defaultValue = '0') =>
  `<qti-response-declaration identifier="${identifier}" base-type="point" cardinality="single">
    <qti-area-mapping default-value="${defaultValue}">${entries}</qti-area-mapping>
  </qti-response-declaration>`;

const correctResponseDeclaration = (identifier: string, ...values: string[]) =>
  `<qti-response-declaration identifier="${identifier}" base-type="point" cardinality="single">
    <qti-correct-response>${values.map((v) => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>
  </qti-response-declaration>`;

const mapResponsePoint = `<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point" />`;

describe('roundtripSelectPoint', () => {
  it('reconstructs area-mappings JSON from qti-area-mapping', () => {
    const doc = itemXml(
      selectPointFor(),
      mapResponsePoint,
      areaMappingDeclaration('RESPONSE', '<qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>'),
    );
    roundtripSelectPoint(doc);
    const interaction = doc.querySelector('qti-select-point-interaction')!;
    expect(JSON.parse(interaction.getAttribute('area-mappings')!)).toEqual([
      { id: 'A1', shape: 'circle', coords: '191,393,10', mappedValue: 1, defaultValue: 0 },
    ]);
    expect(interaction.getAttribute('score')).toBe('1');
    expect(interaction.getAttribute('correct-response')).toBe('191 393');
  });

  it('keeps multiple area-map entries with their mapped values', () => {
    const doc = itemXml(
      selectPointFor(),
      mapResponsePoint,
      areaMappingDeclaration(
        'RESPONSE',
        '<qti-area-map-entry shape="circle" coords="10,20,5" mapped-value="2"/><qti-area-map-entry shape="rect" coords="0,0,30,30" mapped-value="1"/>',
        '0',
      ),
    );
    roundtripSelectPoint(doc);
    expect(JSON.parse(doc.querySelector('qti-select-point-interaction')!.getAttribute('area-mappings')!)).toEqual([
      { id: 'A1', shape: 'circle', coords: '10,20,5', mappedValue: 2, defaultValue: 0 },
      { id: 'A2', shape: 'rect', coords: '0,0,30,30', mappedValue: 1, defaultValue: 0 },
    ]);
  });

  it('derives correct-response from area-map entries (circle centre / rect centre)', () => {
    const doc = itemXml(
      selectPointFor(),
      mapResponsePoint,
      areaMappingDeclaration(
        'RESPONSE',
        '<qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/><qti-area-map-entry shape="rect" coords="0,0,30,40" mapped-value="1"/>',
      ),
    );
    roundtripSelectPoint(doc);
    expect(doc.querySelector('qti-select-point-interaction')!.getAttribute('correct-response')).toBe('191 393,15 20');
  });

  it('reconstructs a comma-separated correct-response from qti-correct-response points', () => {
    const doc = itemXml(selectPointFor(), mapResponsePoint, correctResponseDeclaration('RESPONSE', '191 393'));
    roundtripSelectPoint(doc);
    expect(doc.querySelector('qti-select-point-interaction')!.getAttribute('correct-response')).toBe('191 393');
  });

  it('joins multiple correct points with commas', () => {
    const doc = itemXml(selectPointFor(), mapResponsePoint, correctResponseDeclaration('RESPONSE', '10 20', '30 40'));
    roundtripSelectPoint(doc);
    expect(doc.querySelector('qti-select-point-interaction')!.getAttribute('correct-response')).toBe('10 20,30 40');
  });

  it('extracts explicit score from qti-set-outcome-value', () => {
    const doc = itemXml(
      selectPointFor(),
      `<qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">4</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`,
      areaMappingDeclaration('RESPONSE', '<qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>'),
    );
    roundtripSelectPoint(doc);
    expect(doc.querySelector('qti-select-point-interaction')!.getAttribute('score')).toBe('4');
  });

  it('is idempotent — preserves existing area-mappings/correct-response/score', () => {
    const doc = itemXml(
      selectPointFor('RESPONSE', `area-mappings='[{"id":"X","shape":"circle","coords":"1,2,3","mappedValue":5,"defaultValue":0}]' correct-response="7 8" score="9"`),
      mapResponsePoint,
      areaMappingDeclaration('RESPONSE', '<qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>'),
    );
    roundtripSelectPoint(doc);
    const interaction = doc.querySelector('qti-select-point-interaction')!;
    expect(JSON.parse(interaction.getAttribute('area-mappings')!)).toEqual([
      { id: 'X', shape: 'circle', coords: '1,2,3', mappedValue: 5, defaultValue: 0 },
    ]);
    expect(interaction.getAttribute('correct-response')).toBe('7 8');
    expect(interaction.getAttribute('score')).toBe('9');
  });

  it('no-ops when there is no matching declaration', () => {
    const doc = itemXml(selectPointFor(), mapResponsePoint);
    roundtripSelectPoint(doc);
    const interaction = doc.querySelector('qti-select-point-interaction')!;
    expect(interaction.hasAttribute('area-mappings')).toBe(false);
    expect(interaction.hasAttribute('correct-response')).toBe(false);
  });

  it('no-ops when there is more than one select-point interaction', () => {
    const doc = itemXml(
      `${selectPointFor('R1')}${selectPointFor('R2')}`,
      mapResponsePoint,
      `${areaMappingDeclaration('R1', '<qti-area-map-entry shape="circle" coords="1,2,3" mapped-value="1"/>')}${areaMappingDeclaration('R2', '<qti-area-map-entry shape="circle" coords="4,5,6" mapped-value="1"/>')}`,
    );
    roundtripSelectPoint(doc);
    expect(doc.querySelectorAll('qti-select-point-interaction')[0].hasAttribute('area-mappings')).toBe(false);
  });
});

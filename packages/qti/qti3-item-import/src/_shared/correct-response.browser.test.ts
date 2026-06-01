import { describe, expect, it } from 'vitest';

import { buildCorrectResponseIndex } from './correct-response';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const wrap = (declarations: string) =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  ${declarations}
  <qti-item-body />
</qti-assessment-item>`);

describe('buildCorrectResponseIndex', () => {
  it('single cardinality with one qti-value', () => {
    const doc = wrap(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
      </qti-response-declaration>`);
    expect(buildCorrectResponseIndex(doc).get('RESPONSE')).toBe('ChoiceA');
  });

  it('multiple cardinality joins with comma', () => {
    const doc = wrap(`
      <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
          <qti-value>ChoiceA</qti-value>
          <qti-value>ChoiceB</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`);
    expect(buildCorrectResponseIndex(doc).get('RESPONSE')).toBe('ChoiceA,ChoiceB');
  });

  it('trims whitespace and ignores empty values', () => {
    const doc = wrap(`
      <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
          <qti-value>  ChoiceA  </qti-value>
          <qti-value>   </qti-value>
          <qti-value>ChoiceB</qti-value>
        </qti-correct-response>
      </qti-response-declaration>`);
    expect(buildCorrectResponseIndex(doc).get('RESPONSE')).toBe('ChoiceA,ChoiceB');
  });

  it('skips declarations with no identifier', () => {
    const doc = wrap(`
      <qti-response-declaration cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>X</qti-value></qti-correct-response>
      </qti-response-declaration>`);
    expect(buildCorrectResponseIndex(doc).size).toBe(0);
  });

  it('omits declarations with empty correct-response', () => {
    const doc = wrap(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response />
      </qti-response-declaration>`);
    expect(buildCorrectResponseIndex(doc).has('RESPONSE')).toBe(false);
  });
});

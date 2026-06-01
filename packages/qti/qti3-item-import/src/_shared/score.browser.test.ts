import { describe, expect, it } from 'vitest';

import { extractItemScore } from './score';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const wrap = (processing: string) =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  <qti-item-body />
  ${processing}
</qti-assessment-item>`);

describe('extractItemScore', () => {
  it('match_correct template → 1', () => {
    const doc = wrap(`<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />`);
    expect(extractItemScore(doc)).toBe(1);
  });

  it('match_correct template with .xml suffix → 1', () => {
    const doc = wrap(`<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml" />`);
    expect(extractItemScore(doc)).toBe(1);
  });

  it('direct qti-base-value=2', () => {
    const doc = wrap(`
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">2</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`);
    expect(extractItemScore(doc)).toBe(2);
  });

  it('qti-sum containing literal qti-base-value=3', () => {
    const doc = wrap(`
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-sum>
            <qti-variable identifier="SCORE" />
            <qti-base-value base-type="float">3</qti-base-value>
          </qti-sum>
        </qti-set-outcome-value>
      </qti-response-processing>`);
    expect(extractItemScore(doc)).toBe(3);
  });

  it('zero-init followed by accumulator returns accumulator value', () => {
    const doc = wrap(`
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="integer">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="SCORE">
          <qti-sum>
            <qti-variable identifier="SCORE" />
            <qti-base-value base-type="float">4</qti-base-value>
          </qti-sum>
        </qti-set-outcome-value>
      </qti-response-processing>`);
    expect(extractItemScore(doc)).toBe(4);
  });

  it('no processing block → 1', () => {
    const doc = parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  <qti-item-body />
</qti-assessment-item>`);
    expect(extractItemScore(doc)).toBe(1);
  });

  it('empty processing block → 1', () => {
    const doc = wrap(`<qti-response-processing />`);
    expect(extractItemScore(doc)).toBe(1);
  });
});

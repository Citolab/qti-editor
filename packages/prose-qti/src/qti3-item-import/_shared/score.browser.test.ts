/**
 * Reading per-interaction weights back out of standard QTI 3.0.
 *
 * `extractItemScore` collapses an item to one number, which is only ever right
 * for a single-interaction item. `buildScoreIndex` resolves a weight per
 * response identifier so a multi-interaction item round-trips its weights
 * instead of handing every interaction whichever value appeared first.
 */
import { describe, expect, it } from 'vitest';

import { buildScoreIndex, extractItemScore } from './score';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

function parseItem(inner: string): XMLDocument {
  const doc = new DOMParser().parseFromString(
    `<qti-assessment-item xmlns="${QTI_NS}" identifier="i" title="t">${inner}</qti-assessment-item>`,
    'application/xml',
  );
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
}

/** One written-out match_correct rule: identifier scores `score` when correct. */
const condition = (responseIdentifier: string, score: number) => `
  <qti-response-condition>
    <qti-response-if>
      <qti-match>
        <qti-variable identifier="${responseIdentifier}"/>
        <qti-correct identifier="${responseIdentifier}"/>
      </qti-match>
      <qti-set-outcome-value identifier="SCORE">
        <qti-sum>
          <qti-variable identifier="SCORE"/>
          <qti-base-value base-type="float">${score}</qti-base-value>
        </qti-sum>
      </qti-set-outcome-value>
    </qti-response-if>
  </qti-response-condition>`;

const declaration = (responseIdentifier: string) => `
  <qti-response-declaration identifier="${responseIdentifier}" cardinality="single"
    base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>`;

describe('buildScoreIndex', () => {
  it('resolves a distinct weight per response identifier', () => {
    const doc = parseItem(`
      ${declaration('R1')}${declaration('R2')}${declaration('R3')}
      <qti-item-body/>
      <qti-response-processing>
        ${condition('R1', 1)}${condition('R2', 2)}${condition('R3', 3)}
      </qti-response-processing>`);

    expect(Object.fromEntries(buildScoreIndex(doc))).toEqual({ R1: 1, R2: 2, R3: 3 });

    // The item-level reading is exactly the trap this replaces: one number for
    // all three, so R2 and R3 would have imported as 1.
    expect(extractItemScore(doc)).toBe(1);
  });

  it('does not mistake the SCORE accumulator for the response being tested', () => {
    // Each condition contains <qti-variable identifier="SCORE"/> inside its
    // qti-set-outcome-value, so a naive first-qti-variable read attributes
    // every weight to "SCORE".
    const doc = parseItem(`
      ${declaration('R1')}
      <qti-item-body/>
      <qti-response-processing>${condition('R1', 4)}</qti-response-processing>`);

    const index = buildScoreIndex(doc);
    expect(index.has('SCORE')).toBe(false);
    expect(index.get('R1')).toBe(4);
  });

  it('reads a weight back out of a qti-mapping', () => {
    // Compose writes the weight into mapped-value for map_response
    // interactions, so that is where it has to be read from.
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>cat</qti-value></qti-correct-response>
        <qti-mapping default-value="0">
          <qti-map-entry map-key="cat" mapped-value="4" case-sensitive="false"/>
          <qti-map-entry map-key="Cat" mapped-value="4" case-sensitive="false"/>
        </qti-mapping>
      </qti-response-declaration>
      <qti-item-body/>
      <qti-response-processing
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"/>`);

    // Two spellings of the same answer at cardinality single — only one can
    // ever match, so the weight is 4, not 8.
    expect(buildScoreIndex(doc).get('RESPONSE')).toBe(4);
  });

  it('lets an explicit condition override a mapping', () => {
    const doc = parseItem(`
      <qti-response-declaration identifier="R1" cardinality="single" base-type="string">
        <qti-mapping default-value="0">
          <qti-map-entry map-key="cat" mapped-value="2" case-sensitive="false"/>
        </qti-mapping>
      </qti-response-declaration>
      <qti-item-body/>
      <qti-response-processing>${condition('R1', 9)}</qti-response-processing>`);

    expect(buildScoreIndex(doc).get('R1')).toBe(9);
  });

  it('ignores an area mapping, whose points are not the score attribute', () => {
    // Select-point derives its points from the area mapping itself; importing
    // them as a `score` attribute would put the same number in two places.
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="point">
        <qti-area-mapping default-value="0">
          <qti-area-map-entry shape="circle" coords="10,10,5" mapped-value="2"/>
        </qti-area-mapping>
      </qti-response-declaration>
      <qti-item-body/>
      <qti-response-processing
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point"/>`);

    expect(buildScoreIndex(doc).has('RESPONSE')).toBe(false);
  });

  it('leaves template-scored identifiers out so callers fall back', () => {
    const doc = parseItem(`
      ${declaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>`);

    expect(buildScoreIndex(doc).size).toBe(0);
    expect(extractItemScore(doc)).toBe(1);
  });

  it('returns an empty index for an item with no response processing', () => {
    expect(buildScoreIndex(parseItem('<qti-item-body/>')).size).toBe(0);
  });

  it('skips the SCORE initialisation rule rather than reading it as a weight', () => {
    const doc = parseItem(`
      ${declaration('R1')}
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        ${condition('R1', 2)}
      </qti-response-processing>`);

    expect(buildScoreIndex(doc).get('R1')).toBe(2);
  });
});

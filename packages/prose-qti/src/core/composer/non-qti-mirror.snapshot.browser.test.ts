/**
 * Snapshot fixture — DOM COMPOSE PIPELINE
 *
 * Locks the byte-for-byte output of `buildAssessmentItemXml` from
 * @qti-editor/qti-core. This is the DOM-based compose pipeline that:
 *   - reads the canonical authoring attrs (`correct-response`, `score`,
 *     `case-sensitive`, `area-mappings`) off interaction source elements and
 *     folds them into `qti-response-declaration` / `qti-response-processing`,
 *   - strips those authoring attrs from the emitted standard-QTI interaction
 *     (no `data-*` mirrors — the editor emits standard QTI 3.0),
 *   - SYNTHESIZES additional elements (e.g. `<qti-rubric-block view="scorer"
 *     use="scoring">` for extended-text when `correct-response` is set).
 *
 * Runs as a browser test because the composer relies on `document.implementation
 * .createDocument`, `XMLSerializer`, and `crypto.randomUUID` which require a DOM.
 *
 * Do NOT use non-deterministic data (no Math.random / no Date.now / no random ids).
 * All identifiers below are stable; `crypto.randomUUID` is only invoked on
 * duplicate-identifier paths (not exercised by these single-interaction fixtures).
 */
import { describe, expect, it } from 'vitest';

import { buildAssessmentItemXml } from './index.js';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

function buildItemBody(innerXml: string): Document {
  const xml = `<qti-item-body xmlns="${QTI_NS}">${innerXml}</qti-item-body>`;
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function exportItemXml(identifier: string, innerBody: string): string {
  const itemBody = buildItemBody(innerBody);
  return buildAssessmentItemXml({ identifier, title: identifier, itemBody });
}

describe('non-QTI data-* mirror snapshots — DOM compose pipeline (Phase 1 baseline)', () => {
  it('choice interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-choice',
      `
        <qti-choice-interaction response-identifier="RESPONSE" correct-response="choice-a" score="2" max-choices="1">
          <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
          <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
        </qti-choice-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-choice" title="snap-choice" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"><qti-correct-response><qti-value>choice-a</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
                <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
                <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
              </qti-choice-interaction>
            </qti-item-body><qti-response-processing><qti-response-condition><qti-response-if><qti-match><qti-variable identifier="RESPONSE"/><qti-correct identifier="RESPONSE"/></qti-match><qti-set-outcome-value identifier="SCORE"><qti-sum><qti-variable identifier="SCORE"/><qti-base-value base-type="float">2</qti-base-value></qti-sum></qti-set-outcome-value></qti-response-if></qti-response-condition></qti-response-processing></qti-assessment-item>"
    `);
  });

  it('inline-choice interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-inline-choice',
      `
        <p>Pick:
          <qti-inline-choice-interaction response-identifier="INLINE" correct-response="ic-a" score="1">
            <qti-inline-choice identifier="ic-a">A</qti-inline-choice>
            <qti-inline-choice identifier="ic-b">B</qti-inline-choice>
          </qti-inline-choice-interaction>
        </p>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-inline-choice" title="snap-inline-choice" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"><qti-correct-response><qti-value>ic-a</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>1</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <p>Pick:
                <qti-inline-choice-interaction response-identifier="RESPONSE">
                  <qti-inline-choice identifier="ic-a">A</qti-inline-choice>
                  <qti-inline-choice identifier="ic-b">B</qti-inline-choice>
                </qti-inline-choice-interaction>
              </p>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/></qti-assessment-item>"
    `);
  });

  it('text-entry interaction: strips correct-response + score + case-sensitive and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-text-entry',
      `
        <p>
          <qti-text-entry-interaction
            response-identifier="TEXT"
            correct-response="alpha,beta"
            score="3"
            case-sensitive="true" />
        </p>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-text-entry" title="snap-text-entry" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"><qti-correct-response><qti-value>alpha</qti-value></qti-correct-response><qti-mapping default-value="0"><qti-map-entry map-key="alpha" mapped-value="3" case-sensitive="true"/><qti-map-entry map-key="beta" mapped-value="3" case-sensitive="true"/></qti-mapping></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>3</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <p>
                <qti-text-entry-interaction response-identifier="RESPONSE"/>
              </p>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"/></qti-assessment-item>"
    `);
  });

  it('extended-text interaction: strips correct-response, mirrors to data-*, synthesizes <qti-rubric-block>', () => {
    const xml = exportItemXml(
      'snap-extended-text',
      `
        <qti-extended-text-interaction response-identifier="EXTENDED" correct-response="Model answer" score="4" expected-lines="6" />
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-extended-text" title="snap-extended-text" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="EXTENDED" cardinality="single" base-type="string"/><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>4</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-extended-text-interaction response-identifier="EXTENDED" expected-lines="6"/>
            </qti-item-body></qti-assessment-item>"
    `);
  });

  it('associate interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-associate',
      `
        <qti-associate-interaction response-identifier="ASSOC" correct-response="a b" score="2" max-associations="1">
          <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
          <qti-simple-associable-choice identifier="b" match-max="1">B</qti-simple-associable-choice>
        </qti-associate-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-associate" title="snap-associate" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"><qti-correct-response><qti-value>a b</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-associate-interaction response-identifier="RESPONSE" max-associations="1">
                <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
                <qti-simple-associable-choice identifier="b" match-max="1">B</qti-simple-associable-choice>
              </qti-associate-interaction>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"/></qti-assessment-item>"
    `);
  });

  it('hottext interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-hottext',
      `
        <qti-hottext-interaction response-identifier="HOT" correct-response="ht-a" score="2" max-choices="1">
          <p>
            Select <qti-hottext identifier="ht-a">this</qti-hottext> or <qti-hottext identifier="ht-b">that</qti-hottext>.
          </p>
        </qti-hottext-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-hottext" title="snap-hottext" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"><qti-correct-response><qti-value>ht-a</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-hottext-interaction response-identifier="RESPONSE" max-choices="1">
                <p>
                  Select <qti-hottext identifier="ht-a">this</qti-hottext> or <qti-hottext identifier="ht-b">that</qti-hottext>.
                </p>
              </qti-hottext-interaction>
            </qti-item-body><qti-response-processing><qti-response-condition><qti-response-if><qti-match><qti-variable identifier="RESPONSE"/><qti-correct identifier="RESPONSE"/></qti-match><qti-set-outcome-value identifier="SCORE"><qti-sum><qti-variable identifier="SCORE"/><qti-base-value base-type="float">2</qti-base-value></qti-sum></qti-set-outcome-value></qti-response-if></qti-response-condition></qti-response-processing></qti-assessment-item>"
    `);
  });

  it('match interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-match',
      `
        <qti-match-interaction response-identifier="MATCH" correct-response="a x" score="2">
          <qti-simple-match-set>
            <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
          </qti-simple-match-set>
          <qti-simple-match-set>
            <qti-simple-associable-choice identifier="x" match-max="1">X</qti-simple-associable-choice>
          </qti-simple-match-set>
        </qti-match-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-match" title="snap-match" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair"><qti-correct-response><qti-value>a x</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-match-interaction response-identifier="RESPONSE">
                <qti-simple-match-set>
                  <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
                </qti-simple-match-set>
                <qti-simple-match-set>
                  <qti-simple-associable-choice identifier="x" match-max="1">X</qti-simple-associable-choice>
                </qti-simple-match-set>
              </qti-match-interaction>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/></qti-assessment-item>"
    `);
  });

  it('gap-match interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-gap-match',
      `
        <qti-gap-match-interaction response-identifier="GAP" correct-response='["g1 gap-a"]' score="2">
          <qti-gap-text identifier="g1" match-max="1">Word</qti-gap-text>
          <p>Fill: <qti-gap identifier="gap-a"/></p>
        </qti-gap-match-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-gap-match" title="snap-gap-match" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair"><qti-correct-response><qti-value>g1 gap-a</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-gap-match-interaction response-identifier="RESPONSE" max-associations="1">
                <qti-gap-text identifier="g1" match-max="1">Word</qti-gap-text>
                <p>Fill: <qti-gap identifier="gap-a"/></p>
              </qti-gap-match-interaction>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"/></qti-assessment-item>"
    `);
  });

  it('order interaction: strips correct-response + score and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-order',
      `
        <qti-order-interaction response-identifier="ORDER" correct-response="o-a,o-b,o-c" score="2">
          <qti-simple-choice identifier="o-a">A</qti-simple-choice>
          <qti-simple-choice identifier="o-b">B</qti-simple-choice>
          <qti-simple-choice identifier="o-c">C</qti-simple-choice>
        </qti-order-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-order" title="snap-order" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier"><qti-correct-response><qti-value>o-a</qti-value><qti-value>o-b</qti-value><qti-value>o-c</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-order-interaction response-identifier="RESPONSE">
                <qti-simple-choice identifier="o-a">A</qti-simple-choice>
                <qti-simple-choice identifier="o-b">B</qti-simple-choice>
                <qti-simple-choice identifier="o-c">C</qti-simple-choice>
              </qti-order-interaction>
            </qti-item-body><qti-response-processing><qti-response-condition><qti-response-if><qti-match><qti-variable identifier="RESPONSE"/><qti-correct identifier="RESPONSE"/></qti-match><qti-set-outcome-value identifier="SCORE"><qti-sum><qti-variable identifier="SCORE"/><qti-base-value base-type="float">2</qti-base-value></qti-sum></qti-set-outcome-value></qti-response-if></qti-response-condition></qti-response-processing></qti-assessment-item>"
    `);
  });

  it('select-point interaction: strips correct-response + score + area-mappings and mirrors to data-*', () => {
    const xml = exportItemXml(
      'snap-select-point',
      `
        <qti-select-point-interaction
          response-identifier="SP"
          correct-response="120 80"
          score="2"
          max-choices="1"
          area-mappings='{"defaultValue":0,"entries":[]}'>
          <qti-prompt><p>Click the point.</p></qti-prompt>
        </qti-select-point-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-select-point" title="snap-select-point" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="point"><qti-correct-response><qti-value>120 80</qti-value></qti-correct-response></qti-response-declaration><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-select-point-interaction response-identifier="RESPONSE" max-choices="1">
                
              <qti-prompt><p>Click the point.</p></qti-prompt></qti-select-point-interaction>
            </qti-item-body><qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml"/></qti-assessment-item>"
    `);
  });

  it('choice interaction with legacy camelCase correctResponse (Phase 4 alias-deletion guard)', () => {
    // The forward mapping table in `EDITOR_DATA_ATTRIBUTE_MAPPINGS` today contains
    // dead-code aliases `correctResponse` and `correctAnswer` →
    // `data-correct-response`. Per the plan, upstream
    // `renameLegacyHtmlAttributes` should rename camelCase to `correct-response`
    // before this pipeline ever sees the element. This snapshot captures the
    // CURRENT behavior; after Phase 4 deletes the dead aliases the snapshot must
    // still pass byte-identically — proving the aliases were unreachable.
    const xml = exportItemXml(
      'snap-choice-legacy-camel',
      `
        <qti-choice-interaction response-identifier="RESPONSE" correctResponse="choice-a" score="2" max-choices="1">
          <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
          <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
        </qti-choice-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="snap-choice-legacy-camel" title="snap-choice-legacy-camel" adaptive="false" time-dependent="false" xml:lang="en"><qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/><qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>0</qti-value></qti-default-value></qti-outcome-declaration><qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"><qti-default-value><qti-value>2</qti-value></qti-default-value></qti-outcome-declaration><qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
              <qti-choice-interaction response-identifier="RESPONSE" correctResponse="choice-a" max-choices="1">
                <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
                <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
              </qti-choice-interaction>
            </qti-item-body><qti-response-processing><qti-response-condition><qti-response-if><qti-match><qti-variable identifier="RESPONSE"/><qti-correct identifier="RESPONSE"/></qti-match><qti-set-outcome-value identifier="SCORE"><qti-sum><qti-variable identifier="SCORE"/><qti-base-value base-type="float">2</qti-base-value></qti-sum></qti-set-outcome-value></qti-response-if></qti-response-condition></qti-response-processing></qti-assessment-item>"
    `);
  });
});

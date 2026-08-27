/**
 * The response-processing recogniser.
 *
 * One case per shape the corpus actually contains, plus shapes that must land in
 * `unrecognized` rather than being guessed at. The guessing is what this
 * replaces: everything that was not `match_correct` used to read as "no response
 * processing", so a mapping-scored item silently became all-or-nothing.
 */
import { describe, expect, it } from 'vitest';

import {
  analyzeResponseProcessing,
  normalizeTemplateUri,
  readAreaMapping,
  readStringMapping,
} from './response-processing.js';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

function parseItem(inner: string): XMLDocument {
  const doc = new DOMParser().parseFromString(
    `<qti-assessment-item xmlns="${QTI_NS}" identifier="i" title="t">${inner}</qti-assessment-item>`,
    'application/xml',
  );
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
}

const identifierDeclaration = (identifier: string) => `
  <qti-response-declaration identifier="${identifier}" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>`;

/** A declaration whose scoring lives in a mapping, as 13 of the 16 corpus items do. */
const mappedDeclaration = (identifier: string, entries: Array<[string, number]>) => `
  <qti-response-declaration identifier="${identifier}" cardinality="multiple" base-type="identifier">
    <qti-mapping default-value="0" lower-bound="0">
      ${entries.map(([key, value]) => `<qti-map-entry map-key="${key}" mapped-value="${value}"/>`).join('')}
    </qti-mapping>
  </qti-response-declaration>`;

const kinds = (doc: XMLDocument) => Object.fromEntries(analyzeResponseProcessing(doc).kindByIdentifier);

describe('normalizeTemplateUri', () => {
  // The runtime reduces a URI to its last path segment minus `.xml`, so these
  // are all the same template to it. The repo emits both forms — select-point
  // uses the suffix, nothing else does.
  it.each([
    ['https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct', 'match_correct'],
    ['https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml', 'match_correct'],
    ['https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point.xml', 'map_response_point'],
    ['http://www.imsglobal.org/question/qti_v2p1/rptemplates/map_response', 'map_response'],
    ['https://vendor.example/custom/our_own_thing', 'our_own_thing'],
  ])('%s → %s', (uri, expected) => {
    expect(normalizeTemplateUri(uri)).toBe(expected);
  });
});

describe('template attribute', () => {
  it.each([
    ['match_correct', 'match_correct'],
    ['map_response', 'map_response'],
    ['map_response_point.xml', 'map_response_point'],
  ])('recognises template=%s', (segment, expected) => {
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/${segment}"/>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.templateKind).toBe(expected);
    expect(facts.kindByIdentifier.get('RESPONSE')).toBe(expected);
    expect(facts.unrecognized).toHaveLength(0);
  });

  it('reports a template URI naming nothing it knows', () => {
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing template="https://vendor.example/rp/bespoke_curve"/>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.templateKind).toBeNull();
    expect(facts.unrecognizedTemplate).toBe('https://vendor.example/rp/bespoke_curve');
    expect(facts.unrecognized).toHaveLength(1);
  });

  it('does not read inline rules alongside a template', () => {
    // Not a preference: the runtime replaces its own children with the built-in
    // template, so rules sitting next to a template never run in delivery either.
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct">
        <qti-set-outcome-value identifier="SCORE">
          <qti-map-response identifier="RESPONSE"/>
        </qti-set-outcome-value>
      </qti-response-processing>`);

    expect(analyzeResponseProcessing(doc).kindByIdentifier.get('RESPONSE')).toBe('match_correct');
  });
});

describe('inline rules — the shapes the corpus actually uses', () => {
  it('reads a bare qti-map-response (ITEM001-004, 006-010, 012, 015)', () => {
    const doc = parseItem(`
      ${mappedDeclaration('RESPONSE', [['choice1', 1]])}
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-map-response identifier="RESPONSE"/>
        </qti-set-outcome-value>
      </qti-response-processing>`);

    expect(kinds(doc)).toEqual({ RESPONSE: 'map_response' });
    expect(analyzeResponseProcessing(doc).unrecognized).toHaveLength(0);
  });

  it('reads qti-map-response-point (ITEM016)', () => {
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="point">
        <qti-area-mapping default-value="0">
          <qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>
        </qti-area-mapping>
      </qti-response-declaration>
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-map-response-point identifier="RESPONSE"/>
        </qti-set-outcome-value>
      </qti-response-processing>`);

    expect(kinds(doc)).toEqual({ RESPONSE: 'map_response_point' });
  });

  it('reads a qti-sum of several qti-map-response (ITEM011)', () => {
    // Three hottext responses scored by ONE qti-set-outcome-value, so the
    // identifiers sit a level down inside the sum.
    const doc = parseItem(`
      ${mappedDeclaration('RESPONSE1', [['ht_door', 1]])}
      ${mappedDeclaration('RESPONSE2', [['ht_analyse', 1]])}
      ${mappedDeclaration('RESPONSE3', [['ht_flexibiliteit', 1]])}
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-sum>
            <qti-map-response identifier="RESPONSE1"/>
            <qti-map-response identifier="RESPONSE2"/>
            <qti-map-response identifier="RESPONSE3"/>
          </qti-sum>
        </qti-set-outcome-value>
      </qti-response-processing>`);

    expect(kinds(doc)).toEqual({
      RESPONSE1: 'map_response',
      RESPONSE2: 'map_response',
      RESPONSE3: 'map_response',
    });
    expect(analyzeResponseProcessing(doc).unrecognized).toHaveLength(0);
  });

  it('reads a written-out match_correct condition and its literal award (ITEM013-014)', () => {
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE"/>
              <qti-correct identifier="RESPONSE"/>
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-sum>
                <qti-variable identifier="SCORE"/>
                <qti-base-value base-type="float">4</qti-base-value>
              </qti-sum>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
      </qti-response-processing>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.kindByIdentifier.get('RESPONSE')).toBe('match_correct');
    expect(facts.literalScoreByIdentifier.get('RESPONSE')).toBe(4);
    // The leading SCORE=0 initialisation is structural, not a mystery rule.
    expect(facts.unrecognized).toHaveLength(0);
  });

  it('does not mistake the SCORE accumulator for the response under test', () => {
    const doc = parseItem(`
      ${identifierDeclaration('R1')}
      <qti-item-body/>
      <qti-response-processing>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="R1"/>
              <qti-correct identifier="R1"/>
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-sum>
                <qti-variable identifier="SCORE"/>
                <qti-base-value base-type="float">2</qti-base-value>
              </qti-sum>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
      </qti-response-processing>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.kindByIdentifier.has('SCORE')).toBe(false);
    expect(facts.kindByIdentifier.get('R1')).toBe('match_correct');
  });
});

describe('what it refuses to guess at', () => {
  it('reports a rule targeting an outcome other than SCORE', () => {
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">show_hint</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-processing>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.unrecognized).toHaveLength(1);
    expect(facts.unrecognized[0].getAttribute('identifier')).toBe('FEEDBACK');
  });

  it('reports a rule shape it has no model for', () => {
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      <qti-item-body/>
      <qti-response-processing>
        <qti-lookup-outcome-value identifier="SCORE">
          <qti-variable identifier="RESPONSE"/>
        </qti-lookup-outcome-value>
      </qti-response-processing>`);

    const facts = analyzeResponseProcessing(doc);
    expect(facts.unrecognized).toHaveLength(1);
    expect(facts.unrecognized[0].tagName.toLowerCase()).toBe('qti-lookup-outcome-value');
  });
});

describe('falling back to the declaration', () => {
  it('gives a mapping-only declaration map_response even with no rules at all', () => {
    // The honest answer for a hand-written item whose rules cannot be parsed:
    // read the declaration rather than defaulting to match_correct.
    const doc = parseItem(`
      ${mappedDeclaration('RESPONSE', [['choice1', 1]])}
      <qti-item-body/>`);

    expect(kinds(doc)).toEqual({ RESPONSE: 'map_response' });
  });

  it('covers the declarations a template says nothing about', () => {
    // The built-in templates hardcode `RESPONSE`, so a second declaration would
    // otherwise be left with no kind.
    const doc = parseItem(`
      ${identifierDeclaration('RESPONSE')}
      ${mappedDeclaration('OTHER', [['x', 1]])}
      <qti-item-body/>
      <qti-response-processing
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>`);

    expect(kinds(doc)).toEqual({ RESPONSE: 'match_correct', OTHER: 'map_response' });
  });

  it('leaves an unscorable declaration without a kind (ITEM005)', () => {
    // Manually-marked extended text: no correct response, no mapping. No kind is
    // the right answer, not a guessed one.
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" base-type="string" cardinality="single"/>
      <qti-item-body/>`);

    expect(kinds(doc)).toEqual({});
  });

  it('never lets the declaration shape override a rule', () => {
    // The rules are what the delivery engine runs, so they win over the
    // declaration's appearance.
    const doc = parseItem(`
      ${mappedDeclaration('RESPONSE', [['choice1', 1]])}
      <qti-item-body/>
      <qti-response-processing>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE"/>
              <qti-correct identifier="RESPONSE"/>
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">1</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
      </qti-response-processing>`);

    expect(kinds(doc)).toEqual({ RESPONSE: 'match_correct' });
  });
});

describe('reading mappings off a declaration', () => {
  it('reads values, default and both bounds', () => {
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-mapping default-value="0" lower-bound="0" upper-bound="2">
          <qti-map-entry map-key="choice1" mapped-value="1"/>
          <qti-map-entry map-key="choice3" mapped-value="-1"/>
        </qti-mapping>
      </qti-response-declaration>
      <qti-item-body/>`);

    expect(readStringMapping(doc.querySelector('qti-response-declaration')!)).toEqual({
      defaultValue: 0,
      lowerBound: 0,
      upperBound: 2,
      entries: [
        { mapKey: 'choice1', mappedValue: 1 },
        { mapKey: 'choice3', mappedValue: -1 },
      ],
    });
  });

  it('leaves case-sensitive absent rather than defaulting it', () => {
    // Only two corpus items write it; materialising a default would add the
    // attribute to every other item's export.
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-mapping default-value="0">
          <qti-map-entry map-key="cat" mapped-value="1"/>
          <qti-map-entry map-key="Cat" mapped-value="1" case-sensitive="true"/>
        </qti-mapping>
      </qti-response-declaration>
      <qti-item-body/>`);

    const mapping = readStringMapping(doc.querySelector('qti-response-declaration')!);
    expect(mapping?.entries[0]).not.toHaveProperty('caseSensitive');
    expect(mapping?.entries[1]).toMatchObject({ caseSensitive: true });
    expect(mapping?.lowerBound).toBeNull();
  });

  it('reads an area mapping, keeping only shapes the editor models', () => {
    const doc = parseItem(`
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="point">
        <qti-area-mapping default-value="0" lower-bound="0">
          <qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>
          <qti-area-map-entry shape="poly" coords="1,2,3,4,5,6" mapped-value="1"/>
        </qti-area-mapping>
      </qti-response-declaration>
      <qti-item-body/>`);

    const mapping = readAreaMapping(doc.querySelector('qti-response-declaration')!);
    expect(mapping?.entries).toEqual([{ shape: 'circle', coords: '191,393,10', mappedValue: 1 }]);
    expect(mapping?.lowerBound).toBe(0);
  });

  it('returns null when there is no mapping to read', () => {
    const doc = parseItem(`${identifierDeclaration('RESPONSE')}<qti-item-body/>`);
    const declaration = doc.querySelector('qti-response-declaration')!;
    expect(readStringMapping(declaration)).toBeNull();
    expect(readAreaMapping(declaration)).toBeNull();
  });
});

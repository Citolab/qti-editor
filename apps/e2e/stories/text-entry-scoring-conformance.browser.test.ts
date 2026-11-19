/**
 * Scoring on a text entry, through the real round trip (`qti3ToPm` → `pmToQti3`, the
 * `createQtiSchema()` schema).
 *
 * The unscored items are 1EdTech QTI 3 conformance items, copied unchanged from qti-components'
 * `public/assets/qti-conformance/Basic/Q20/`. Each declares `RESPONSE` with no
 * `qti-correct-response`, no `qti-mapping` and no `qti-response-processing`: the author wrote no
 * scoring. On `main` the export added `rptemplates/map_response` anyway, with no `qti-mapping` for it
 * to map through — scoring nobody wrote, and invalid besides (the template needs a mapping on
 * `RESPONSE`; a validator reports it as QTI-SEM-007).
 *
 * The scored side is ITEM003, whose accepted answer must keep exporting `map_response` and its
 * mapping exactly as before.
 */
import { pmToQti3, qti3ToPm } from '@citolab/prose-qti/item-roundtrip';
import { describe, expect, test } from 'vitest';

import item003 from './fixtures/ITEM003.xml?raw';
import textEntrySv1 from './fixtures/qti-conformance/text-entry-sv-1.xml?raw';
import textEntrySv2a from './fixtures/qti-conformance/text-entry-sv-2a.xml?raw';
import textEntrySv2b from './fixtures/qti-conformance/text-entry-sv-2b.xml?raw';
import textEntrySv3 from './fixtures/qti-conformance/text-entry-sv-3.xml?raw';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';
const MAP_RESPONSE = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response';

const roundTrip = (xml: string) => pmToQti3(qti3ToPm(xml));
const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
const all = (doc: Document, localName: string) => Array.from(doc.getElementsByTagNameNS(QTI_NS, localName));

/** An outcome's default value, or null when the outcome is not declared. */
const outcomeDefault = (doc: Document, identifier: string): string | null => {
  const outcome = all(doc, 'qti-outcome-declaration').find(el => el.getAttribute('identifier') === identifier);
  if (!outcome) return null;
  return outcome.getElementsByTagNameNS(QTI_NS, 'qti-value')[0]?.textContent?.trim() ?? '';
};

const unscored = {
  'text-entry-sv-1.xml': textEntrySv1,
  'text-entry-sv-2a.xml': textEntrySv2a,
  'text-entry-sv-2b.xml': textEntrySv2b,
  'text-entry-sv-3.xml': textEntrySv3,
};

describe.each(Object.entries(unscored))('Q20 %s, a text entry with no scoring', (_name, source) => {
  test('the source really carries no scoring — the premise of every other test here', () => {
    const doc = parseXml(source);
    expect(all(doc, 'qti-correct-response')).toHaveLength(0);
    expect(all(doc, 'qti-mapping')).toHaveLength(0);
    expect(all(doc, 'qti-response-processing')).toHaveLength(0);
  });

  test('exports no response processing, so no map_response template', () => {
    const xml = roundTrip(source);
    expect(xml).not.toContain(MAP_RESPONSE);
    expect(all(parseXml(xml), 'qti-response-processing')).toHaveLength(0);
  });

  test('invents no answer and no mapping on the declaration', () => {
    const doc = parseXml(roundTrip(source));
    const declarations = all(doc, 'qti-response-declaration');
    expect(declarations.map(el => el.getAttribute('identifier'))).toEqual(['RESPONSE']);
    expect(declarations[0].getAttribute('base-type')).toBe('string');
    expect(declarations[0].children).toHaveLength(0);
  });

  test('declares SCORE 0 and MAXSCORE 1, as an extended text with no automated award does', () => {
    // The points are a human's to award. SCORE stays at its default until someone sets it, and
    // MAXSCORE says what the interaction is worth — the same pair an extended text exports.
    const doc = parseXml(roundTrip(source));
    expect(outcomeDefault(doc, 'SCORE')).toBe('0');
    expect(outcomeDefault(doc, 'MAXSCORE')).toBe('1');
  });

  test('a second round trip adds no scoring either', () => {
    // Scoring only, not byte identity: the formatter moves the whitespace around a `<br/>` and
    // MathML on every pass, which is unrelated to what is tested here.
    const doc = parseXml(roundTrip(roundTrip(source)));
    expect(all(doc, 'qti-response-processing')).toHaveLength(0);
    expect(all(doc, 'qti-response-declaration')[0].children).toHaveLength(0);
  });
});

describe('ITEM003, a text entry with an accepted answer', () => {
  test('still exports the map_response template', () => {
    const doc = parseXml(roundTrip(item003));
    const processing = all(doc, 'qti-response-processing');
    expect(processing).toHaveLength(1);
    expect(processing[0].getAttribute('template')).toBe(MAP_RESPONSE);
    expect(processing[0].children).toHaveLength(0);
  });

  test('still exports its correct response and the mapping the template reads', () => {
    const doc = parseXml(roundTrip(item003));
    const declaration = all(doc, 'qti-response-declaration')[0];
    expect(declaration.getAttribute('identifier')).toBe('RESPONSE');
    expect(all(doc, 'qti-correct-response')[0]?.textContent?.trim()).toBe('refractie');

    const mapping = all(doc, 'qti-mapping');
    expect(mapping).toHaveLength(1);
    expect(mapping[0].getAttribute('default-value')).toBe('0');
    expect(all(doc, 'qti-map-entry').map(entry => [
      entry.getAttribute('map-key'),
      entry.getAttribute('mapped-value'),
      entry.getAttribute('case-sensitive'),
    ])).toEqual([['refractie', '1', 'false']]);

    expect(outcomeDefault(doc, 'MAXSCORE')).toBe('1');
  });
});

describe('a scored choice next to an unscored text entry', () => {
  // Built from Q20 sv-1: same unscored text entry, plus a choice with a correct answer.
  const mixed = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="mixed" title="Mixed" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="CHOICE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-response-declaration identifier="TEXT" cardinality="single" base-type="string"/>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-choice-interaction response-identifier="CHOICE" max-choices="1">
      <qti-simple-choice identifier="A">Amsterdam</qti-simple-choice>
      <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
    </qti-choice-interaction>
    <p>Why? <qti-text-entry-interaction response-identifier="TEXT"/></p>
  </qti-item-body>
  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match><qti-variable identifier="CHOICE"/><qti-correct identifier="CHOICE"/></qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
    </qti-response-condition>
  </qti-response-processing>
</qti-assessment-item>`;

  test('keeps the choice scored, and scores nothing for the text entry', () => {
    const doc = parseXml(roundTrip(mixed));
    const processing = all(doc, 'qti-response-processing');
    expect(processing).toHaveLength(1);
    expect(processing[0].hasAttribute('template')).toBe(false);

    // The choice's all-or-nothing condition, and nothing else.
    expect(all(doc, 'qti-correct').map(el => el.getAttribute('identifier'))).toEqual(['CHOICE']);
    expect(all(doc, 'qti-map-response')).toHaveLength(0);
    expect(all(doc, 'qti-mapping')).toHaveLength(0);
  });

  test('the text entry declaration stays bare', () => {
    const doc = parseXml(roundTrip(mixed));
    const text = all(doc, 'qti-response-declaration').find(el => el.getAttribute('identifier') === 'TEXT');
    expect(text?.children).toHaveLength(0);
  });
});

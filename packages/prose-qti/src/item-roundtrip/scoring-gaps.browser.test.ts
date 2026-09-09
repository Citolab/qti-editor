/**
 * Response processing this editor cannot model, through the real import pipeline.
 *
 * `findUnrepresentableResponseProcessing` had no caller and no test for as long as it existed. Both
 * facts had one cause: it must read the whole `<qti-assessment-item>`, and `itemBodyFromString`
 * returns a document whose root `reduceToItemBody` has already thrown away. So the scan was correct,
 * unreachable, and unverified — and an item scored by a template this editor does not know imported
 * looking perfectly fine and worth zero marks.
 *
 * These tests go through `itemBodyAndGapsFromString` rather than calling the scan directly, because
 * the ordering *is* the thing that was broken. A test that handed the scan a full item would pass
 * against the version of this code where nothing could reach it.
 */
import { describe, expect, test } from 'vitest';

import { itemBodyAndGapsFromString, itemBodyFromString } from './import.js';

/** A minimal item, with whatever response processing the caller wants to put in it. */
const item = (responseProcessing: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="ITEM" title="Scoring">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <p>Pick one.</p>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A">Amsterdam</qti-simple-choice>
      <qti-simple-choice identifier="B">Brussel</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  ${responseProcessing}
</qti-assessment-item>`;

/** The all-or-nothing model, written out the way the corpus writes it. */
const MATCH_CORRECT_INLINE = `<qti-response-processing>
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
  </qti-response-processing>`;

describe('itemBodyAndGapsFromString', () => {
  test('says nothing about scoring this editor can model', () => {
    const { scoringGaps } = itemBodyAndGapsFromString(item(MATCH_CORRECT_INLINE));

    // The claim that matters most. A notice that fires on every import is a notice nobody reads.
    expect(scoringGaps.changes).toEqual([]);
    expect(scoringGaps.preservedFragments).toEqual([]);
  });

  test('says nothing when there is no response processing at all', () => {
    const { scoringGaps } = itemBodyAndGapsFromString(item(''));
    expect(scoringGaps.changes).toEqual([]);
  });

  test('names a scoring template it does not know, and keeps the rule verbatim', () => {
    const { scoringGaps } = itemBodyAndGapsFromString(item(
      '<qti-response-processing template="https://example.org/rptemplates/map_response_partial"/>',
    ));

    expect(scoringGaps.changes).toHaveLength(1);
    const [change] = scoringGaps.changes;
    expect(change.kind).toBe('unrepresentable-element');
    // Distinct from the DOM scan's code, because this is a different kind of news.
    expect(change.code).toBe('UNSUPPORTED_CONTENT_PRESERVED');
    // The full URI, not the normalised name: it is what the file actually said, which is what a
    // person chasing the item needs. `normalizeTemplateUri` is for matching, not for reporting.
    expect(change.data?.template).toBe('https://example.org/rptemplates/map_response_partial');
    expect(change.message).toContain('map_response_partial');

    // Preserved verbatim, so the scoring exists somewhere even though the editor cannot hold it.
    expect(scoringGaps.preservedFragments[0].payload).toContain('qti-response-processing');
  });

  test('names an inline rule it cannot classify', () => {
    const { scoringGaps } = itemBodyAndGapsFromString(item(`<qti-response-processing>
      <qti-response-condition>
        <qti-response-if>
          <qti-custom-operator definition="urn:example:partial-credit">
            <qti-variable identifier="RESPONSE"/>
          </qti-custom-operator>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">0.5</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
      </qti-response-condition>
    </qti-response-processing>`));

    expect(scoringGaps.changes.length).toBeGreaterThan(0);
    expect(scoringGaps.changes.every(change => change.code === 'UNSUPPORTED_CONTENT_PRESERVED')).toBe(true);
    // The path names where in the response processing the rule sat, for a log or a bug report.
    expect(scoringGaps.changes[0].path).toContain('qti-response-processing');
  });

  test('the item body it returns is the same one the plain entry point returns', () => {
    // The scan must be a pure observation. If adding it changed the document, every existing
    // caller's behaviour would have moved underneath them.
    const xml = item(MATCH_CORRECT_INLINE);
    const withGaps = itemBodyAndGapsFromString(xml);
    const plain = itemBodyFromString(xml);

    expect(withGaps.itemBody.documentElement.localName).toBe('qti-item-body');
    expect(new XMLSerializer().serializeToString(withGaps.itemBody))
      .toBe(new XMLSerializer().serializeToString(plain));
  });

  test('the plain entry point still cannot see scoring — which is why this pairing exists', () => {
    // Not a limitation being documented for its own sake: this is the reason the scan needs an
    // entry point of its own rather than being something a caller assembles.
    const itemBody = itemBodyFromString(item(
      '<qti-response-processing template="https://example.org/rptemplates/map_response_partial"/>',
    ));

    expect(itemBody.querySelector('qti-response-processing')).toBeNull();
  });

  test('getMessage replaces the wording without touching the facts', () => {
    const { scoringGaps } = itemBodyAndGapsFromString(
      item('<qti-response-processing template="https://example.org/rptemplates/map_response_partial"/>'),
      { getMessage: change => `NL: scoring ${String(change.data?.template)} niet ondersteund` },
    );

    expect(scoringGaps.changes[0].message)
      .toBe('NL: scoring https://example.org/rptemplates/map_response_partial niet ondersteund');
    expect(scoringGaps.changes[0].data?.template)
      .toBe('https://example.org/rptemplates/map_response_partial');
  });
});

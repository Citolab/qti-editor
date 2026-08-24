/**
 * The XML import path's guard rail.
 *
 * The document corpus in `schema/` guards the JSON migration ladder; this guards the other door.
 * Two things it has to keep true, and they pull in opposite directions:
 *
 *   1. **Silence on the corpus.** Every sample item must import with nothing to report. A notice that
 *      fires on every import trains the reader to dismiss it unread, and the next one — the one about
 *      content that really went missing — is dismissed just as fast.
 *   2. **Noise on real loss.** An element the schema genuinely cannot hold must be named. That is the
 *      whole point, and it is the half that cannot be tested by importing files that already work.
 *
 * If (1) starts failing, either a node spec lost a `parseDOM` rule or a new wrapper appeared in the
 * corpus — check which before adding anything to `TRANSPARENT_WRAPPER_TAGS`, because that list is
 * how findings get silenced and it should only ever hold wrappers whose children are the content.
 */
import { describe, expect, test } from 'vitest';

import { importXmlFromText } from './importXml.js';

const SAMPLE_ITEM_IDS = Array.from(
  { length: 16 },
  (_, index) => `ITEM${String(index + 1).padStart(3, '0')}`,
);

/** An item using an interaction the editor has no node for. */
const ITEM_WITH_UNSUPPORTED_INTERACTION = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="UNSUPPORTED" title="Unsupported interaction">
  <qti-item-body>
    <p>Match each capital to its country.</p>
    <qti-associate-interaction response-identifier="RESPONSE" max-associations="3">
      <qti-prompt>Pair them up</qti-prompt>
      <qti-simple-associable-choice identifier="A" match-max="1">Amsterdam</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="B" match-max="1">Netherlands</qti-simple-associable-choice>
    </qti-associate-interaction>
  </qti-item-body>
</qti-assessment-item>`;

describe('QTI XML import', () => {
  test.each(SAMPLE_ITEM_IDS)('%s imports with nothing to report', async id => {
    const response = await fetch(`/qti/kennisnet/${id}.xml`);
    expect(response.ok).toBe(true);

    const result = importXmlFromText(await response.text());

    expect(result.gaps.changes.map(change => change.nodeType)).toEqual([]);
    expect(result.json.type).toBe('doc');
  });

  test('names an interaction the schema cannot represent, and quotes it', () => {
    const result = importXmlFromText(ITEM_WITH_UNSUPPORTED_INTERACTION);

    const reported = result.gaps.changes.map(change => change.nodeType);
    expect(reported).toContain('qti-associate-interaction');

    const finding = result.gaps.changes.find(
      change => change.nodeType === 'qti-associate-interaction',
    );
    expect(finding?.data?.excerpt).toContain('Pair them up');
    // The element is preserved verbatim, so the content exists even though the document cannot hold it.
    expect(result.gaps.preservedFragments[0].payload).toContain('qti-simple-associable-choice');

    // And the rest of the item still imported — the point of unwrapping rather than refusing.
    expect(JSON.stringify(result.json)).toContain('Match each capital to its country.');
  });
});

import { expect, test } from 'vitest';

import { exportAssessmentItemDoc, importItem011 } from './qti-hottext-interaction-item011.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM011-editor.xml?raw';

test('exported QTI matches the ITEM011-editor.xml snapshot', async () => {
  const exported = exportAssessmentItemDoc(importItem011());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM011-editor.xml');
});

// ITEM011 has THREE independent single-cardinality hottext blanks, each with its
// own response variable:
//   RESPONSE1 -> ht_door          ("door")
//   RESPONSE2 -> ht_analyse       ("analyse")
//   RESPONSE3 -> ht_flexibiliteit ("flexibiliteit")
//
// Scoring cannot be asserted here — see the skipped test at the bottom — but the
// clicking itself can be, so these tests cover what the runtime stages.

type Harness = Awaited<ReturnType<typeof mountQtiRuntime>>;

/**
 * Clicks a hottext by its word.
 *
 * `.first()` disambiguates: some hottexts wrap inline markup (e.g.
 * `<qti-hottext><em>medewerkers</em></qti-hottext>`), so the text matches both
 * the hottext and its inner element. The hottext comes first in DOM order.
 */
const clickHottext = (harness: Harness, word: string) =>
  harness.frame.getByText(word, { exact: true }).first().click();

test('ITEM011 stages each blank independently as the candidate clicks', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await clickHottext(harness, 'door');
  expect(harness.response('RESPONSE1')).toBe('ht_door');
  expect(harness.response('RESPONSE2')).toBeNull();
  expect(harness.response('RESPONSE3')).toBeNull();

  await clickHottext(harness, 'analyse');
  await clickHottext(harness, 'flexibiliteit');

  expect(harness.response('RESPONSE1')).toBe('ht_door');
  expect(harness.response('RESPONSE2')).toBe('ht_analyse');
  expect(harness.response('RESPONSE3')).toBe('ht_flexibiliteit');

  harness.destroy();
});

test('ITEM011 keeps each blank single-cardinality — a second click replaces the first', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  // Both "door" and "tekort" belong to RESPONSE1.
  await clickHottext(harness, 'tekort');
  expect(harness.response('RESPONSE1')).toBe('ht_tekort');

  await clickHottext(harness, 'door');
  expect(harness.response('RESPONSE1')).toBe('ht_door');

  harness.destroy();
});

test('ITEM011 records a wrong choice in the blank it belongs to', async () => {
  const harness = await mountQtiRuntime(snapshotXml);

  await clickHottext(harness, 'medewerkers');

  // "medewerkers" is a distractor for the third blank.
  expect(harness.response('RESPONSE3')).toBe('ht_medewerkers');
  expect(harness.response('RESPONSE1')).toBeNull();

  harness.destroy();
});

// Still skipped — the limitation is in the runtime's scoring, not the UI.
test.skip('ITEM011 scores 1 when all 3 blanks have the correct answer', async () => {
  // Upstream limitation: @citolab/qti-components' qti-match.getVariables()
  // throws "Cannot read properties of undefined (reading 'variables')" for
  // any item whose response-processing is *written out* in the assessment
  // item rather than referenced via the standard match_correct template URL.
  // ITEM011 has 3 RESPONSE declarations → the composer writes the
  // response-processing inline → the runtime can't score it.
  //
  // The tests above now cover the interaction itself, and the snapshot test
  // covers editor-side pipeline regressions. Re-enable this once the upstream
  // qti-match expression resolves its context for written-out
  // response-processing trees.
});

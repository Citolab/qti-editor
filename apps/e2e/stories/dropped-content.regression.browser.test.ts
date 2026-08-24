/**
 * Dropped content, at the level where it has consequences.
 *
 * The unit tests in `packages/prose-qti/src/schema-recovery/` prove the scan's rules and the app
 * tests prove it is wired up. Neither can answer the question an author would ask: *if the editor
 * dropped it, what happens to my item when I save?* That needs the whole pipeline — import, edit,
 * export — which is what this suite has.
 *
 * The answer is the uncomfortable one, and it is the reason the notice had to be built: the export is
 * a complete, valid QTI item with the interaction **gone**. Saving over the source destroys it. So
 * these tests assert the loss rather than guarding against it — it is inherent in importing into a
 * schema that cannot hold the content — and pin the two things that make it survivable: the loss is
 * *named*, and it is *bounded* (everything else still roundtrips).
 */
import { expect, test } from 'vitest';

import {
  dutchRecoveryMessage,
  exportAsStranger,
  findNativeGaps,
  findStrangerGaps,
  importAsStranger,
} from './dropped-content.regression.stories';

test('an interaction the schema cannot hold is named, counted and quoted', () => {
  const gaps = findStrangerGaps();

  const reported = gaps.changes.map(change => change.nodeType);
  expect(reported).toContain('qti-gap-match-interaction');

  const finding = gaps.changes.find(change => change.nodeType === 'qti-gap-match-interaction');
  // The excerpt is the author's own text, which is the only part that tells them whether the loss
  // mattered — ITEM015's draggable words and the sentence they belong in, not a type name.
  expect(finding?.data?.excerpt).toContain('basisch');
  expect(finding?.data?.excerpt).toContain('oplossing met een pH');

  // Preserved verbatim: the content exists somewhere even though the document cannot hold it.
  const preserved = gaps.preservedFragments.find(
    fragment => fragment.nodeType === 'qti-gap-match-interaction',
  );
  expect(preserved?.payload).toContain('qti-gap-text');
});

test('a host reading the report in its own language gets it in its own language', () => {
  // The other seam. The notice on screen renders from the facts — `kind`, `nodeType`,
  // `data.excerpt` — so this override is for whatever else consumes the report: a log, a support
  // channel, a host with its own UI. Asserted here because it is deliberately not visible in the
  // story.
  const gaps = findStrangerGaps({ getMessage: dutchRecoveryMessage });

  const finding = gaps.changes.find(change => change.nodeType === 'qti-gap-match-interaction');
  expect(finding?.message).toBe(
    '<qti-gap-match-interaction> kan hier niet worden weergegeven; de inhoud is bewaard.',
  );

  // The facts are untouched by the translation — that is what makes them the contract.
  expect(finding?.kind).toBe('unrepresentable-element');
  expect(finding?.data?.excerpt).toContain('basisch');

  // And with no resolver the same call is English, so the override is doing the work rather than a
  // locale being wired in somewhere upstream.
  const english = findStrangerGaps().changes.find(
    change => change.nodeType === 'qti-gap-match-interaction',
  );
  expect(english?.message).toContain('cannot represent');
});

test('the same item in an editor that models it reports nothing', () => {
  // Without this, the test above proves only that the scan fires — not that it fires for a reason.
  // Same fixture, same transforms, same base schema; the one difference is the interaction.
  expect(findNativeGaps().changes.map(change => change.nodeType)).toEqual([]);
});

test('the item still imports around the hole', () => {
  const doc = importAsStranger();

  // The document is legal for the schema that just refused part of its source.
  expect(() => doc.check()).not.toThrow();
  expect(doc.attrs.identifier).toBe('ITEM015');

  // No gap-match node anywhere — it was unwrapped, not coerced into something else.
  const types = new Set<string>();
  doc.descendants(node => {
    types.add(node.type.name);
    return true;
  });
  expect([...types].filter(name => name.toLowerCase().includes('gapmatch'))).toEqual([]);

  // But the prose around it survived, including the rubric block every Kennisnet item carries.
  expect(doc.textContent.trim().length).toBeGreaterThan(0);
  expect(types.has('qtiRubricBlock')).toBe(true);
});

test('the export is a valid item with the interaction gone — which is why the loss must be reported', () => {
  const exported = exportAsStranger(importAsStranger());

  // Still a complete assessment item: this is what would be written back over the source file.
  expect(exported.documentElement.localName).toBe('qti-assessment-item');
  expect(exported.querySelector('qti-item-body')).not.toBeNull();

  // And the interaction is not in it, nor is its response declaration.
  expect(exported.querySelector('qti-gap-match-interaction')).toBeNull();
  expect(exported.querySelector('qti-gap-text')).toBeNull();
  expect(
    exported.querySelector('qti-response-declaration[identifier="RESPONSE"]'),
  ).toBeNull();

  // Bounded, not catastrophic — the surviving content made it through the roundtrip intact.
  const bodyText = exported.querySelector('qti-item-body')?.textContent?.trim() ?? '';
  expect(bodyText.length).toBeGreaterThan(0);
});

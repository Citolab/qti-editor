import { expect, test } from 'vitest';

// Relative for the same reason as document-corpus.browser.test.ts: `schema/` sits outside the root
// tsconfig's `include`, so the `@citolab/*` path aliases do not reach it.
import { CURRENT_JSON_DOCUMENT_VERSION } from '../apps/qti-prosekit-app/src/lib/compatibility/json.js';
import { buildEditorSchema } from './editor-schema';
import { fingerprintSchema } from './schema-fingerprint';
import baseline from './schema-fingerprint.json';

import type { SchemaFingerprint } from './schema-fingerprint';

/**
 * Catches a schema change that would stop an existing document loading — including in the corners
 * the corpus does not reach.
 *
 * The corpus next door proves that specific documents still open. This asks the complementary
 * question, and the two fail in different situations on purpose:
 *
 *   corpus       — high precision, bounded by its fixtures. Only fires on real breakage, but only
 *                  for shapes some fixture happens to contain.
 *   fingerprint  — complete over the schema, blind to documents. Fires on any breaking-shaped
 *                  change to any node, whether or not a fixture exercises it.
 *
 * Neither subsumes the other. A node type that no fixture contains is invisible to the corpus and
 * visible here; a migration that loads a document but mangles it is invisible here and, if a fixture
 * asserts on its content, visible there.
 *
 * What is compared is deliberately narrow — see `schema-fingerprint.ts`. Adding a node, adding an
 * attribute, or widening a content expression cannot invalidate a document already written, so none
 * of them fail this test. That restraint is the point: a check that fires on ordinary schema work
 * gets re-blessed unread, and then it is not a check at all.
 */
type Breakage = { node: string; property: string; before: string; after: string };

function findBreakingChanges(before: SchemaFingerprint, after: SchemaFingerprint): Breakage[] {
  const breakages: Breakage[] = [];

  for (const markName of before.marks) {
    if (!after.marks.includes(markName)) {
      breakages.push({ node: `mark:${markName}`, property: 'exists', before: 'yes', after: 'no' });
    }
  }

  for (const [name, was] of Object.entries(before.nodes)) {
    const now = after.nodes[name];

    if (!now) {
      breakages.push({ node: name, property: 'exists', before: 'yes', after: 'no' });
      continue;
    }

    if (was.inline !== now.inline) {
      breakages.push({
        node: name,
        property: 'inline',
        before: String(was.inline),
        after: String(now.inline),
      });
    }

    if (was.content !== now.content) {
      breakages.push({ node: name, property: 'content', before: was.content, after: now.content });
    }

    for (const [attr, wasValidate] of Object.entries(was.attrValidate)) {
      // Absent now means the attribute was removed. That loses data on the next save, but it does
      // not stop the document loading — ProseMirror ignores attributes the schema does not declare.
      if (!(attr in now.attrValidate)) continue;

      const nowValidate = now.attrValidate[attr];
      if (wasValidate !== nowValidate) {
        breakages.push({
          node: name,
          property: `attr ${attr} validate`,
          before: wasValidate || '(none)',
          after: nowValidate || '(none)',
        });
      }
    }
  }

  return breakages;
}

test('no schema change has made an existing document unloadable', () => {
  const before = baseline as SchemaFingerprint;
  const after = fingerprintSchema(buildEditorSchema(), CURRENT_JSON_DOCUMENT_VERSION);

  const breakages = findBreakingChanges(before, after);
  const detail = breakages
    .map(b => `  ${b.node}: ${b.property}  ${b.before}  ->  ${b.after}`)
    .join('\n');

  expect(
    breakages,
    breakages.length
      ? `These schema changes can stop a document written at v${before.schemaVersion} from loading:\n${detail}\n\n` +
        'Each needs a migration step to carry old documents across, then a CURRENT_SCHEMA_VERSION ' +
        'bump, then this baseline regenerated at the new version. Re-blessing schema-fingerprint.json ' +
        'on its own only hides the problem — the documents stay broken.'
      : '',
  ).toEqual([]);
});

test('the fingerprint baseline is recorded at the current schema version', () => {
  expect(
    (baseline as SchemaFingerprint).schemaVersion,
    'schema-fingerprint.json was captured against a different schema version than the one in force. ' +
      'Regenerate it after bumping CURRENT_SCHEMA_VERSION, so the next comparison is made against ' +
      'the schema documents are actually being written with.',
  ).toBe(CURRENT_JSON_DOCUMENT_VERSION);
});

import { expect, test } from 'vitest';

// Relative, not `@citolab/prose-qti/interfaces`: `schema/` sits outside the root tsconfig's
// `include`, so the path aliases do not reach it — the same reason editor-schema.ts reaches into
// apps/ by relative path. `CURRENT_JSON_DOCUMENT_VERSION` is CURRENT_SCHEMA_VERSION re-exported.
import {
  CURRENT_JSON_DOCUMENT_VERSION,
  readPersistedDoc,
} from '../apps/qti-prosekit-app/src/lib/compatibility/json.js';
// The package, not the app: `findSchemaViolation` is a ProseMirror question with a ProseMirror
// answer. `schema/` gets no tsconfig path aliases, so it reaches for the package the same relative
// way it reaches for the app's ladder above.
import { findSchemaViolation } from '../packages/prose-qti/src/schema-recovery/index.js';
import { buildEditorSchema } from './editor-schema';
import v1 from './document-corpus/v1.json';
import v2 from './document-corpus/v2.json';
import v3 from './document-corpus/v3.json';
import v4 from './document-corpus/v4.json';
import v5 from './document-corpus/v5.json';
import v6 from './document-corpus/v6.json';
import v7 from './document-corpus/v7.json';

import type { NodeJSON } from 'prosekit/core';

/**
 * Every document version this editor has ever written must still open.
 *
 * This is the contract the image change broke. `image` went from block to inline and its
 * `width`/`height` from number to string — deliberately, documented in schema/notes.ts, and covered
 * by its own round-trip test — but nothing anywhere asked whether documents already saved in the
 * old shape could still be read. They could not, and the failure was silent: an attribute mismatch
 * threw into a `catch {}`, and a structural mismatch did not even throw, because `EditorState.create`
 * validates nothing and no code called `Node.check()`.
 *
 * The gap is structural rather than an oversight. `schema/` guards the schema, the migration ladder
 * guards stored documents, and the two never met — so a node spec could change without anything
 * asking for a migration to match. This is where they meet.
 *
 * Each fixture is a real document stamped at the version it was written under, holding the shape
 * that version's migration exists to fix. They are frozen on purpose: a fixture edited to make a
 * failing test pass is a fixture that has stopped describing anything.
 *
 * **When this test fails, the fixtures are almost certainly not what is wrong.** A change to a node
 * spec has made an old document unreadable, and the fix is a new migration step plus a
 * `CURRENT_SCHEMA_VERSION` bump — see
 * `apps/qti-prosekit-app/src/lib/compatibility/migrations/index.ts`. Then add a fixture at the new
 * version, so the shape you just retired is covered from here on.
 */
const CORPUS: ReadonlyArray<{ version: number; doc: unknown; describes: string }> = [
  { version: 1, doc: v1, describes: 'hyphenated attribute names' },
  { version: 2, doc: v2, describes: 'correctResponse on extended text' },
  { version: 3, doc: v3, describes: 'rubricScoringBlock as an attribute' },
  { version: 4, doc: v4, describes: 'ProseKit flat list nodes' },
  { version: 5, doc: v5, describes: 'ProseKit bold/italic marks' },
  { version: 6, doc: v6, describes: 'ProseKit block image with numeric size' },
  { version: 7, doc: v7, describes: 'the current shape' },
];

test.each(CORPUS)('a v$version document ($describes) still opens', ({ version, doc }) => {
  const schema = buildEditorSchema();

  const restored = readPersistedDoc(doc);
  expect(restored.doc, `v${version} was readable at all`).toBeDefined();

  const violation = findSchemaViolation(schema, restored.doc as NodeJSON);
  expect(
    violation,
    violation
      ? `v${version} no longer opens after migration — ${violation.stage}: ${violation.message}. ` +
        'A node spec changed without a migration step to carry old documents across. ' +
        'Add one and bump CURRENT_SCHEMA_VERSION rather than editing the fixture.'
      : '',
  ).toBeNull();
});

test('the corpus covers every version up to the current one', () => {
  const covered = CORPUS.map(entry => entry.version);
  const expected = Array.from({ length: CURRENT_JSON_DOCUMENT_VERSION }, (_, index) => index + 1);

  expect(
    covered,
    'CURRENT_SCHEMA_VERSION moved without a fixture for the shape that was left behind. ' +
      'Add schema/document-corpus/v<N>.json holding a document as it looked at that version.',
  ).toEqual(expected);
});

/**
 * Coverage is the whole strength of this suite, and its whole weakness.
 *
 * A fixture only guards the node types it actually contains. The corpus started at 12 of 37 — every
 * drag-and-drop interaction, every table node and the rubric block were absent, so the same change
 * that broke `image` could have been made to `qtiGapMatchInteraction` with every test still green.
 *
 * Note what fixes that: not the historical fixtures, which are frozen, but the CURRENT-version one.
 * A document committed today becomes a historical document the moment the version moves, so the
 * breadth of the newest fixture is what the next schema change gets tested against. Keeping it at
 * full coverage is what makes this suite worth having.
 */
test('the corpus exercises every node type and mark in the schema', () => {
  const schema = buildEditorSchema();

  const seen = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as { type?: unknown; content?: unknown; marks?: unknown };
    if (typeof candidate.type === 'string') seen.add(candidate.type);
    if (Array.isArray(candidate.content)) candidate.content.forEach(walk);
    if (Array.isArray(candidate.marks)) candidate.marks.forEach(walk);
  };
  CORPUS.forEach(entry => walk(entry.doc));

  const uncoveredNodes = Object.keys(schema.nodes).filter(name => !seen.has(name));
  const uncoveredMarks = Object.keys(schema.marks).filter(name => !seen.has(name));

  expect(
    { nodes: uncoveredNodes, marks: uncoveredMarks },
    'These exist in the schema but appear in no fixture, so their specs could change without this ' +
      `suite noticing. Add them to schema/document-corpus/v${CURRENT_JSON_DOCUMENT_VERSION}.json.`,
  ).toEqual({ nodes: [], marks: [] });
});

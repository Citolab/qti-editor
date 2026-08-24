/**
 * The migration ladder, step by step.
 *
 * `schema/document-corpus.browser.test.ts` asks the only question that ultimately matters — does a
 * document written at version N still open — and it answers it through the real editor schema. What
 * it cannot ask is anything about *how* a step got there, because a fixture is one document and a
 * step has branches. Measured before this file existed: the corpus reached one of the nine entries
 * in `LEGACY_JSON_ATTRIBUTE_RENAMES`, one of the ten in `V6_INLINE_CONTENT_NODES`, and none of the
 * three paths that emit a `warning`. Every `severity: 'warning'` in the ladder — the three loudest
 * things it can tell a user — was unreachable from a test.
 *
 * So the split is deliberate and the two suites should stay on their own sides of it:
 *
 *   corpus  — real schema, frozen historical documents, "does it still load"
 *   here    — no schema, hand-built shapes, "does the step do what it says and say what it did"
 *
 * Nothing here touches the editor schema, which is what lets these fixtures hold shapes a real
 * document never would (an attribute in both spellings, a `toggle` list) without having to be
 * schema-valid first. It is also why a passing test here proves nothing about loadability — that is
 * the corpus's job, and adding schema assertions here would only duplicate it less well.
 *
 * The change log is asserted as carefully as the document, because it is not debug output: it is
 * what `describe.ts` turns into the sentence the user reads, and a step that migrates correctly
 * while reporting the wrong code, path or severity is a step that lies to them. Invariant 1 in
 * `../index.ts` — no silent drops — only means something if something checks.
 */
import { CURRENT_SCHEMA_VERSION } from '@citolab/prose-qti/interfaces';
import { describe, expect, test } from 'vitest';

import { migrateJsonDocument } from '../json.js';
import { JSON_MIGRATION_STEPS } from './index.js';
import { LEGACY_JSON_ATTRIBUTE_RENAMES, jsonV1ToV2 } from './json-v1-to-v2.js';
import { jsonV2ToV3 } from './json-v2-to-v3.js';
import { jsonV3ToV4 } from './json-v3-to-v4.js';
import { jsonV4ToV5 } from './json-v4-to-v5.js';
import { jsonV5ToV6 } from './json-v5-to-v6.js';
import { V6_INLINE_CONTENT_NODES, jsonV6ToV7 } from './json-v6-to-v7.js';

import type { JsonNode } from './shared.js';
import type {
  CompatibilityChange,
  CompatibilityChangeCode,
  MigrationContext,
  MigrationStep,
  PreservedFragment,
} from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * Runs one step in isolation and hands back both of its outputs.
 *
 * Deliberately not `migrateJsonDocument`: the ladder runs every step, so a v1 fixture that only
 * means to exercise `jsonV1ToV2` would collect five more steps' worth of change log, and an
 * assertion on "the changes" would be an assertion on all six. Ladder-level behaviour gets its own
 * describe block at the bottom, where that is the point.
 */
function runStep(step: MigrationStep<NodeJSON>, document: JsonNode) {
  const changes: CompatibilityChange[] = [];
  const preserved: PreservedFragment[] = [];
  const context: MigrationContext = {
    sourceVersion: step.fromVersion,
    targetVersion: step.toVersion,
    metadata: { source: 'json' },
    addChange: change => void changes.push(change),
    preserve: fragment => void preserved.push(fragment),
  };
  return {
    document: step.migrate(document as NodeJSON, context) as JsonNode,
    changes,
    preserved,
  };
}

const codes = (changes: readonly CompatibilityChange[]) => changes.map(change => change.code);
const only = (changes: readonly CompatibilityChange[], code: CompatibilityChangeCode) =>
  changes.filter(change => change.code === code);

/** Wraps children in a doc, so every fixture below is a whole document like the real input is. */
const doc = (...content: JsonNode[]): JsonNode => ({ type: 'doc', content });

// ── v1 → v2: legacy hyphenated attribute names ────────────────────────────────

describe('jsonV1ToV2', () => {
  test('renames every entry in the legacy attribute table', () => {
    // One node carrying all of them: the step keys off the attribute name alone and never looks at
    // the node type, so spreading these across nine nodes would test the walk, not the table.
    const legacyKeys = Object.keys(LEGACY_JSON_ATTRIBUTE_RENAMES);
    const attrs = Object.fromEntries(legacyKeys.map((key, index) => [key, `value-${index}`]));

    const { document, changes } = runStep(jsonV1ToV2, doc({ type: 'qtiChoiceInteraction', attrs }));

    const migrated = document.content![0]!.attrs!;
    expect(
      Object.keys(migrated).sort(),
      'every legacy spelling should have become its canonical one',
    ).toEqual(Object.values(LEGACY_JSON_ATTRIBUTE_RENAMES).sort());

    // Values ride along unchanged — a rename that lost the value would still pass the key check.
    legacyKeys.forEach((key, index) => {
      expect(migrated[LEGACY_JSON_ATTRIBUTE_RENAMES[key]!]).toBe(`value-${index}`);
    });

    const renames = only(changes, 'RENAME_ATTRIBUTE');
    expect(renames).toHaveLength(legacyKeys.length);
    expect(renames.every(change => change.severity === 'info')).toBe(true);
    expect(new Set(renames.map(change => change.attributeName))).toEqual(
      new Set(Object.values(LEGACY_JSON_ATTRIBUTE_RENAMES)),
    );
    expect(new Set(renames.map(change => change.data?.previousAttributeName))).toEqual(
      new Set(legacyKeys),
    );
    expect(renames.every(change => change.path === '$.content[0]')).toBe(true);
    expect(renames.every(change => change.nodeType === 'qtiChoiceInteraction')).toBe(true);
  });

  test('leaves attributes it does not know alone, and returns the same node', () => {
    const untouched = doc({ type: 'qtiChoiceInteraction', attrs: { identifier: 'A', shuffle: 'true' } });
    const { document, changes } = runStep(jsonV1ToV2, untouched);

    // Reference equality, not deep equality: the walk is written to return the input node when
    // nothing changed, and the ladder's later steps rely on that to decide `changed`.
    expect(document).toBe(untouched);
    expect(changes).toEqual([]);
  });

  /*
   * A document holding BOTH spellings of one attribute.
   *
   * Real, not contrived: a document written either side of the v1→v2 boundary, or merged from two,
   * carries both. It is also the one shape where the step has to discard something, which makes it
   * the only place invariant 1 — no silent drops — can actually be broken.
   *
   * Both key orders are asserted because `Object.entries` order is the document's, not ours, and an
   * order-dependent migration is a migration that behaves differently for two documents a user
   * would call identical. It used to: whichever order it saw, it logged a RENAME_ATTRIBUTE for a
   * rename that did not survive, and with the canonical key first it dropped the legacy value with
   * no warning at all.
   */
  test.each([
    ['legacy first', { 'response-identifier': 'LEGACY', responseIdentifier: 'CANONICAL' }],
    ['canonical first', { responseIdentifier: 'CANONICAL', 'response-identifier': 'LEGACY' }],
  ])('keeps the canonical value and warns about the legacy one (%s)', (_order, attrs) => {
    const { document, changes } = runStep(jsonV1ToV2, doc({ type: 'qtiChoiceInteraction', attrs }));

    const migrated = document.content![0]!.attrs!;
    expect(migrated).toEqual({ responseIdentifier: 'CANONICAL' });

    // Exactly one change, and it is the warning: no RENAME_ATTRIBUTE, because no rename happened.
    expect(codes(changes)).toEqual(['ATTRIBUTE_REMOVED']);
    const [dropped] = changes;
    expect(dropped!.severity).toBe('warning');
    expect(dropped!.attributeName).toBe('response-identifier');
    expect(dropped!.data).toMatchObject({
      previousAttributeName: 'response-identifier',
      keptAttributeName: 'responseIdentifier',
    });
    expect(dropped!.path).toBe('$.content[0]');
  });

  test('reports the path of a nested node', () => {
    const { changes } = runStep(
      jsonV1ToV2,
      doc(
        { type: 'paragraph' },
        {
          type: 'qtiChoiceInteraction',
          content: [{ type: 'qtiSimpleChoice', attrs: { 'match-max': 2 } }],
        },
      ),
    );

    expect(only(changes, 'RENAME_ATTRIBUTE')[0]!.path).toBe('$.content[1].content[0]');
  });
});

// ── v2 → v3: correctResponse → rubricScoringBlock on extended text ────────────

describe('jsonV2ToV3', () => {
  test('renames only on qtiExtendedTextInteraction', () => {
    const { document, changes } = runStep(
      jsonV2ToV3,
      doc(
        { type: 'qtiExtendedTextInteraction', attrs: { correctResponse: 'model answer' } },
        // Same attribute, different node: text entry keeps a real `correctResponse`, and a step
        // that renamed it there would quietly destroy the answer key.
        { type: 'qtiTextEntryInteraction', attrs: { correctResponse: 'Paris' } },
      ),
    );

    expect(document.content![0]!.attrs).toEqual({ rubricScoringBlock: 'model answer' });
    expect(document.content![1]!.attrs).toEqual({ correctResponse: 'Paris' });

    expect(codes(changes)).toEqual(['RENAME_ATTRIBUTE']);
    expect(changes[0]).toMatchObject({
      severity: 'info',
      nodeType: 'qtiExtendedTextInteraction',
      attributeName: 'rubricScoringBlock',
      path: '$.content[0]',
    });
  });

  test('drops correctResponse with a warning when rubricScoringBlock is already there', () => {
    const { document, changes } = runStep(
      jsonV2ToV3,
      doc({
        type: 'qtiExtendedTextInteraction',
        attrs: { correctResponse: 'stale', rubricScoringBlock: 'current' },
      }),
    );

    expect(document.content![0]!.attrs).toEqual({ rubricScoringBlock: 'current' });
    expect(codes(changes)).toEqual(['ATTRIBUTE_REMOVED']);
    expect(changes[0]!.severity).toBe('warning');
    expect(changes[0]!.data).toMatchObject({
      previousAttributeName: 'correctResponse',
      keptAttributeName: 'rubricScoringBlock',
    });
  });
});

// ── v3 → v4: rubricScoringBlock lifted into a sibling node ────────────────────

describe('jsonV3ToV4', () => {
  test('lifts the value into a sibling qtiRubricBlock right after the interaction', () => {
    const { document, changes } = runStep(
      jsonV3ToV4,
      doc(
        { type: 'qtiExtendedTextInteraction', attrs: { responseIdentifier: 'RESPONSE', rubricScoringBlock: 'One mark per cause.' } },
        { type: 'paragraph' },
      ),
    );

    expect(document.content!.map(node => node.type)).toEqual([
      'qtiExtendedTextInteraction',
      'qtiRubricBlock',
      // The sibling is inserted, not appended: anything that followed the interaction still does.
      'paragraph',
    ]);
    // The attribute is always removed, value or not — ProseMirror rejects an unknown attr outright.
    expect(document.content![0]!.attrs).toEqual({ responseIdentifier: 'RESPONSE' });
    expect(document.content![1]).toEqual({
      type: 'qtiRubricBlock',
      attrs: { use: 'scoring', view: 'scorer' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One mark per cause.' }] }],
    });

    expect(codes(changes)).toEqual(['ATTRIBUTE_MOVED']);
    expect(changes[0]).toMatchObject({
      severity: 'info',
      nodeType: 'qtiExtendedTextInteraction',
      attributeName: 'rubricScoringBlock',
      path: '$.content[0]',
      data: { movedTo: 'qtiRubricBlock' },
    });
  });

  test('joins an array value into one paragraph', () => {
    const { document } = runStep(
      jsonV3ToV4,
      doc({ type: 'qtiExtendedTextInteraction', attrs: { rubricScoringBlock: ['First line', 'Second line'] } }),
    );

    expect(document.content![1]!.content![0]!.content![0]!.text).toBe('First line\nSecond line');
  });

  /*
   * The empty case, which is the one the corpus cannot reach.
   *
   * It matters because it is the difference between two user-visible outcomes: a rubric block
   * appearing in the document, or not. An empty attribute that produced an empty `qtiRubricBlock`
   * would put a scoring panel on every item that ever had the attribute set and cleared.
   *
   * Whitespace counts as empty — `normalizeRubricValue` trims before deciding — and so does a value
   * of the wrong type, which is what an array of non-strings from a hand-edited document looks like.
   */
  test.each([
    ['an empty string', ''],
    ['whitespace only', '   \n  '],
    ['a non-string', 42],
    ['an array holding nothing usable', [null, 7]],
  ])('drops %s without creating a rubric block', (_label, rubricScoringBlock) => {
    const { document, changes } = runStep(
      jsonV3ToV4,
      doc({ type: 'qtiExtendedTextInteraction', attrs: { responseIdentifier: 'RESPONSE', rubricScoringBlock } }),
    );

    expect(document.content!.map(node => node.type)).toEqual(['qtiExtendedTextInteraction']);
    expect(document.content![0]!.attrs).toEqual({ responseIdentifier: 'RESPONSE' });

    // Dropping an empty attribute loses nothing, so this is `info`, not the `warning` that a real
    // discarded value would get. The distinction is the whole point of the severity field.
    expect(codes(changes)).toEqual(['ATTRIBUTE_REMOVED']);
    expect(changes[0]!.severity).toBe('info');
  });

  test('leaves an interaction that never had the attribute untouched', () => {
    const { document, changes } = runStep(
      jsonV3ToV4,
      doc({ type: 'qtiExtendedTextInteraction', attrs: { responseIdentifier: 'RESPONSE' } }),
    );

    expect(document.content!.map(node => node.type)).toEqual(['qtiExtendedTextInteraction']);
    expect(changes).toEqual([]);
  });
});

// ── v4 → v5: flat ProseKit lists → schema-list shape ─────────────────────────

describe('jsonV4ToV5', () => {
  test.each([
    ['bullet', 'bullet_list'],
    ['ordered', 'ordered_list'],
    // No `kind` at all — an older flat list, before the attribute existed.
    [undefined, 'bullet_list'],
  ])('converts a %s list to %s with list_item children', (kind, expectedType) => {
    const { document, changes } = runStep(
      jsonV4ToV5,
      doc({
        type: 'list',
        ...(kind === undefined ? {} : { attrs: { kind } }),
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
        ],
      }),
    );

    const list = document.content![0]!;
    expect(list.type).toBe(expectedType);
    // `kind` is gone: it selected the style, and the style is now the node type.
    expect(list.attrs).toBeUndefined();
    expect(list.content!.map(item => item.type)).toEqual(['list_item', 'list_item']);
    expect(list.content![0]!.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
    ]);

    expect(codes(changes)).toEqual(['RENAME_NODE']);
    expect(changes[0]).toMatchObject({
      severity: 'info',
      nodeType: 'list',
      path: '$.content[0]',
      data: { fromNodeType: 'list', toNodeType: expectedType, kind },
    });
  });

  /*
   * `task` and `toggle` were ProseKit list kinds with no QTI equivalent, so the step keeps the
   * content and loses the kind. That is a lossy conversion and the only reason it is acceptable is
   * that it is reported — which nothing checked until now.
   */
  test.each(['task', 'toggle'])('coerces an unsupported %s list and warns', kind => {
    const { document, changes } = runStep(
      jsonV4ToV5,
      doc({ type: 'list', attrs: { kind }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kept' }] }] }),
    );

    expect(document.content![0]!.type).toBe('bullet_list');
    // The content survives the coercion — that is what makes it a coercion and not a deletion.
    expect(document.content![0]!.content![0]!.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Kept' }] },
    ]);

    // Two changes, in this order: what it became, then what that cost.
    expect(codes(changes)).toEqual(['RENAME_NODE', 'NODE_REMOVED']);
    expect(changes[1]).toMatchObject({ severity: 'warning', nodeType: 'list', data: { kind } });
  });

  test('converts a list nested inside a list item', () => {
    const { document, changes } = runStep(
      jsonV4ToV5,
      doc({
        type: 'list',
        attrs: { kind: 'bullet' },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Outer' }] },
          { type: 'list', attrs: { kind: 'ordered' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inner' }] }] },
        ],
      }),
    );

    const outer = document.content![0]!;
    expect(outer.type).toBe('bullet_list');
    expect(outer.content![1]!.content![0]!.type).toBe('ordered_list');
    // Inner first: the walk recurses before converting, so the deepest list is reported first.
    expect(only(changes, 'RENAME_NODE').map(change => change.data?.toNodeType)).toEqual([
      'ordered_list',
      'bullet_list',
    ]);
  });

  test('leaves a document with no flat lists untouched', () => {
    const untouched = doc({ type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'paragraph' }] }] });
    const { document, changes } = runStep(jsonV4ToV5, untouched);

    expect(document).toBe(untouched);
    expect(changes).toEqual([]);
  });
});

// ── v5 → v6: bold/italic marks → strong/em ───────────────────────────────────

describe('jsonV5ToV6', () => {
  test('renames legacy marks and leaves current ones alone', () => {
    const { document, changes } = runStep(
      jsonV5ToV6,
      doc({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'both', marks: [{ type: 'bold' }, { type: 'italic' }] },
          // Already current, plus a mark the table says nothing about: neither should be touched.
          { type: 'text', text: 'kept', marks: [{ type: 'strong' }, { type: 'code' }] },
        ],
      }),
    );

    const [legacy, current] = document.content![0]!.content!;
    expect(legacy!.marks).toEqual([{ type: 'strong' }, { type: 'em' }]);
    expect(current!.marks).toEqual([{ type: 'strong' }, { type: 'code' }]);

    expect(codes(changes)).toEqual(['RENAME_NODE', 'RENAME_NODE']);
    expect(changes.map(change => change.data)).toEqual([
      { fromMark: 'bold', toMark: 'strong' },
      { fromMark: 'italic', toMark: 'em' },
    ]);
    expect(changes.every(change => change.severity === 'info')).toBe(true);
    expect(changes.every(change => change.path === '$.content[0].content[0]')).toBe(true);
    expect(changes.every(change => change.nodeType === 'text')).toBe(true);
  });

  test('keeps mark attributes across the rename', () => {
    const { document } = runStep(
      jsonV5ToV6,
      doc({ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'bold', attrs: { weight: '700' } }] }] }),
    );

    expect(document.content![0]!.content![0]!.marks).toEqual([{ type: 'strong', attrs: { weight: '700' } }]);
  });

  test('reaches a mark nested inside an interaction', () => {
    const { changes } = runStep(
      jsonV5ToV6,
      doc({
        type: 'qtiChoiceInteraction',
        content: [
          {
            type: 'qtiSimpleChoice',
            content: [{ type: 'qtiSimpleChoiceParagraph', content: [{ type: 'text', text: 'deep', marks: [{ type: 'italic' }] }] }],
          },
        ],
      }),
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]!.path).toBe('$.content[0].content[0].content[0].content[0]');
  });

  test('leaves a document with no legacy marks untouched', () => {
    const untouched = doc({ type: 'paragraph', content: [{ type: 'text', text: 'plain', marks: [{ type: 'strong' }] }] });
    const { document, changes } = runStep(jsonV5ToV6, untouched);

    expect(document).toBe(untouched);
    expect(changes).toEqual([]);
  });
});

// ── v6 → v7: image inline, and width/height as strings ───────────────────────

describe('jsonV6ToV7', () => {
  test('stringifies numeric sizes and wraps a block-position image', () => {
    const { document, changes } = runStep(
      jsonV6ToV7,
      doc({ type: 'image', attrs: { src: 'resources/atom.png', width: 250, height: 100 } }),
    );

    expect(document.content![0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'image', attrs: { src: 'resources/atom.png', width: '250', height: '100' } }],
    });

    // Sizes are coerced on the way down, the wrap happens on the way back up.
    expect(codes(changes)).toEqual(['ATTRIBUTE_COERCED', 'ATTRIBUTE_COERCED', 'NODE_WRAPPED']);
    expect(only(changes, 'ATTRIBUTE_COERCED').map(change => change.attributeName)).toEqual(['width', 'height']);
    expect(changes[0]).toMatchObject({ severity: 'info', nodeType: 'image', data: { from: 250, to: '250' } });
    expect(changes[2]).toMatchObject({
      severity: 'info',
      nodeType: 'image',
      path: '$.content[0]',
      data: { wrappedIn: 'paragraph', parentType: 'doc' },
    });
  });

  test.each(['100%', null])('leaves a %s size alone', size => {
    // A string already round-trips and `null` is a legal value; coercing either would be noise in
    // the change log at best, and at worst would turn `null` into the string "null".
    const { document, changes } = runStep(
      jsonV6ToV7,
      doc({ type: 'paragraph', content: [{ type: 'image', attrs: { src: 'a.png', width: size } }] }),
    );

    expect(document.content![0]!.content![0]!.attrs).toEqual({ src: 'a.png', width: size });
    expect(only(changes, 'ATTRIBUTE_COERCED')).toEqual([]);
  });

  /*
   * The other half of the step, and the half a fixture cannot reach: an image that was ALREADY in an
   * inline position must be left exactly where it is. Wrapping it would nest a paragraph inside a
   * paragraph and break the document the step exists to save.
   *
   * Driven off the frozen set itself rather than a list copied out of it, so an entry added there
   * without being exercised fails here.
   */
  test.each([...V6_INLINE_CONTENT_NODES])('leaves an image inside %s unwrapped', parentType => {
    const image: JsonNode = { type: 'image', attrs: { src: 'a.png', width: 250 } };
    const { document, changes } = runStep(jsonV6ToV7, doc({ type: parentType, content: [image] }));

    const parent = document.content![0]!;
    expect(parent.type).toBe(parentType);
    expect(parent.content!.map(child => child.type)).toEqual(['image']);
    expect(only(changes, 'NODE_WRAPPED')).toEqual([]);
    // Still coerced, though: the size change applies wherever the image sits.
    expect(parent.content![0]!.attrs).toEqual({ src: 'a.png', width: '250' });
    expect(only(changes, 'ATTRIBUTE_COERCED')).toHaveLength(1);
  });

  test.each(['qtiItemBody', 'qtiRubricBlock', 'list_item', 'table_cell'])(
    'wraps an image sitting directly in %s',
    parentType => {
      const { document, changes } = runStep(
        jsonV6ToV7,
        doc({ type: parentType, content: [{ type: 'image', attrs: { src: 'a.png' } }] }),
      );

      expect(document.content![0]!.content![0]).toEqual({
        type: 'paragraph',
        content: [{ type: 'image', attrs: { src: 'a.png' } }],
      });
      expect(only(changes, 'NODE_WRAPPED')[0]).toMatchObject({ data: { parentType } });
    },
  );

  test('leaves a document with no images untouched', () => {
    const untouched = doc({ type: 'paragraph', content: [{ type: 'text', text: 'no pictures' }] });
    const { document, changes } = runStep(jsonV6ToV7, untouched);

    expect(document).toBe(untouched);
    expect(changes).toEqual([]);
  });
});

// ── The ladder as a whole ────────────────────────────────────────────────────

describe('the JSON ladder', () => {
  /*
   * The structural guard. `migrateDocument` does not require an unbroken chain — when no step
   * bridges from the current version it skips forward to the next one, deliberately, so that HTML
   * can stop at v2 while JSON keeps going. That tolerance is right for the runner and wrong for the
   * JSON ladder, where a gap means a document at that version passes through untransformed and the
   * skip is logged as `info`. Nothing else would notice.
   */
  test('bridges every version from 1 to the current one, with no gaps', () => {
    const steps = [...JSON_MIGRATION_STEPS].sort((a, b) => a.fromVersion - b.fromVersion);

    expect(steps.map(step => [step.fromVersion, step.toVersion])).toEqual(
      Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_, index) => [index + 1, index + 2]),
    );
    expect(new Set(steps.map(step => step.id)).size, 'step ids must be unique').toBe(steps.length);
  });

  test('runs every step for a version 1 document, in order', () => {
    const result = migrateJsonDocument({ type: 'doc', content: [] } as NodeJSON, { sourceVersion: 1 });

    expect(result.appliedStepIds).toEqual(JSON_MIGRATION_STEPS.map(step => step.id));
    expect(result.sourceVersion).toBe(1);
    expect(result.targetVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('applies nothing to a document already at the current version', () => {
    const result = migrateJsonDocument(
      { type: 'doc', content: [] } as NodeJSON,
      { sourceVersion: CURRENT_SCHEMA_VERSION },
    );

    expect(result.appliedStepIds).toEqual([]);
    expect(codes(result.changes)).toEqual(['VERSION_DETECTED']);
  });

  test('warns when it has to guess the version', () => {
    // No `schemaVersion`, no `sourceVersion`: the document predates the marker, so it is treated as
    // v1 and the guess is reported. A silent assumption here would be a silent migration of a
    // document that might not have needed one.
    const result = migrateJsonDocument({ type: 'doc', content: [] } as NodeJSON);

    expect(result.changes[0]).toMatchObject({ code: 'VERSION_ASSUMED', severity: 'warning', fromVersion: 1 });
    expect(result.sourceVersion).toBe(1);
  });

  /*
   * The one chain the corpus depends on and cannot state: `correctResponse` on extended text is
   * renamed by v2→v3 and then lifted by v3→v4, so the v2 fixture passes through two steps whose
   * output is the next one's input. If v2→v3 ever renamed to something else, v3→v4 would silently
   * stop finding anything and the attribute would reach ProseMirror as an unknown attr.
   */
  test('carries a v2 correctResponse all the way into a rubric block node', () => {
    const result = migrateJsonDocument(
      {
        type: 'doc',
        content: [
          {
            type: 'qtiExtendedTextInteraction',
            attrs: { responseIdentifier: 'RESPONSE', correctResponse: 'A model answer.' },
          },
        ],
      } as NodeJSON,
      { sourceVersion: 2 },
    );

    const content = (result.document as JsonNode).content!;
    expect(content.map(node => node.type)).toEqual(['qtiExtendedTextInteraction', 'qtiRubricBlock']);
    expect(content[0]!.attrs).toEqual({ responseIdentifier: 'RESPONSE' });
    expect(content[1]!.content![0]!.content![0]!.text).toBe('A model answer.');
    expect(codes(result.changes)).toContain('RENAME_ATTRIBUTE');
    expect(codes(result.changes)).toContain('ATTRIBUTE_MOVED');
  });

  test('every change carries a message', () => {
    // `describe.ts` falls back to `change.message` for anything it has no phrase for, so an empty
    // one surfaces to the user as a blank line in the compatibility notice.
    const result = migrateJsonDocument(
      {
        type: 'doc',
        content: [
          { type: 'qtiChoiceInteraction', attrs: { 'response-identifier': 'RESPONSE', 'max-choices': 1 } },
          { type: 'list', attrs: { kind: 'toggle' }, content: [{ type: 'paragraph' }] },
          { type: 'image', attrs: { src: 'a.png', width: 250 } },
        ],
      } as NodeJSON,
      { sourceVersion: 1 },
    );

    expect(result.changes.length).toBeGreaterThan(0);
    result.changes.forEach(change => {
      expect(change.message.trim(), `${change.code} had an empty message`).not.toBe('');
      expect(['info', 'warning', 'error']).toContain(change.severity);
    });
  });
});

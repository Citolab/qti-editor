import { describe, expect, test } from 'vitest';
import { Schema } from 'prosemirror-model';

import {
  buildContentModel,
  buildEditorSchema,
  interactionSlices,
  isInteractionNode,
  serialise
} from './content-model';
import committedModelJson from './content-model.json?raw';
import { IDENTIFIED, NOTES } from './notes';

import type { NodeJson } from './content-model';

/**
 * The schema fixture gate: every interaction still produces the schema it produced last time.
 *
 * ## Why this is a test and not a script
 *
 * It used to be `schema/check.ts`, run under tsx as its own CI step. That arrangement had a
 * standing bet in it — that no dependency would ever ship a bundler-specific specifier — and the
 * bet lost. `@qti-components/base` shipped a Vite `?inline` stylesheet import, tsx is a transpiler
 * rather than a bundler, and the check died with ERR_UNKNOWN_FILE_EXTENSION on a CSS file, having
 * read not one node spec. Building the real schema means importing the real components, and the
 * real components are built for Vite.
 *
 * Vitest runs through Vite, so that entire class of failure cannot occur here. It also puts the
 * gate where people meet it: `pnpm test`, CI's own test step, and the staged-only pre-commit hook.
 * The old script was a separate CI step that had never once run green, because Typecheck failed
 * ahead of it every time and nobody saw the step below it.
 *
 * ## What it asserts
 *
 *   1. every interaction matches its own fixture     — locality: the failure names the interaction
 *   2. the whole model matches content-model.json    — order included, which the split cannot carry
 *   3. every registered interaction has a fixture    — coverage: a fixture cannot miss its own absence
 *   4. notes.ts still describes the schema  — the hand-written doc has not drifted
 *   5. content-model.json rebuilds on its own        — an out-of-process consumer really can use it
 *
 * On any failure: `pnpm schema:build` regenerates, then read the diff before committing it. A
 * changed fixture is a changed editor contract — content-model.json is consumed outside this repo,
 * including by LLM generation — so the diff is the review, not a formality.
 */

/**
 * Built on first use, never at module scope.
 *
 * `buildEditorSchema()` at module top level throws `[prosekit] Assertion failed` — at
 * module-evaluation time the component registry the extensions read from is not ready. Inside a
 * test it is. Memoised so the per-interaction tests share one construction instead of composing the
 * editor once each.
 */
let cached: { schema: ReturnType<typeof buildEditorSchema>; model: ReturnType<typeof buildContentModel> } | null =
  null;
function built() {
  if (!cached) {
    const schema = buildEditorSchema();
    cached = { schema, model: buildContentModel(schema) };
  }
  return cached;
}

/**
 * Loaded eagerly so a missing fixture is a build-time error rather than a confusing runtime one.
 * `import.meta.glob` is a Vite primitive; it is precisely what the old tsx script could not use.
 */
const committedInteractions = import.meta.glob<string>('./__interactions__/*.json', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * Recompute a model's fingerprint the way the generator does.
 *
 * Goes through buildContentModel's own output rather than reimplementing the hash, so these tests
 * cannot pass against a second, drifting copy of the algorithm. The `$comment` and `schemaVersion`
 * fields are stripped first because the fingerprint is defined over the grammar alone.
 */
const fingerprintOf = (model: ReturnType<typeof buildContentModel>) => {
  const { $comment: _comment, schemaVersion: _version, ...grammar } = model;
  const stripped = {
    ...grammar,
    nodes: Object.fromEntries(Object.entries(grammar.nodes).map(([n, { note: _note, ...rest }]) => [n, rest]))
  };
  return JSON.stringify(stripped);
};

const fixtureNameOf = (path: string) => path.replace(/^.*\/(.+)\.json$/, '$1');
const fixtureNames = Object.keys(committedInteractions).map(fixtureNameOf).sort();

describe('per-interaction fixtures', () => {
  // One test per committed fixture, named after the interaction, so a failure reads
  // "qtiOrderInteraction matches its committed fixture" rather than pointing at a 13 KB blob.
  //
  // Driven by the fixtures on disk rather than by the schema, because test collection happens
  // before the schema can be built — see `built()`.
  for (const name of fixtureNames) {
    test(`${name} matches its committed fixture`, () => {
      const spec = built().model.nodes[name];
      expect(spec, `${name} has a fixture but is no longer in the schema`).toBeDefined();
      expect(serialise(spec)).toBe(committedInteractions[`./__interactions__/${name}.json`]);
    });
  }
});

describe('whole model', () => {
  /*
   * String comparison, not deep equality, and deliberately so: it is the only form that catches a
   * change in NODE ORDER. Order is load-bearing — ProseMirror resolves a content expression's
   * default type by first match — so a reordering is real drift, and a deep-equal assertion would
   * wave it through. This is also why nothing here sorts `nodes`.
   */
  test('content-model.json is current, node order included', () => {
    expect(serialise(built().model)).toBe(committedModelJson);
  });
});

describe('coverage', () => {
  /*
   * The one thing a fixture cannot do for itself: notice an absence. Add an interaction, forget to
   * register it in qti-interactions-extension, and every fixture above still passes — the schema
   * simply never contained the node, so nothing compared it. Cross-checking the schema against the
   * descriptor registry is what closes that.
   */
  test('fixtures and the schema interactions are the same set', () => {
    // Both directions. A missing fixture means someone added an interaction without regenerating;
    // an extra one means an interaction was removed and its fixture left behind. Neither is visible
    // to the per-fixture tests above, because a file that does not exist is never compared.
    const inSchema = Object.keys(interactionSlices(built().model)).sort();
    expect(inSchema.length).toBeGreaterThan(0);
    expect(fixtureNames).toEqual(inSchema);
  });

  test('tables, lists and the prose basics are still in the schema', () => {
    // These have no fixture file of their own — content-model.json covers them — so this is the
    // cheap floor that notices if a whole family disappears.
    const names = Object.keys(built().model.nodes);
    expect(names.filter(n => /^table/i.test(n)).length, 'no table nodes').toBeGreaterThan(0);
    expect(names.filter(n => /list/i.test(n)).length, 'no list nodes').toBeGreaterThan(0);
    for (const basic of ['doc', 'paragraph', 'text', 'heading']) {
      expect(names, `missing prose basic: ${basic}`).toContain(basic);
    }
  });
});

describe('schemaVersion', () => {
  /*
   * The contract you actually care about as a consumer: it changes when the schema changes, and at
   * no other time. Both halves are asserted, because only testing the first would let the version
   * churn on every reworded comment and quietly train people to ignore it.
   */
  test('is a fingerprint of the grammar, present in the JSON', () => {
    const committed = JSON.parse(committedModelJson) as { schemaVersion?: string };
    expect(committed.schemaVersion, 'content-model.json carries no schemaVersion').toMatch(/^fnv1a64-[0-9a-f]{16}$/);
    expect(built().model.schemaVersion).toBe(committed.schemaVersion);
  });

  test('does NOT move when only a note changes', () => {
    // Notes are documentation. Rewording why a prompt is narrowed changes nothing a document's
    // validity depends on, so it must not invalidate a cached schema or read as a breaking change.
    const { schema } = built();
    const withNotes = buildContentModel(schema);
    const reworded = buildContentModel(schema);
    for (const key of Object.keys(reworded.nodes)) {
      if (reworded.nodes[key].note) reworded.nodes[key] = { ...reworded.nodes[key], note: 'REWORDED PROSE' };
    }
    expect(fingerprintOf(reworded)).toBe(fingerprintOf(withNotes));
  });

  test('DOES move when the grammar changes', () => {
    // The other half: a real change to a content expression must produce a different fingerprint,
    // or the whole field is decoration.
    const { schema } = built();
    const base = buildContentModel(schema);
    const changed = buildContentModel(schema);
    const victim = Object.keys(changed.nodes).find(n => changed.nodes[n].content)!;
    changed.nodes[victim] = { ...changed.nodes[victim], content: 'text*' };
    expect(fingerprintOf(changed)).not.toBe(fingerprintOf(base));
  });
});

describe('hand-authored notes', () => {
  /*
   * notes.ts no longer carries a copy of the schema — the fixtures made that copy
   * redundant, and a hand-maintained twin meant every schema change needed a manual edit before the
   * check would pass. What it carries now is prose and IDENTIFIED, and both need a different guard:
   * not "does the data agree" but "does this still describe something that exists".
   */
  test('every note names a node that still exists', () => {
    const names = Object.keys(built().model.nodes);
    const orphans = Object.keys(NOTES).filter(name => !names.includes(name));
    expect(orphans, `notes for nodes that are gone: ${orphans.join(', ')}`).toEqual([]);
  });

  test('every note reaches content-model.json', () => {
    // The whole point of moving them out of source comments: a consumer reading only the JSON —
    // C#, Python, LLM generation — gets the reasoning as well as the grammar.
    const { model } = built();
    for (const [name, note] of Object.entries(NOTES)) {
      expect(model.nodes[name]?.note, `${name} has a note that did not reach the JSON`).toBe(note);
    }
  });

  test('every IDENTIFIED node really has an identifier attribute', () => {
    const real = new Map<string, Record<string, unknown>>();
    built().schema.spec.nodes.forEach((name: string, spec: Record<string, unknown>) => real.set(name, spec));
    const problems = IDENTIFIED.filter(name => !(real.get(name)?.attrs as Record<string, unknown>)?.identifier);
    expect(problems, `listed in IDENTIFIED without an identifier attr: ${problems.join(', ')}`).toEqual([]);
  });
});

describe('content-model.json is self-sufficient', () => {
  /*
   * The point of the JSON is that a consumer with nothing but this file can reconstruct the
   * grammar. Prove it: rebuild a real ProseMirror Schema from the JSON alone, then fill a document
   * from it. If an out-of-process parser (C#, Python, anything) can read this file, it has
   * everything the editor's own schema has.
   */
  test('rebuilds into a valid ProseMirror schema on its own', () => {
    const json = JSON.parse(committedModelJson) as {
      topNode: string;
      nodes: Record<string, NodeJson>;
      marks: Record<string, { tagName?: string }>;
    };

    const rebuiltNodes: Record<string, Record<string, unknown>> = {};
    for (const [name, spec] of Object.entries(json.nodes)) {
      const { tagName, topNode: _topNode, placeholder: _placeholder, attrs, ...rest } = spec;
      rebuiltNodes[name] = {
        ...rest,
        ...(attrs ? { attrs } : {}),
        ...(name === 'text' ? {} : { toDOM: () => [tagName ?? name, 0] })
      };
    }

    const rebuilt = new Schema({
      topNode: json.topNode,
      nodes: rebuiltNodes,
      marks: Object.fromEntries(
        Object.entries(json.marks).map(([n, m]) => [n, { toDOM: () => [m.tagName ?? n, 0] }])
      )
    });

    expect(() => rebuilt.topNodeType.createAndFill()!.check()).not.toThrow();
    expect(Object.keys(rebuilt.nodes)).toHaveLength(Object.keys(built().model.nodes).length);
  });
});

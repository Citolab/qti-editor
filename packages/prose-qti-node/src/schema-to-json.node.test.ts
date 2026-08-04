import { describe, expect, test } from 'vitest';

import { createQtiSchema, schemaToJson } from '@citolab/prose-qti-node';

/**
 * `schemaToJson` as a consumer meets it: through the built `/node` entry point, in plain Node.
 *
 * Contract assertions, not a snapshot. The generator this replaces was gated by a committed
 * `content-model.json` and 11 per-interaction fixtures, and that gating is exactly what commit
 * 6cdc6d5 removed — a fixture of a projection of the schema has to be re-blessed every time the
 * schema moves, which teaches everyone to re-bless it without reading it. These assert the
 * properties that make the output usable instead: that the grammar survives, that required and
 * defaulted attributes stay distinguishable, and that nothing unserialisable leaks out.
 */
const json = schemaToJson();

describe('schemaToJson', () => {
  test('reports the top node and its required attributes', () => {
    expect(json.topNode).toBe('doc');
    expect(json.nodes.doc.topNode).toBe(true);

    // Hoisted from the item body on import, so they have no defaults and `doc.create()` throws
    // without them. A consumer constructing a document needs to be told that, not left to discover
    // it — which is the whole reason required is a distinct shape from `{ default: null }`.
    expect(json.nodes.doc.attrs?.identifier).toEqual({ required: true });
    expect(json.nodes.doc.attrs?.title).toEqual({ required: true });
  });

  test('carries content expressions, groups and flags off the spec', () => {
    const choice = json.nodes.qtiChoiceInteraction;

    expect(choice.content).toBe('qtiPrompt? qtiSimpleChoice+');
    expect(choice.group).toBe('block');
    expect(choice.defining).toBe(true);
    expect(choice.isolating).toBe(true);

    // Emitted only when true — an absent key means false.
    expect(choice.inline).toBeUndefined();
  });

  test('reads the markup tag back out of toDOM', () => {
    expect(json.nodes.qtiChoiceInteraction.tagName).toBe('qti-choice-interaction');
    expect(json.nodes.qtiSimpleChoice.tagName).toBe('qti-simple-choice');
  });

  test('distinguishes a real null default from a required attribute', () => {
    const choice = json.nodes.qtiChoiceInteraction;

    expect(choice.attrs?.maxChoices).toEqual({ default: 0 });
    expect(choice.attrs?.correctResponse).toEqual({ default: null });
  });

  test('indexes groups so a content expression can be resolved', () => {
    expect(json.groups.block).toContain('qtiChoiceInteraction');
    expect(json.groups.block).toContain('paragraph');

    // paragraph joins `richtext` for tableNodes' `cellContent: 'richtext+'` — a membership that has
    // been silently dropped before now, so it is worth an assertion.
    expect(json.groups.richtext).toContain('paragraph');
  });

  test('preserves schema order rather than sorting', () => {
    // ProseMirror resolves a content expression's default type by first match, so the order of
    // `nodes` is part of the grammar. Sorting it would be a silent behaviour change.
    const fromSchema: string[] = [];
    createQtiSchema().spec.nodes.forEach((name: string) => fromSchema.push(name));

    expect(Object.keys(json.nodes)).toEqual(fromSchema);
  });

  test('is JSON — no functions or undefined leak out of the spec', () => {
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);
  });

  test('describes whichever schema it is given', () => {
    const orderOnly = schemaToJson(createQtiSchema({ include: ['qti-order-interaction'] }));

    expect(orderOnly.nodes.qtiOrderInteraction).toBeDefined();
    expect(orderOnly.nodes.qtiChoiceInteraction).toBeUndefined();
  });
});

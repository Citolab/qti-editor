/**
 * Build the editor's composed schema and serialise its grammar. Shared by the writer and the test.
 *
 * Extracted from generate.ts so `schema/content-model.browser.test.ts` compares against the SAME
 * construction the fixture was written from, rather than a second implementation that can drift
 * from it. The writer now does nothing but call this and put the result on disk.
 *
 * Nothing here is authored. It constructs the real composed editor schema — ProseKit's base
 * extension plus every registered QTI descriptor — and reads the grammar off it.
 *
 * ## Determinism
 *
 * Same schema in, byte-identical output. Node order follows the schema's own order, and that order
 * is MEANINGFUL: ProseMirror resolves a content expression's default type by first match, so
 * reordering changes editor behaviour. Never sort `nodes` — a reordering is real drift and the
 * fixture is supposed to catch it, not launder it. Object keys within a node are emitted in a fixed
 * sequence rather than `Object.keys()` order, so only genuine changes move bytes.
 */
import { createEditor, union } from 'prosekit/core';

import { defineBasicExtension } from '../apps/qti-prosekit-app/src/extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../apps/qti-prosekit-app/src/extensions/qti-interactions-extension.js';
import { IDENTIFIED, NOTES } from './notes';

import type { Schema } from 'prosemirror-model';

/**
 * Grammar-bearing NodeSpec fields, in emit order. `parseDOM` / `toDOM` are excluded — they are
 * functions, and they describe serialization rather than the document model.
 */
export const FLAGS = [
  'inline',
  'atom',
  'defining',
  'isolating',
  'selectable',
  'draggable',
  'createGapCursor'
] as const;

export type NodeJson = {
  tagName?: string;
  content?: string;
  group?: string;
  marks?: string;
  topNode?: true;
  placeholder?: string;
  attrs?: Record<string, { default?: unknown } | { required: true }>;
  /**
   * Hand-authored, from NOTES in notes.ts. Emitted last so the grammar fields stay
   * together and a long paragraph never pushes them down the page.
   *
   * It is in the JSON rather than left as a source comment because the JSON is what the
   * out-of-process consumers read — C#, Python, LLM generation — and "the XSD makes this optional,
   * the editor requires it" is exactly what they cannot infer from the grammar alone.
   */
  note?: string;
} & Partial<Record<(typeof FLAGS)[number], true>>;

export interface ContentModel {
  $comment: string;
  /** See `schemaVersion` below — a fingerprint of the grammar, not a hand-maintained number. */
  schemaVersion: string;
  topNode: string;
  nodes: Record<string, NodeJson>;
  marks: Record<string, { tagName?: string }>;
  groups: Record<string, string[]>;
  identified: readonly string[];
}

/** The real composed editor schema — the single source everything here is derived from. */
export function buildEditorSchema(): Schema {
  return createEditor({
    extension: union(defineBasicExtension(), defineQtiInteractionsExtension())
  }).schema;
}

/**
 * Read a node's markup tag by asking its `toDOM` for one.
 *
 * `toDOM` returns a DOMOutputSpec whose first element is the tag name, so a created node round-trips
 * to its own tag without a hand-maintained mapping. Nodes with required attrs are built with
 * `create` rather than `createChecked` so an unfilled content model does not throw — the tag does
 * not depend on the children.
 */
function tagNameOf(schema: Schema, name: string): string | undefined {
  const type = schema.nodes[name];
  const toDOM = type?.spec.toDOM;
  if (!toDOM || type.isText) return undefined;
  try {
    const out = toDOM(type.create()) as unknown;
    if (Array.isArray(out) && typeof out[0] === 'string') return out[0];
  } catch {
    /* a node that cannot be created without children still has no tag dependence on them */
  }
  return undefined;
}

export function buildContentModel(schema: Schema = buildEditorSchema()): ContentModel {
  // ── nodes ──────────────────────────────────────────────────────────────────
  const nodes: Record<string, NodeJson> = {};
  schema.spec.nodes.forEach((name: string, spec: Record<string, unknown>) => {
    const out: NodeJson = {};

    const tagName = tagNameOf(schema, name);
    if (tagName) out.tagName = tagName;
    if (typeof spec.content === 'string') out.content = spec.content;
    if (typeof spec.group === 'string') out.group = spec.group;
    if (typeof spec.marks === 'string') out.marks = spec.marks;
    if (schema.topNodeType.name === name) out.topNode = true;
    for (const flag of FLAGS) if (spec[flag] === true) out[flag] = true;
    if (typeof spec.placeholder === 'string') out.placeholder = spec.placeholder;

    const attrs = spec.attrs as Record<string, unknown> | undefined;
    if (attrs && Object.keys(attrs).length > 0) {
      out.attrs = {};
      for (const attr of Object.keys(attrs)) {
        // ProseMirror's own notion of required — an attribute with no default. Read it off the
        // resolved NodeType rather than the raw spec, because `{ default: undefined }` and a
        // genuinely absent `default` are indistinguishable by `'default' in obj`.
        const resolved = schema.nodes[name]?.attrs?.[attr];
        out.attrs[attr] = resolved?.isRequired ? { required: true } : { default: resolved?.default ?? null };
      }
    }

    const note = (NOTES as Record<string, string>)[name];
    if (note) out.note = note;

    nodes[name] = out;
  });

  // ── marks ──────────────────────────────────────────────────────────────────
  const marks: Record<string, { tagName?: string }> = {};
  for (const name of Object.keys(schema.marks)) {
    const toDOM = schema.marks[name].spec.toDOM;
    let tagName: string | undefined;
    if (toDOM) {
      const out = toDOM(schema.marks[name].create(), true) as unknown;
      if (Array.isArray(out) && typeof out[0] === 'string') tagName = out[0];
    }
    marks[name] = tagName ? { tagName } : {};
  }

  // ── groups ─────────────────────────────────────────────────────────────────
  // A reverse index over the `group` fields. Content expressions reference these names, so a
  // consumer resolving an expression needs to know what each one admits.
  const groups: Record<string, string[]> = {};
  for (const [name, spec] of Object.entries(nodes)) {
    for (const g of (spec.group ?? '').split(/\s+/).filter(Boolean)) (groups[g] ??= []).push(name);
  }

  const grammar = {
    topNode: schema.topNodeType.name,
    nodes,
    marks,
    groups,
    /** Nodes whose `identifier` attribute a `correct-response` may reference. See notes.ts. */
    identified: IDENTIFIED
  };

  return {
    $comment:
      'Generated by schema/generate.ts from the built editor schema — do not edit. Run `pnpm schema:build`.',
    schemaVersion: fingerprint(grammar),
    ...grammar
  };
}

/**
 * A fingerprint of the GRAMMAR, so a consumer can tell whether the document model it cached is still
 * the one the editor builds.
 *
 * Derived, never hand-bumped. A number someone has to remember to increment is a number that is
 * wrong exactly when it matters — after the change nobody thought was breaking. This is computed
 * from the content, so it moves if and only if the content moves.
 *
 * NOTES ARE EXCLUDED, deliberately. `note` is documentation: rewording why a prompt is narrowed does
 * not change what the editor accepts, and it must not invalidate a consumer's cache or show up as a
 * schema change in a C# client. Everything a document's validity depends on — topNode, each node's
 * content expression, group, marks, flags and attribute defaults, the marks, the group index and
 * `identified` — is in. `tagName` and `placeholder` are in too: the first is the markup contract,
 * the second is authoring-visible.
 *
 * FNV-1a rather than a crypto hash because this runs in the browser test as well as in Node, and
 * `node:crypto` is not available in one while `crypto.subtle` is async in both. A 64-bit
 * non-cryptographic hash is the right tool: this detects change, it does not defend against a
 * forger.
 */
function fingerprint(model: Omit<ContentModel, '$comment' | 'schemaVersion'>): string {
  const grammar = {
    topNode: model.topNode,
    nodes: Object.fromEntries(
       
      Object.entries(model.nodes).map(([name, { note: _note, ...rest }]) => [name, rest])
    ),
    marks: model.marks,
    groups: model.groups,
    identified: model.identified
  };

  // JSON.stringify over an object whose key order is already fixed by construction — the same
  // property that makes the file byte-stable makes this hash stable.
  const input = JSON.stringify(grammar);

  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash ^ BigInt(input.charCodeAt(i))) * prime) & mask;
  }
  return `fnv1a64-${hash.toString(16).padStart(16, '0')}`;
}

/** Serialise exactly as the committed fixtures are written, so a test can compare strings. */
export const serialise = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

/**
 * Used only to cross-check the schema against the descriptor registry — see the coverage test.
 *
 * Contains, not ends-with. An anchored /Interaction$/ silently dropped qtiMatchInteractionTabular,
 * a real interaction node with a suffix. That was the second curation bug in an hour, and it is why
 * the fixture split below is not curated at all.
 */
export const isInteractionNode = (name: string): boolean => /Interaction/.test(name);

/**
 * One fixture per interaction — and deliberately NOT one per node.
 *
 * Splitting every node was tried and reverted. It adds no coverage: content-model.json already
 * carries all 38 nodes, and the whole-model comparison catches any change to any of them, order
 * included. Tables, lists and the prose basics are therefore just as verified as the interactions;
 * they simply do not get a file of their own. What the split buys is diff LOCALITY, and that only
 * pays where changes actually land and get reviewed — which is the interactions.
 *
 * The cost of splitting everything is a directory where text.json and hardBreak.json sit beside the
 * things a reviewer cares about, which makes the signal worse, not better.
 *
 * The curation risk this leaves — a filter that quietly omits something — is covered from the other
 * side: `content-model.browser.test.ts` asserts the fixture set equals the filtered schema set AND
 * cross-checks the registered descriptors, so a new interaction cannot slip past without a fixture.
 */
export function interactionSlices(model: ContentModel): Record<string, NodeJson> {
  return Object.fromEntries(Object.entries(model.nodes).filter(([name]) => isInteractionNode(name)));
}

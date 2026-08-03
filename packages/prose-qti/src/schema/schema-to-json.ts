import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

/**
 * Serialise a schema's grammar to a plain JSON-able object.
 *
 *     import { schemaToJson } from '@citolab/prose-qti/node';
 *     writeFileSync('schema.json', JSON.stringify(schemaToJson(), null, 2));
 *
 * The counterpart to the repo's `custom-elements.json`, and it answers a different question. The
 * custom elements manifest says which elements exist and what attributes they take; this says what
 * may nest inside what — `qtiPrompt? qtiSimpleChoice+`, group membership, node order. CEM has no way
 * to express a content model, so neither artifact subsumes the other.
 *
 * ## Why this returns a value instead of writing a file
 *
 * A generator that wrote `content-model.json` to disk lived here until commit 6cdc6d5. It went, with
 * its committed fixtures and a `schemaVersion` fingerprint, because a description of the schema
 * sitting on disk can drift from the schema it describes, and all that machinery existed to stop it.
 * Read off the live schema on demand, there is nothing to drift: this is a projection, not a copy.
 * A caller that wants a file calls `JSON.stringify` — that is the whole of what the writer did.
 *
 * `parseDOM` and `toDOM` are excluded. They are functions, and they describe serialization rather
 * than the document model. `toDOM` is still consulted, but only to read each node's tag name back
 * out of it (see `tagNameOf`).
 *
 * Hand-authored prose about the model — why the editor narrows the QTI XSD — is deliberately NOT
 * here. It lives in `schema/notes.ts` at the repo root, where a test guards it against naming nodes
 * that no longer exist. Nothing in this file is authored; everything is read off the schema.
 */

/**
 * Grammar-bearing NodeSpec flags, in emit order. Emitted only when `true`, so an absent key means
 * false — which is also what a deserialising consumer's `bool` field defaults to.
 */
const FLAGS = ['inline', 'atom', 'defining', 'isolating', 'selectable', 'draggable', 'createGapCursor'] as const;

export type NodeJson = {
  /**
   * The markup tag, not the ProseMirror node name — the object keys are PM names and will not match
   * QTI markup. `heading` reports `h1`; its real tag is `h1`..`h6`, selected by the `level` attr.
   */
  tagName?: string;
  content?: string;
  group?: string;
  marks?: string;
  topNode?: true;
  placeholder?: string;
  /**
   * `{ required: true }` for an attribute with no default — it must be supplied when constructing
   * the node. `{ default: null }` is a real default of null, not an absent one.
   */
  attrs?: Record<string, { default: unknown } | { required: true }>;
} & Partial<Record<(typeof FLAGS)[number], true>>;

export interface SchemaJson {
  topNode: string;
  /**
   * Ordered, and the order is MEANINGFUL: ProseMirror resolves a content expression's default type
   * by first match. Never sorted — a reordering is a real change in editor behaviour, not noise.
   */
  nodes: Record<string, NodeJson>;
  marks: Record<string, { tagName?: string }>;
  /** Reverse index over the `group` fields, so a consumer can resolve a content expression. */
  groups: Record<string, string[]>;
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

/**
 * @param schema Defaults to the roundtrip schema — the one measured against the regression corpus.
 * The repo's other schema is the ProseKit composition built by `schema/editor-schema.ts`, and the
 * two are not interchangeable (see `create-qti-schema.ts`), so this picks neither for you: pass one
 * explicitly to describe it.
 */
export function schemaToJson(schema: Schema = createQtiSchema()): SchemaJson {
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

    const attrs = spec.attrs as Record<string, { default?: unknown }> | undefined;
    if (attrs && Object.keys(attrs).length > 0) {
      out.attrs = {};
      for (const [attr, options] of Object.entries(attrs)) {
        // ProseMirror's own notion of required, computed its way: `Attribute` sets
        // `hasDefault = hasOwnProperty(options, 'default')` and `isRequired = !hasDefault`. Using
        // hasOwnProperty rather than `in` is what separates `{ default: undefined }` — a real
        // default of undefined — from an attribute that declares none. The resolved NodeType
        // carries the same answer, but `NodeType.attrs` is not in prosemirror-model's public
        // typings, and reading the spec needs no cast into an internal.
        out.attrs[attr] = Object.prototype.hasOwnProperty.call(options, 'default')
          ? { default: options.default ?? null }
          : { required: true };
      }
    }

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
  const groups: Record<string, string[]> = {};

  for (const [name, spec] of Object.entries(nodes)) {
    for (const group of (spec.group ?? '').split(/\s+/).filter(Boolean)) (groups[group] ??= []).push(name);
  }

  return { topNode: schema.topNodeType.name, nodes, marks, groups };
}

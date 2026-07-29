/**
 * Emit `schema/content-model.json` from the schema the editor actually builds.
 *
 *   pnpm schema:build
 *
 * Nothing here is authored. It constructs the real composed editor schema — ProseKit's base
 * extension plus every registered QTI descriptor — and serialises the grammar off it. The output
 * is for machine consumers that need the editor's document model without running an editor: a
 * validator, a generator, an importer, or an out-of-process parser in another language.
 *
 * `schema/content-model.mjs` is the human-facing counterpart. Same facts, plus the commentary
 * JSON cannot carry — what the QTI XSD permits, where the editor narrows it, and why. Keep both:
 * `pnpm schema:check` fails if they disagree.
 *
 * ## Determinism
 *
 * Same schema in, byte-identical file out. Node order follows the schema's own order, which is
 * meaningful — ProseMirror resolves a content expression's default type by first match, so
 * reordering changes behaviour. Object keys are emitted in a fixed sequence, never
 * `Object.keys()` order. There is no timestamp in the output; a regenerated file is unchanged
 * unless the schema changed, so a dirty git diff means real drift.
 *
 * ## Notes for consumers
 *
 * - `nodes` is an ordered object. Preserve the order if your parser can; C#'s
 *   `System.Text.Json` does for `JsonObject` / `Dictionary<string, T>` on deserialise.
 * - Boolean fields are emitted only when true. Absent means false, which is what a C# `bool`
 *   field defaults to.
 * - `tagName` is the markup name, read back from each node's `toDOM`. It is what you need to
 *   match QTI XML; the object keys are ProseMirror node names and will not match your markup.
 *   `heading` reports `h1` — its real tag is `h1`..`h6` selected by the `level` attribute.
 * - `attrs` values carry either `{ "default": <value> }` or `{ "required": true }`. A required
 *   attribute has no default and must be supplied when constructing the node. `"default": null`
 *   is a real default of null, not an absent one.
 * - `content` strings are ProseMirror content expressions over these node names and the group
 *   names in `groups`.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createEditor, union } from 'prosekit/core';

import { defineBasicExtension } from '../apps/qti-prosekit-app/src/extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../apps/qti-prosekit-app/src/extensions/qti-interactions-extension.js';
import { IDENTIFIED } from './content-model.mjs';

/**
 * Grammar-bearing NodeSpec fields, in emit order. `parseDOM` / `toDOM` are excluded — they are
 * functions, and they describe serialization rather than the document model.
 */
const FLAGS = ['inline', 'atom', 'defining', 'isolating', 'selectable', 'draggable', 'createGapCursor'] as const;

type NodeJson = {
  tagName?: string;
  content?: string;
  group?: string;
  marks?: string;
  topNode?: true;
  placeholder?: string;
  attrs?: Record<string, { default?: unknown } | { required: true }>;
} & Partial<Record<(typeof FLAGS)[number], true>>;

const schema = createEditor({
  extension: union(defineBasicExtension(), defineQtiInteractionsExtension())
}).schema;

/**
 * Read a node's markup tag by asking its `toDOM` for one.
 *
 * `toDOM` returns a DOMOutputSpec whose first element is the tag name, so a created node round
 * -trips to its own tag without a hand-maintained mapping. Nodes with required attrs are built
 * with `create` rather than `createChecked` so an unfilled content model does not throw — the
 * tag does not depend on the children.
 */
function tagNameOf(name: string): string | undefined {
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

// ── nodes ────────────────────────────────────────────────────────────────────
const nodes: Record<string, NodeJson> = {};
schema.spec.nodes.forEach((name: string, spec: Record<string, unknown>) => {
  const out: NodeJson = {};

  const tagName = tagNameOf(name);
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

  nodes[name] = out;
});

// ── marks ────────────────────────────────────────────────────────────────────
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

// ── groups ───────────────────────────────────────────────────────────────────
// A reverse index over the `group` fields. Content expressions reference these names, so a
// consumer resolving an expression needs to know what each one admits.
const groups: Record<string, string[]> = {};
for (const [name, spec] of Object.entries(nodes)) {
  for (const g of (spec.group ?? '').split(/\s+/).filter(Boolean)) (groups[g] ??= []).push(name);
}

// ── write ────────────────────────────────────────────────────────────────────
const output = {
  $comment:
    'Generated by schema/generate.ts from the built editor schema — do not edit. Run `pnpm schema:build`.',
  topNode: schema.topNodeType.name,
  nodes,
  marks,
  groups,
  /** Nodes whose `identifier` attribute a `correct-response` may reference. See content-model.mjs. */
  identified: IDENTIFIED
};

const target = fileURLToPath(new URL('./content-model.json', import.meta.url));
writeFileSync(target, JSON.stringify(output, null, 2) + '\n');

console.log(
  `✓ wrote schema/content-model.json — ${Object.keys(nodes).length} nodes, ` +
    `${Object.keys(marks).length} marks, ${Object.keys(groups).length} groups`
);

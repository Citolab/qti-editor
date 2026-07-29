/**
 * Verify that content-model.mjs still describes the schema the editor actually builds.
 *
 *   pnpm schema:check
 *
 * Builds the real composed schema — ProseKit's base extension plus every registered QTI
 * descriptor — harvests the grammar-bearing fields off `schema.spec`, and diffs them against
 * NODES / MARKS / GROUPS. Exits non-zero on any divergence.
 *
 * ## Why this is a checker and not a generator
 *
 * Everything below could just as well emit content-model.mjs instead of diffing it. It does not,
 * because the value of that file is roughly half data and half prose — the `XSD:` notes recording
 * where the editor narrows the standard, and the comments explaining why. Codegen would either
 * drop those or demand a side-car annotations file keyed by node name, which is a worse place to
 * write and read them than next to the node they describe.
 *
 * So the file stays hand-authored and this makes it honest. The one failure mode of hand-authoring
 * — quietly drifting from the code — is exactly what this catches, and it caught a real one on its
 * first run (the paragraph/richtext patch; see the notes in content-model.mjs).
 *
 * Fields not compared: `parseDOM` / `toDOM` (functions, and serialization rather than grammar),
 * `attrs` defaults (compared by name only — defaults live in the `*.schema.ts` files), and
 * `tagName` / `placeholder`, which are this file's own additions.
 *
 * ## Running it
 *
 * Runs under `tsx`, which is already a root devDependency. Plain `node` cannot: importing the
 * composer pulls in every Lit custom element through the component barrels, and @qti-components
 * ships extensionless deep imports (`@qti-components/base/dist/register`) that Node's ESM
 * resolver rejects. tsx's resolver handles them. No DOM is needed — ProseKit builds a schema
 * without one.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createEditor, union } from 'prosekit/core';
import { Schema } from 'prosemirror-model';

import { defineBasicExtension } from '../apps/qti-prosekit-app/src/extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../apps/qti-prosekit-app/src/extensions/qti-interactions-extension.js';
import { NODES, MARKS, GROUPS, IDENTIFIED } from './content-model.mjs';

/** Grammar-bearing NodeSpec fields. Anything here that differs is drift. */
const COMPARED = [
  'content',
  'group',
  'inline',
  'atom',
  'marks',
  'defining',
  'isolating',
  'selectable',
  'draggable',
  'createGapCursor'
] as const;

const schema = createEditor({
  extension: union(defineBasicExtension(), defineQtiInteractionsExtension())
}).schema;

const problems: string[] = [];

// ── nodes ────────────────────────────────────────────────────────────────────
const real = new Map<string, Record<string, unknown>>();
schema.spec.nodes.forEach((name: string, spec: Record<string, unknown>) => real.set(name, spec));

for (const name of new Set([...real.keys(), ...Object.keys(NODES)])) {
  const actual = real.get(name);
  const documented = (NODES as Record<string, Record<string, unknown>>)[name];

  if (!actual) {
    problems.push(`${name}: in content-model.mjs, not in the built schema`);
    continue;
  }
  if (!documented) {
    problems.push(`${name}: in the built schema, not in content-model.mjs`);
    continue;
  }

  for (const field of COMPARED) {
    const a = actual[field];
    const d = documented[field];
    if (JSON.stringify(a) !== JSON.stringify(d)) {
      problems.push(`${name}.${field}: schema=${JSON.stringify(a)} file=${JSON.stringify(d)}`);
    }
  }

  const actualAttrs = Object.keys((actual.attrs as object) ?? {}).sort();
  const documentedAttrs = Object.keys((documented.attrs as object) ?? {}).sort();
  if (String(actualAttrs) !== String(documentedAttrs)) {
    problems.push(`${name}.attrs: schema=[${actualAttrs}] file=[${documentedAttrs}]`);
    continue;
  }

  // Defaults too, not just names — `{}` (required) and `{ default: null }` are different
  // things, and reading them off the resolved NodeType is the only way to tell them apart.
  const documentedAttrSpecs = (documented.attrs ?? {}) as Record<string, { default?: unknown }>;
  for (const attr of actualAttrs) {
    const resolved = schema.nodes[name]?.attrs?.[attr];
    const documentedSpec = documentedAttrSpecs[attr];
    const documentedRequired = !('default' in documentedSpec);
    if (resolved.isRequired !== documentedRequired) {
      problems.push(
        `${name}.attrs.${attr}: schema ${resolved.isRequired ? 'is' : 'is not'} required, ` +
          `file says it ${documentedRequired ? 'is' : 'is not'}`
      );
    } else if (!resolved.isRequired && JSON.stringify(resolved.default) !== JSON.stringify(documentedSpec.default)) {
      problems.push(
        `${name}.attrs.${attr}.default: schema=${JSON.stringify(resolved.default)} ` +
          `file=${JSON.stringify(documentedSpec.default)}`
      );
    }
  }
}

// `topNode` is a schema-level option in ProseMirror, not a node field, so it is checked apart.
const documentedTopNode = Object.entries(NODES).find(([, s]) => (s as { topNode?: boolean }).topNode)?.[0];
if (documentedTopNode !== schema.topNodeType.name) {
  problems.push(`topNode: schema=${schema.topNodeType.name} file=${documentedTopNode}`);
}

// ── marks ────────────────────────────────────────────────────────────────────
const realMarks = Object.keys(schema.marks).sort();
const documentedMarks = Object.keys(MARKS).sort();
if (String(realMarks) !== String(documentedMarks)) {
  problems.push(`marks: schema=[${realMarks}] file=[${documentedMarks}]`);
}

// ── groups ───────────────────────────────────────────────────────────────────
// GROUPS is a reverse index over the `group` fields, so it is derived from the built schema
// rather than compared field-by-field. This also proves the documented group memberships are
// reachable — a group nothing joins would silently make some content expression unsatisfiable.
const derived = new Map<string, string[]>();
for (const [name, spec] of real) {
  for (const g of String(spec.group ?? '').split(/\s+/).filter(Boolean)) {
    derived.set(g, [...(derived.get(g) ?? []), name]);
  }
}
for (const g of new Set([...derived.keys(), ...Object.keys(GROUPS)])) {
  const a = [...(derived.get(g) ?? [])].sort();
  const d = [...((GROUPS as Record<string, string[]>)[g] ?? [])].sort();
  if (String(a) !== String(d)) problems.push(`GROUPS.${g}: schema=[${a}] file=[${d}]`);
}

// ── identified ───────────────────────────────────────────────────────────────
for (const name of IDENTIFIED) {
  if (!(real.get(name)?.attrs as Record<string, unknown>)?.identifier) {
    problems.push(`IDENTIFIED lists ${name}, which has no \`identifier\` attribute`);
  }
}

// ── content-model.json is current ────────────────────────────────────────────
// The generator is deterministic, so a committed file that differs from a fresh run is stale.
const jsonPath = fileURLToPath(new URL('./content-model.json', import.meta.url));
const committed = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf8') : null;
if (committed === null) {
  problems.push('schema/content-model.json is missing — run `pnpm schema:build`');
} else {
  execFileSync('node', ['--import', 'tsx', fileURLToPath(new URL('./generate.ts', import.meta.url))], {
    stdio: 'ignore'
  });
  if (readFileSync(jsonPath, 'utf8') !== committed) {
    problems.push('schema/content-model.json is stale — run `pnpm schema:build` and commit');
  }
}

// ── content-model.json is self-sufficient ────────────────────────────────────
// The point of the JSON is that a consumer with nothing but this file can reconstruct the
// grammar. Prove it: rebuild a real ProseMirror Schema from the JSON alone, then fill a
// document from it. If an out-of-process parser (C#, Python, anything) can read this file, it
// has everything the editor's own schema has.
if (existsSync(jsonPath)) {
  const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    topNode: string;
    nodes: Record<string, Record<string, unknown>>;
    marks: Record<string, { tagName?: string }>;
  };
  try {
    const rebuiltNodes: Record<string, Record<string, unknown>> = {};
    for (const [name, spec] of Object.entries(json.nodes)) {
      const { tagName, topNode: _t, placeholder: _p, attrs, ...rest } = spec;
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
    rebuilt.topNodeType.createAndFill()!.check();

    if (Object.keys(rebuilt.nodes).length !== real.size) {
      problems.push(
        `content-model.json rebuilds ${Object.keys(rebuilt.nodes).length} nodes, editor has ${real.size}`
      );
    }
  } catch (error) {
    problems.push(`content-model.json does not rebuild into a valid schema: ${(error as Error).message}`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (problems.length > 0) {
  console.error(`schema/ has drifted from the editor schema:\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(
  `✓ content-model.mjs and content-model.json match the built schema — ` +
    `${real.size} nodes, ${realMarks.length} marks, ${Object.keys(GROUPS).length} groups`
);
console.log(`✓ content-model.json rebuilds into a valid ProseMirror schema on its own`);

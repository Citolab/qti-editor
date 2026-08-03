/**
 * Write the schema fixtures from the schema the editor actually builds.
 *
 *   pnpm schema:build
 *
 * Two outputs, from one construction (see content-model.ts):
 *
 *   content-model.json     the whole grammar, node order intact
 *   __interactions__/<name>.json  one file per interaction node
 *
 * The per-node files exist for the diff, not for consumers. The whole model is 13 KB, so a one-line
 * change to qtiOrderInteraction used to surface as a hunk in the middle of an unrelated wall of
 * JSON. Split, a failing fixture names the node in the filename and the diff is the few lines that
 * actually moved. content-model.json stays the authority — it is what carries node ORDER, which the
 * split files cannot express and which is load-bearing (ProseMirror resolves a content expression's
 * default type by first match).
 *
 * ## content-model.json ships
 *
 * packages/prose-qti copies it into its dist at build time and exports it as
 * `@citolab/prose-qti/content-model`, so a consumer imports the document model rather than reaching
 * into this repo. The copy is a `cp` in that package's build script, so the build fails loudly if
 * this file is missing — deliberate: shipping a stale or absent content model silently would be
 * worse than not building at all.
 *
 * It carries a `schemaVersion`: a fingerprint of the grammar, derived and never hand-bumped, which
 * excludes the notes so it moves when the document model moves and not when prose is reworded.
 *
 * `schema/notes.ts` is the human-facing counterpart: same facts, plus the commentary JSON
 * cannot carry — what the QTI XSD permits, where the editor narrows it, and why. Keep both;
 * `schema/content-model.browser.test.ts` fails if they disagree.
 *
 * ## Notes for consumers of content-model.json
 *
 * - `nodes` is an ordered object. Preserve the order if your parser can; C#'s `System.Text.Json`
 *   does for `JsonObject` / `Dictionary<string, T>` on deserialise.
 * - Boolean fields are emitted only when true. Absent means false, which is what a C# `bool` field
 *   defaults to.
 * - `tagName` is the markup name, read back from each node's `toDOM`. It is what you need to match
 *   QTI XML; the object keys are ProseMirror node names and will not match your markup. `heading`
 *   reports `h1` — its real tag is `h1`..`h6` selected by the `level` attribute.
 * - `attrs` values carry either `{ "default": <value> }` or `{ "required": true }`. A required
 *   attribute has no default and must be supplied when constructing the node. `"default": null` is
 *   a real default of null, not an absent one.
 * - `content` strings are ProseMirror content expressions over these node names and the group names
 *   in `groups`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildContentModel, interactionSlices, serialise } from './content-model';

const model = buildContentModel();

const target = fileURLToPath(new URL('./content-model.json', import.meta.url));
writeFileSync(target, serialise(model));

// ── per-interaction fixtures ─────────────────────────────────────────────────
// Emptied first, so removing an interaction removes its fixture instead of leaving a stale file
// that no test would ever look at again.
//
// Interactions only, not every node: content-model.json above already covers all of them, so this
// split is for diff locality rather than coverage. See interactionSlices in content-model.ts.
const interactionsDir = fileURLToPath(new URL('./__interactions__/', import.meta.url));
mkdirSync(interactionsDir, { recursive: true });
for (const stale of readdirSync(interactionsDir).filter(f => f.endsWith('.json'))) {
  rmSync(`${interactionsDir}${stale}`);
}

const slices = interactionSlices(model);
for (const [name, spec] of Object.entries(slices)) {
  writeFileSync(fileURLToPath(new URL(`./__interactions__/${name}.json`, import.meta.url)), serialise(spec));
}

console.log(
  `✓ wrote schema/content-model.json — ${Object.keys(model.nodes).length} nodes, ` +
    `${Object.keys(model.marks).length} marks, ${Object.keys(model.groups).length} groups`
);
console.log(`✓ wrote ${Object.keys(slices).length} per-interaction fixtures to schema/__interactions__/`);

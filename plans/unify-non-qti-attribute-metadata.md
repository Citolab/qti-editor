# Plan: Unify the two sources of truth for non-QTI attributes

## Goal

Today each non-QTI attribute is declared in **two** places that must be kept in sync by hand:

1. **Strip declaration** — `nonQtiAttributes: string[]` on each interaction's `composer/metadata.ts`. Drives `normalizedElement.removeAttribute(...)` in the per-interaction `.compose.ts`.
2. **`data-*` mirror declaration** — hardcoded mapping tables duplicated in three places:
   - [packages/qti/core/src/composer/index.ts:56-69](packages/qti/core/src/composer/index.ts#L56-L69) — `EDITOR_DATA_ATTRIBUTE_MAPPINGS`, `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS`, `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS` (DOM Element mutation)
   - [packages/qti/roundtrip-export/src/index.ts:35-48](packages/qti/roundtrip-export/src/index.ts#L35-L48) — same three tables, **separate copy**, used by a regex-based string pass over serialized XML at [packages/qti/roundtrip-export/src/index.ts:287-300](packages/qti/roundtrip-export/src/index.ts#L287-L300)
   - [packages/qti/roundtrip-import/src/index.ts:36-41](packages/qti/roundtrip-import/src/index.ts#L36-L41) — `DATA_ATTRIBUTE_MAPPINGS` (the inverse, drives `data-*` → editor-attr on import at [line 182](packages/qti/roundtrip-import/src/index.ts#L182))

Make the per-interaction metadata the **single declarative source** that drives all three sites.

---

## Benefits vs disadvantages

### Benefits

- **No drift.** Adding a non-QTI attribute today requires editing 5 files (interaction metadata, compose.ts read site, two export mapping tables, one import mapping table) plus two docs. After unification: edit the interaction metadata, the rest is derived.
- **Locality.** The declaration of "what attributes does this interaction expose beyond standard QTI" lives next to the interaction definition, not in central tables that have to scope by tagName (the `if (tagName === SELECT_POINT_INTERACTION_TAG)` branches in core/composer disappear).
- **Reviewer model collapses.** Today a reviewer reading a PR that adds a non-QTI attr has to remember and verify three places stay in sync. After unification: one place.
- **One implementation of the mirror logic.** Today the mirror runs twice — once as DOM mutation in `core/composer/index.ts:118-140`, once as a regex over a serialized XML string in `roundtrip-export/src/index.ts:287-311`. Both can call a single shared helper that takes the registry and an Element.
- **The contract test stays valid for free.** [packages/qti/roundtrip-export/src/contract.test.ts](packages/qti/roundtrip-export/src/contract.test.ts) already enforces forward-target ↔ inverse-source parity by reading both tables; rewiring it to read from the unified registry is one edit.

### Disadvantages / risks

- **Touches the lossless round-trip contract.** The wire format is the contract — `data-correct-response`, `data-score`, etc. Any change that alters which `data-*` attributes are produced or how they round-trip is a wire-format break. Mitigation: snapshot test on a fixture corpus before any code change and assert byte-equal output after each migration step.
- **Cross-package coupling.** Today the interaction metadata is owned by `@qti-editor/interaction-*` packages; the `data-*` mapping is owned by `@qti-editor/qti-core` and `@qti-editor/qti-roundtrip-{export,import}`. The unification requires the core/roundtrip packages to read interaction metadata. Mitigation: route via the existing interaction registry already exposed by `@qti-editor/qti-core/interactions/composer` (which currently has compile errors in `prosekit-integration` but is otherwise the canonical registry).
- **`rubricScoringBlock` is special.** It is listed in `extended-text`'s `nonQtiAttributes` but is **not** in any `data-*` mapping table — i.e. today it is stripped on compose but **not mirrored on export**. After unification this needs an explicit "strip only, do not mirror" opt-out, or it silently starts producing `data-rubricscoringblock` on export (a *new* wire-format addition and very likely a bug if anything in re-import is non-roundtrip-aware). Mitigation: support an explicit `{ source, mirror: false }` shape, and apply it to `rubricScoringBlock`.
- **`correctResponse` / `correctAnswer` aliases are a defensive net, not dead code.** The forward mapping has three sources mapping to the same target (`correct-response`, `correctResponse`, `correctAnswer` → `data-correct-response`). Initial investigation suggested the camelCase entries were dead code (because [`renameLegacyHtmlAttributes`](packages/prosemirror/extensions/src/compatibility/migrations.ts#L164) rewrites them upstream). The Phase 1 snapshot proved otherwise: when raw XML is fed directly to `buildAssessmentItemXml`, the upstream rename does not run, and the alias entries fire to mirror camelCase to the canonical `data-*` target. The unification therefore **keeps** the aliases, encoded in the unified shape via the `aliases?: readonly string[]` field. Snapshot stays byte-identical across Phases 3-5.
- **Ordering / determinism.** Today the mappings are static `as const` arrays in a fixed order. If the unified registry is built by iterating a `Record<tagName, metadata>` the iteration order could differ across runtimes. Most `setAttribute` calls are idempotent so order doesn't matter functionally, but the existing contract test and roundtrip snapshot tests may compare serialized output. Mitigation: when collecting the registry, sort entries by `target` (or by `tagName, source`) so output is stable.
- **Performance.** The static `as const` tables are tiny and the forEach loops trivial. A derived registry built once at module load is equivalent. Building the registry per call would be wasteful — make it lazy/memoized.
- **Coverage gap surfacing.** Once unified, the regex-based pass in `roundtrip-export/src/index.ts:287-311` (which operates on a serialized XML *string* via a tag-name regex) needs the same registry. That regex pass exists because the post-`cleanXmlString` step deletes attrs and the pass re-adds the mirrors from the pre-clean version. We'll keep that pipeline structure but call the unified helper from inside it.
- **Shape choice: `string[]` vs discriminated `string | { source, mirror?, aliases? }[]`.** A bare `string[]` works for entries with no special needs (`score`, `case-sensitive`, `area-mappings`). Two cases need the object form: `rubricScoringBlock` (strip-only via `mirror: false`) and `correct-response` (alias support for camelCase variants via `aliases`). **Recommendation: discriminated shape, used in two places per interaction.**

### Net judgment

The unification is **worth doing** because the existing structure has three near-identical mapping tables that must stay in lockstep, and the contract test only catches forward/inverse target/source parity — it does NOT catch the "I added a non-QTI attr to metadata but forgot to add the mirror" case (which is exactly the class of bug that motivated the original Phase 2 fix in `plans/nonqti-attributes-rename-and-subformat-doc.md`).

The risk is bounded: round-trip is test-guarded and we can add a byte-equal snapshot test on a fixture corpus before any production code change. The work is contained to ~4-5 files.

---

## Proposed unified API

### Shape

In `packages/interfaces/src/composer.ts`:

```ts
export type NonQtiAttribute =
  | string
  | {
      /** The canonical attribute name on the source element. */
      source: string;
      /**
       * The data-* attribute to mirror to.
       * - Omit to derive as `data-${source}`.
       * - Set to `false` to strip without mirroring (e.g. `rubricScoringBlock`).
       */
      mirror?: string | false;
      /**
       * Additional source attribute names that should also mirror to the same target.
       * Used for casing variants (e.g. `correctResponse`, `correctAnswer` → `data-correct-response`).
       * These act as a defensive net for raw-XML callers that bypass the upstream
       * `renameLegacyHtmlAttributes` migration.
       */
      aliases?: readonly string[];
    };

export interface InteractionComposerMetadata {
  // ...
  nonQtiAttributes: readonly NonQtiAttribute[];
  // ...
}
```

### Derived helpers (in `@qti-editor/qti-core`)

A new module `packages/qti/core/src/composer/non-qti-attributes.ts`:

```ts
export interface NonQtiAttributeEntry {
  source: string;            // canonical attribute on the source element
  mirror: string | null;     // data-* target, or null for strip-only
  aliases: readonly string[]; // additional source names that map to the same target
}

export function normalizeNonQtiAttribute(entry: NonQtiAttribute): NonQtiAttributeEntry { ... }

export function collectMirrorMappings(
  tagName: string,
  metadata: InteractionComposerMetadata,
): ReadonlyArray<{ source: string; target: string }> { ... }

export function stripNonQtiAttributesFromElement(
  element: Element,
  metadata: InteractionComposerMetadata,
): void { ... }

export function copyMirrorsToTarget(
  sourceElement: Element,
  targetElement: Element,
  metadata: InteractionComposerMetadata,
): void { ... }

/** All `data-*` targets across all registered interactions; used by import. */
export function getAllMirrorTargets(
  registry: ReadonlyMap<string, InteractionComposerMetadata>,
): ReadonlyArray<{ source: string; target: string }> { ... }
```

The importer in `roundtrip-import` consumes `getAllMirrorTargets(registry)` to derive its `data-*` → source list. The export helpers replace the three hardcoded tables in `core/composer/index.ts` and the regex pass in `roundtrip-export/src/index.ts`.

### Per-interaction declarations after unification

```ts
// Shared constant to avoid repeating the alias list in every interaction.
// Defined once in @qti-editor/interaction-shared and imported below.
const CORRECT_RESPONSE: NonQtiAttribute = {
  source: 'correct-response',
  aliases: ['correctResponse', 'correctAnswer'],
};

// interaction-choice/.../metadata.ts
nonQtiAttributes: [CORRECT_RESPONSE, 'score'],

// interaction-text-entry/.../metadata.ts
nonQtiAttributes: ['case-sensitive', CORRECT_RESPONSE, 'score'],

// interaction-select-point/.../metadata.ts
nonQtiAttributes: ['area-mappings', CORRECT_RESPONSE, 'score'],

// interaction-extended-text/.../metadata.ts   — strip-only special case
nonQtiAttributes: [
  CORRECT_RESPONSE,
  { source: 'rubricScoringBlock', mirror: false },  // strip only, do not mirror
  'score',
],
```

Most entries stay as plain strings. The object form covers two special cases:
- **Aliases** (the universal `correct-response` entry): the source element may arrive with camelCase `correctResponse` or `correctAnswer` if it bypassed the upstream [`renameLegacyHtmlAttributes`](packages/prosemirror/extensions/src/compatibility/migrations.ts#L164) migration (e.g. raw XML fed directly to `buildAssessmentItemXml`). Aliases preserve the existing defensive-net behavior captured in the Phase 1 snapshot.
- **Strip-only** (`rubricScoringBlock`): stripped but NOT mirrored, because the rubric content is preserved via a synthesized `<qti-rubric-block>` element instead of a `data-*` attribute.

---

## Out of scope (do not change)

- The `data-*` attribute names themselves (`data-correct-response`, `data-score`, `data-case-sensitive`, `data-area-mappings`). Wire format is frozen.
- The ordering of attributes in the serialized XML output (must be byte-identical after migration — see snapshot test in Phase 1).
- ProseMirror schemas (`*.schema.ts`) and their `parseDOM`/`toDOM`.
- The QTI 3.0 attributes themselves (`response-identifier`, `max-choices`, etc.).
- The existing `nonQtiAttributes` documentation in `apps/site/src/content/docs/packages/itembody-subformat.mdx` — that gets a small update in the final phase, not a rewrite.
- Fixing the pre-existing `prosekit-integration` and `roundtrip-import` typecheck failures that surfaced in the prior plan — separate concern.

---

## Phase 0 — Facts established (do not re-discover)

Already verified in the prior plan and confirmed below:

### Source-of-truth tables today

- **`packages/qti/core/src/composer/index.ts:56-69`** — three `as const` tables; consumed by `preserveEditorDataAttributes(sourceElement, targetElement, tagName)` at lines 118-140, called once at line 539 in `composeAndNormalizeItemBody`.
- **`packages/qti/roundtrip-export/src/index.ts:35-48`** — three EXPORTED `as const` tables (the export-side copy); consumed by `preserveEditorDataAttributesInTag(tagName, attributes)` at lines 296-311 inside the string-regex pass `preserveEditorDataAttributes(xml: string)` at lines 287-294, called once at line 259 after `cleanXmlString`.
- **`packages/qti/roundtrip-import/src/index.ts:36-41`** — `DATA_ATTRIBUTE_MAPPINGS` inverse table; consumed at line 182.
- **`packages/qti/roundtrip-export/src/contract.test.ts`** — already asserts forward.target set === inverse.source set across packages. This test is the safety net.

### Per-interaction `nonQtiAttributes` (post-phase-2 of the prior plan)

| Interaction | current `nonQtiAttributes` |
|---|---|
| choice | `['correct-response', 'score']` |
| extended-text | `['correct-response', 'rubricScoringBlock', 'score']` |
| associate | `['correct-response', 'score']` |
| hottext | `['correct-response', 'score']` |
| text-entry | `['case-sensitive', 'correct-response', 'score']` |
| match | `['correct-response', 'score']` |
| gap-match | `['correct-response', 'score']` |
| order | `['correct-response', 'score']` |
| inline-choice | `['correct-response', 'score']` |
| select-point | `['area-mappings', 'correct-response', 'score']` |

### Forward export mapping today

```
correct-response   →  data-correct-response   (universal across all interactions)
score              →  data-score              (universal)
case-sensitive     →  data-case-sensitive     (text-entry only)
area-mappings      →  data-area-mappings      (select-point only)
```

**Aliases preserved:** `correctResponse` and `correctAnswer` exist in the forward mapping today as aliases for `correct-response`. Initial analysis claimed they were dead code (because [`renameLegacyHtmlAttributes`](packages/prosemirror/extensions/src/compatibility/migrations.ts#L164) rewrites them upstream), but the Phase 1 DOM-compose snapshot proved they DO fire when raw XML bypasses that upstream rename. The unification preserves them by encoding them in the unified shape via `aliases: [...]` on the canonical `correct-response` entry. The other camelCase legacy names (`caseSensitive`, `areaMappings`, etc.) do NOT have alias entries today and the snapshot does not exercise them — no change needed for those.

`rubricScoringBlock` — stripped from extended-text on compose, NOT mirrored to any `data-*` today. (Whether that is intentional or a bug is out of scope for this plan; **the migration MUST preserve current behavior**: stripped, not mirrored.)

---

## Phase 1 — Snapshot the existing wire format

### What to do

Before any code change, lock in the current `data-*` output as a snapshot fixture. This becomes the byte-equal regression detector for every subsequent phase.

### Steps

1. Identify a representative item corpus. Use existing test fixtures under `packages/qti/roundtrip-export/src/**` and `packages/qti/roundtrip-import/src/**` (read these to enumerate what fixtures already exist). Add 1-2 fresh fixtures covering:
   - one item per interaction type (all 10)
   - one extended-text with `rubricScoringBlock` set to confirm it is stripped, not mirrored
   - one item authoring legacy camelCase `correctResponse="..."` on a `qti-choice-interaction` source element. This locks the alias-mirror behavior (the alias fires when the upstream rename did not run). The unification must keep this snapshot byte-identical.
2. Create `packages/qti/roundtrip-export/src/non-qti-mirror.snapshot.test.ts` that:
   - takes each fixture HTML/ProseMirror input
   - runs the existing export path end-to-end
   - asserts the serialized XML matches a stored `.snap`
3. Run the test once to capture snapshots. Commit them.

### Verification

- `pnpm --filter @qti-editor/qti-roundtrip-export test` passes including the new snapshot test.
- The `.snap` files exist and contain the current `data-*` output.
- Visually inspect at least one snapshot for an interaction you know well (e.g. choice) to confirm `data-correct-response="..."` and `data-score="..."` appear and `correct-response`/`score` do NOT.

### Anti-patterns

- Don't generate fixtures with `Math.random()` or timestamps — the snapshots must be deterministic.
- Don't snapshot the entire IMS package zip — snapshot the per-item XML string only. The package wrapper has timestamp-like fields we don't want to assert on.

---

## Phase 2 — Introduce the unified types and helper module

### What to do

Add the type and the helper module. NO existing call sites change yet. The new module sits alongside the old code and compiles green.

### Files to create / edit

1. **Edit** `packages/interfaces/src/composer.ts` — add the `NonQtiAttribute` type (union of string | object) as specified in "Proposed unified API → Shape". Change `InteractionComposerMetadata.nonQtiAttributes` from `readonly string[]` to `readonly NonQtiAttribute[]`. Because every current entry is a string, this is backwards-compatible at the data level — existing arrays satisfy the new type unchanged.
2. **Create** `packages/qti/core/src/composer/non-qti-attributes.ts` — implement `normalizeNonQtiAttribute`, `collectMirrorMappings`, `stripNonQtiAttributesFromElement`, `copyMirrorsToTarget`, `getAllMirrorTargets`. Pure functions, no side effects.
   - The `mirror` derivation rule when `mirror` is omitted: `data-${source}` (no case folding — all current canonical sources are already lowercase-hyphenated, e.g. `correct-response` → `data-correct-response`).
   - For the object form with `mirror: false`, the entry contributes to the strip set but not the mirror set.
   - For an entry with `aliases: [...]`, `collectMirrorMappings` emits one tuple per source name (canonical + each alias) all targeting the same mirror. Example: `{source: 'correct-response', aliases: ['correctResponse', 'correctAnswer']}` produces three mirror tuples — `('correct-response', 'data-correct-response')`, `('correctResponse', 'data-correct-response')`, `('correctAnswer', 'data-correct-response')`. `stripNonQtiAttributesFromElement` strips the canonical name only (matching today's behavior where camelCase aliases survive on the output element).
3. **Define `CORRECT_RESPONSE`** as a shared constant in `packages/prosemirror/interaction-shared/src/composer/non-qti-attributes.ts` (or wherever common interaction-shared metadata lives). Export it so each interaction metadata file can import it instead of repeating the alias list.
4. **Export** the new helpers from `@qti-editor/qti-core/composer` (extend the index barrel if needed).
5. **Add unit tests** at `packages/qti/core/src/composer/non-qti-attributes.test.ts`:
   - `normalizeNonQtiAttribute('score')` → `{ source: 'score', mirror: 'data-score', aliases: [] }`
   - `normalizeNonQtiAttribute({ source: 'rubricScoringBlock', mirror: false })` → `{ source: 'rubricScoringBlock', mirror: null, aliases: [] }`
   - `normalizeNonQtiAttribute({ source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] })` → `{ source: 'correct-response', mirror: 'data-correct-response', aliases: ['correctResponse', 'correctAnswer'] }`
   - `collectMirrorMappings` for a sample metadata returns the expected flat `{source, target}` list including alias expansions and excluding strip-only entries.
   - `stripNonQtiAttributesFromElement` removes the canonical source attribute from the element for every entry (strip-only entries included). Aliases are NOT stripped (matching today's behavior in the Phase 1 snapshot).
   - `copyMirrorsToTarget` copies the value if present under canonical source OR any alias, prefers the canonical source if multiple are present, and never sets the mirror for strip-only entries.

### Verification

- `pnpm --filter @qti-editor/interfaces typecheck` passes.
- `pnpm --filter @qti-editor/qti-core test` passes including the new unit tests.
- Old code untouched — `pnpm --filter @qti-editor/qti-roundtrip-export test` still passes (the Phase 1 snapshot test is unchanged).

### Anti-patterns

- Don't change any existing call site in this phase. The helper is dormant until Phase 3-5.
- Don't introduce a global "registry" object yet — the helpers take metadata (and tagName for the alias resolution) as parameters. Phase 5 wires them up.

---

## Phase 3 — Switch the compose pipeline (core/composer)

### What to do

Replace the per-interaction strip loops in each `.compose.ts` AND the `preserveEditorDataAttributes` in `core/composer/index.ts` to use the unified helpers. Delete the three hardcoded tables in `core/composer/index.ts` (but NOT yet in `roundtrip-export` — that's Phase 4).

### Steps

1. In each of the 10 interaction `.compose.ts` files, replace:
   ```ts
   const nonQtiAttributes = [...metadata.nonQtiAttributes];
   nonQtiAttributes.forEach(attr => normalizedElement.removeAttribute(attr));
   ```
   with:
   ```ts
   stripNonQtiAttributesFromElement(normalizedElement, metadata);
   ```
   Also: the returned `nonQtiAttributes` field in `InteractionComposeResult` — change its semantics from "list of attr names that were stripped" to "the normalized list from `collectMirrorMappings(...)`" or keep as-is for backwards compat. **Recommendation**: keep the return field as a flat list of canonical source names (`collectMirrorMappings(...).map(m => m.source)` deduped) since no current downstream actually reads it for anything functional (verify with grep before deciding).
2. In `packages/qti/core/src/composer/index.ts`:
   - Delete lines 56-69 (the three `as const` tables) and `TEXT_ENTRY_INTERACTION_TAG`/`SELECT_POINT_INTERACTION_TAG` constants if unused elsewhere.
   - Delete `copyEditorDataAttribute` and `preserveEditorDataAttributes` (lines 118-140).
   - At line 539, replace `preserveEditorDataAttributes(element, composeResult.normalizedElement, tagName)` with `copyMirrorsToTarget(element, composeResult.normalizedElement, metadata)` where `metadata` is the interaction's `InteractionComposerMetadata` from the registry. The existing call site already has `composeResult` and `tagName` — fetch metadata via the existing interaction registry.

### Verification

1. `pnpm --filter @qti-editor/qti-core test` passes.
2. **The Phase 1 snapshot test must still pass byte-identically.** `pnpm --filter @qti-editor/qti-roundtrip-export test` — if any `.snap` diff appears, STOP and investigate before continuing.
3. `pnpm -r --no-bail run typecheck` — no new errors beyond the pre-existing ones.

### Anti-patterns

- Don't delete the tables in `roundtrip-export/src/index.ts` yet — Phase 4 owns that.
- Don't change attribute ordering in the output. If `collectMirrorMappings` iteration order differs from the old static array order, the snapshot will diff. If diverged, sort `collectMirrorMappings` output by `target` (or match the original order: canonical source first, then aliases, then any per-tag extras like `case-sensitive` / `area-mappings`).
- Don't add new attributes to any interaction's `nonQtiAttributes` list in this phase — it's a code refactor, not a feature change.

---

## Phase 4 — Switch the roundtrip-export string-regex pass

### What to do

`packages/qti/roundtrip-export/src/index.ts` has a SECOND implementation that operates on serialized XML strings (because it runs *after* `cleanXmlString` has dropped attributes). Replace it with a string-aware version of the same unified helper, OR keep the string-regex shape and feed it from `collectMirrorMappings(tagName, registry)`.

### Steps

1. In `packages/qti/roundtrip-export/src/index.ts`:
   - Replace the bodies of `preserveEditorDataAttributesInTag` (lines 296-311) and `preserveEditorDataAttributes` (lines 287-294) so the mapping list comes from `collectMirrorMappings(tagName, registry)` where `registry` is the same interaction registry exposed by `@qti-editor/qti-core`.
   - Delete the three exported `as const` tables (lines 35-48), `TEXT_ENTRY_INTERACTION_TAG`, `SELECT_POINT_INTERACTION_TAG`. This is a breaking removal of public exports. Search the workspace first: any consumer of those exports (especially `contract.test.ts`) must be updated in the same commit.
   - **Aliases are preserved**, not deleted: the `correctResponse` and `correctAnswer` entries from the old `EDITOR_DATA_ATTRIBUTE_MAPPINGS` re-emerge in the derived list because the shared `CORRECT_RESPONSE` constant (Phase 2) declares them in `aliases`. The two snapshot tests (DOM compose + regex pipeline) must both stay byte-identical after this switch — particularly the camelCase fixture in the DOM-compose snapshot, which proves the alias path still fires.
2. Update `packages/qti/roundtrip-export/src/contract.test.ts` (it currently imports `EDITOR_DATA_ATTRIBUTE_MAPPINGS`, `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS`, `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS`) to derive the same forward-target set from `getAllMirrorTargets(registry)` (or `collectMirrorMappings` aggregated across all registered tags).

### Verification

1. **Phase 1 snapshot test passes byte-identically.** This is the critical guard for this phase.
2. `pnpm --filter @qti-editor/qti-roundtrip-export test` passes including `contract.test.ts`.
3. `pnpm -r --no-bail run typecheck` — confirm no new consumers of the removed exports.

### Anti-patterns

- Don't change the regex tokenization in `preserveEditorDataAttributes(xml: string)`. The function takes a serialized XML string and re-writes per-tag attributes; that pipeline shape stays. Only the data source changes.
- Don't unify the string-regex pass with the DOM-Element pass in this phase. They operate at different points in the export pipeline (post-clean string vs in-compose DOM); keeping them as two callers of the same `collectMirrorMappings` is fine.

---

## Phase 5 — Switch the roundtrip-import inverse

### What to do

`packages/qti/roundtrip-import/src/index.ts` has the inverse `DATA_ATTRIBUTE_MAPPINGS` at lines 36-41. Derive it from the registry instead.

### Steps

1. Replace the hardcoded array with a derived one:
   ```ts
   import { getAllMirrorTargets, interactionRegistry } from '@qti-editor/qti-core/composer';
   export const DATA_ATTRIBUTE_MAPPINGS = getAllMirrorTargets(interactionRegistry).map(
     ({ source, target }) => ({ source: target, target: source })
   );
   ```
   (Names: the export-side has `source → target` where target is `data-*`. The import-side `DATA_ATTRIBUTE_MAPPINGS` has `source = data-*, target = canonical-name`. Compute accordingly. Dedupe by `source`: aliases all collapse to one inverse entry since `data-correct-response` only needs to round-trip back to one canonical name — pick `correct-response` (the canonical source on the forward entry, not an alias).)
2. The consumer at line 182 (`DATA_ATTRIBUTE_MAPPINGS.forEach(...)`) needs no change since the shape is preserved.

### Verification

1. **Phase 1 snapshot test still passes** (this phase is import-side; doesn't affect export, but run it anyway as a sanity check).
2. `pnpm --filter @qti-editor/qti-roundtrip-import test` passes.
3. Manual round-trip: import a fixture that has `data-correct-response="A"` on a `qti-choice-interaction`, confirm the imported ProseMirror node has `correctResponse: 'A'` (or whatever the schema key is — verify against `qti-choice-interaction.schema.ts`).
4. Run the existing contract test from Phase 4 — it explicitly enforces forward/inverse parity; if anything went wrong, it fires.

### Anti-patterns

- Don't try to preserve all three alias casings on the inverse side. Import only sees `data-correct-response` (one form) and only needs to produce one editor-facing attr name. The export-side alias variation only matters for what the *editor* might put on the element pre-strip.
- Don't introduce a circular dep between `roundtrip-import` and `qti-core`. Check `package.json` dependency direction — if `qti-core` currently does not depend on `roundtrip-import`, then `roundtrip-import` depending on `qti-core` is fine. If both already depend on a shared `interfaces` package, ensure the registry export lives in `qti-core` and stays available without circling back.

---

## Phase 6 — Documentation update

### What to do

Update the subformat doc and architecture doc to reflect the new single source of truth.

### Steps

1. **Edit** `apps/site/src/content/docs/packages/itembody-subformat.mdx`:
   - Remove the closing paragraph "The metadata list and the hardcoded mapping tables are intentionally separate today; if/when they are unified, this guide should be updated."
   - Add a new section "Where the data-* mirrors come from":
     ```mdx
     ## Where the data-* mirrors come from

     The `data-*` mirror behavior is derived automatically from each interaction's
     `nonQtiAttributes` declaration. For a plain `string` entry like `'score'`, the
     mirror is `data-score`. The object form covers two cases:

     ```ts
     // Strip-only — no data-* mirror, value is preserved elsewhere
     { source: 'rubricScoringBlock', mirror: false }

     // Aliases — multiple source-name casings collapse to one data-* target
     { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] }
     ```

     The helper `collectMirrorMappings(tagName, metadata)` in
     `@qti-editor/qti-core/composer` is the single source of truth; both the
     compose pipeline and the roundtrip-{export,import} packages call it.
     ```
   - Update the "Adding a new non-QTI attribute" 5-step guide to a 2-step guide:
     1. Add the attribute to `nonQtiAttributes` in the interaction's `composer/metadata.ts` (as a string for the simple case, or an object for strip-only / aliasing).
     2. Read it in the interaction's `.compose.ts` and propagate to the response declaration / UI state as needed.
   - Remove the references to `EDITOR_DATA_ATTRIBUTE_MAPPINGS` / `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS` / `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS` and the import `DATA_ATTRIBUTE_MAPPINGS` (these tables no longer exist).
2. **Edit** `packages/qti/roundtrip-export/ROUNDTRIP.md` — the per-tag mapping table content stays accurate (the wire format is unchanged), but add a sentence noting that the table is now *derived* from the per-interaction `nonQtiAttributes` declarations.
3. **Edit** `docs/architecture.md` — the existing paragraph linking to the subformat doc is still valid; no change needed unless it mentions the separate tables anywhere (grep first).

### Verification

- `rg -n "EDITOR_DATA_ATTRIBUTE_MAPPINGS|TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS|SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS|DATA_ATTRIBUTE_MAPPINGS" --type ts` — should only hit the consumer in `roundtrip-import/src/index.ts` (the inverse export) and the contract test. The forward `as const` definitions should be gone.
- All doc links resolve.
- The site builds (if possible to run: `pnpm --filter site build` or `pnpm --filter site dev` smoke-check).

### Anti-patterns

- Don't claim the migration "removes the round-trip table from ROUNDTRIP.md" — the table is the canonical reference for the wire format, and that wire format is unchanged. Only the implementation source changed.
- Don't add forward-looking "future improvements" notes to the doc — this plan delivered the unification; the doc is now describing current state.

---

## Phase 7 — Final verification

### Checks

1. **No stale mapping tables:**
   ```bash
   rg -n "EDITOR_DATA_ATTRIBUTE_MAPPINGS\s*=\s*\[" --type ts
   rg -n "TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS\s*=\s*\[" --type ts
   rg -n "SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS\s*=\s*\[" --type ts
   ```
   All three return zero hits (the definitions are gone; only the import-side `DATA_ATTRIBUTE_MAPPINGS` remains, and it is now derived).

2. **Phase 1 snapshot test still passes** byte-identically:
   ```bash
   pnpm --filter @qti-editor/qti-roundtrip-export test
   ```

3. **Full workspace tests:**
   ```bash
   pnpm exec vitest run --project unit
   ```
   All tests pass; only the two pre-existing typecheck failures (`prosekit-integration`, `roundtrip-import` — known from prior plan) remain on typecheck.

4. **Add a non-QTI attribute end-to-end smoke test** (the actual deliverable proof):
   - Pick one interaction (e.g. `interaction-text-entry`).
   - Add a fictitious `'foo-bar'` to its `nonQtiAttributes`.
   - In a test, render an item with `<qti-text-entry-interaction foo-bar="x">`, run the export pipeline, assert the output has `data-foo-bar="x"` and NOT `foo-bar="x"`.
   - Run import on that output, assert the imported model has `foo-bar` restored.
   - **Revert the `foo-bar` addition** after the test — this is a smoke proof, not a feature.

5. **Manual review checklist:**
   - All 10 interaction `metadata.ts` files declare their non-QTI attrs in the new shape.
   - The `extended-text` declaration has `{ source: 'rubricScoringBlock', mirror: false }` and the snapshot proves no `data-rubricscoringblock` appears in output.
   - The contract test reads from the derived registry and still passes.

### Done when

- All snapshot tests byte-equal.
- The three forward mapping tables are deleted; only the derived registry remains.
- The subformat doc explains the unified model.
- A reviewer can add a new non-QTI attribute by editing ONE file (the interaction's `metadata.ts`).

---

## Risk-bounding rules (applies to every phase)

- **Never delete a mapping table without running the Phase 1 snapshot test first.** If the snapshot diffs, revert and investigate.
- **Never change the wire format byte order or attribute spelling.** If you must reorder, sort `collectMirrorMappings` output to match the historical order.
- **The `correctResponse` / `correctAnswer` aliases are preserved through the migration.** The Phase 1 snapshot includes a camelCase fixture proving they fire today (when raw XML bypasses upstream rename). Phase 2-5 must keep that snapshot byte-identical. If the snapshot diffs on the camelCase fixture, the unified registry's alias handling is wrong — fix the helper, do not delete the fixture.
- **Pre-existing unrelated failures stay unrelated.** `prosekit-integration` and `roundtrip-import` (the `buildCompatibilityReport`/`migrateHtmlFragment` issue) were broken before this work; don't try to fix them here.

---

## See also

- [plans/rubric-block-attribute.md](plans/rubric-block-attribute.md) — recommended follow-up. Renames `correct-response` → `rubric-block` on `qti-extended-text-interaction` (eliminating the editor's only attribute-name overload) and promotes `rubric-block` to a reusable non-QTI attribute that any future interaction can opt into. Depends on this plan's unified `NonQtiAttribute` shape.
- [plans/qti3-item-import.md](plans/qti3-item-import.md) — follow-up. Ships `@citolab/prose-qti/qti3-item-import` with `roundtripChoice()`, `roundtripTextEntry()`, and `roundtripExtendedText()` transforms that hoist `correct-response` and `score` from `qti-response-declaration` / `qti-response-processing` onto the interaction element.

---

## Estimate

- Phase 1 (snapshot test): ~30 min
- Phase 2 (types + helper module): ~45 min
- Phase 3 (compose pipeline switch): ~30 min
- Phase 4 (roundtrip-export switch): ~30 min
- Phase 5 (roundtrip-import switch): ~15 min
- Phase 6 (docs): ~15 min
- Phase 7 (verification + smoke test + revert): ~30 min

Total: ~3 hours of focused work, almost all of which is mechanical and snapshot-guarded.

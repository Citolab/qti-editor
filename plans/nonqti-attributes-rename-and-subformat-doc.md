# Plan: Rename `editorOnlyAttributes` → `nonQtiAttributes`, complete the audit, document the subformat

## Why

The editor stores extra authoring state on QTI interaction elements (e.g. `correct-response`, `score`, `case-sensitive`, `area-mappings`). These attributes are NOT defined by QTI 3.0. On compose/export they are stripped from the QTI element and mirrored as `data-*` attributes so the **itembody remains a single, valid-QTI source of truth** for editor-extended state.

Today the concept is named `editorOnlyAttributes`, which is misleading — it suggests the attributes are unique to the editor's *internal* model, when in fact they are deliberately part of the *itembody subformat* contract (round-tripped via `data-*`). We need to:

1. Rename the concept to `nonQtiAttributes` to reflect its real meaning.
2. Fix the per-interaction declarations: 8 of 10 interactions read `correct-response` from the source element but do not declare it as non-QTI, so it leaks into the normalized element (and the `data-*` preservation pass picks it up by separate hardcoded mapping — see Phase 0).
3. Document the **itembody-only QTI subformat** in the repo so future contributors understand the round-trip contract.

## Scope guardrails (read before starting any phase)

- This is a **rename + audit + documentation** task. Do not refactor the data-* preservation system, do not change response-processing, do not touch ProseMirror schemas, do not change UI.
- "Non-QTI attribute" = an attribute on a `qti-*-interaction` element (or sub-element) that the editor reads but is NOT defined by QTI 3.0 for that element. Standard QTI attributes (`response-identifier`, `max-choices`, `shuffle`, etc.) MUST NOT be added to `nonQtiAttributes`.
- The existing `data-*` preservation pipeline (Phase 0 facts below) is correct as-is and must keep working. Do not unify it with the metadata list in this plan — that is explicitly out of scope.

---

## Phase 0 — Facts established (do not re-discover)

The following has already been audited; treat as ground truth:

### Type definition
- `packages/interfaces/src/composer.ts:79` — `InteractionComposerMetadata.editorOnlyAttributes: readonly string[]`
- `packages/interfaces/src/composer.ts:59` — `InteractionComposeResult.editorOnlyAttributes: string[]`

### Per-interaction declarations (current state)

| Interaction | metadata.ts | current `editorOnlyAttributes` | NON-QTI attrs read in compose.ts | Missing declarations |
|---|---|---|---|---|
| choice | `packages/prosemirror/interaction-choice/src/composer/metadata.ts:36` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| extended-text | `packages/prosemirror/interaction-extended-text/src/composer/metadata.ts:17` | `['rubricScoringBlock', 'score']` | `correct-response`, `score` | **`correct-response`** |
| associate | `packages/prosemirror/interaction-associate/src/composer/metadata.ts:35` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| hottext | `packages/prosemirror/interaction-hottext/src/composer/metadata.ts:34` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| text-entry | `packages/prosemirror/interaction-text-entry/src/composer/metadata.ts:28` | `['case-sensitive', 'score']` | `correct-response`, `case-sensitive`, `score` | **`correct-response`** |
| match | `packages/prosemirror/interaction-match/src/composer/metadata.ts:35` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| gap-match | `packages/prosemirror/interaction-gap-match/src/composer/metadata.ts:35` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| order | `packages/prosemirror/interaction-order/src/composer/metadata.ts:36` | `['score']` | `correct-response`, `score` | **`correct-response`** |
| inline-choice | `packages/prosemirror/interaction-inline-choice/src/composer/metadata.ts:35` | `['correct-response', 'score']` | `correct-response`, `score` | (none — complete) |
| select-point | `packages/prosemirror/interaction-select-point/src/composer/metadata.ts:27` | `['area-mappings', 'correct-response', 'score']` | `correct-response`, `score`, `area-mappings` | (none — complete) |

Note on `rubricScoringBlock` (extended-text): this is NOT a DOM attribute — it's a metadata key used internally for a rubric block. Keep it in the list as-is; the rename is purely a label change.

### Per-interaction compose.ts (where the variable is named & used)

All 10 compose files follow the same pattern. The variable is local (`const editorOnlyAttributes = [...metadata.editorOnlyAttributes]`) and is returned in the result. Lines per file:

- choice: `packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/qti-choice-interaction.compose.ts` lines 30, 31, 66
- extended-text: `packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.compose.ts` lines 56, 57, 100
- associate: `packages/prosemirror/interaction-associate/src/components/qti-associate-interaction/qti-associate-interaction.compose.ts` lines 30, 31, 63
- hottext: `packages/prosemirror/interaction-hottext/src/components/qti-hottext-interaction/qti-hottext-interaction.compose.ts` lines 34, 35, 69
- text-entry: `packages/prosemirror/interaction-text-entry/src/components/qti-text-entry-interaction/qti-text-entry-interaction.compose.ts` lines 31, 32, 68
- match: `packages/prosemirror/interaction-match/src/components/qti-match-interaction/qti-match-interaction.compose.ts` lines 30, 31, 63
- gap-match: `packages/prosemirror/interaction-gap-match/src/components/qti-gap-match-interaction/qti-gap-match-interaction.compose.ts` lines 30, 31, 63
- order: `packages/prosemirror/interaction-order/src/components/qti-order-interaction/qti-order-interaction.compose.ts` lines 23, 24, 49
- inline-choice: `packages/prosemirror/interaction-inline-choice/src/components/qti-inline-choice-interaction/qti-inline-choice-interaction.compose.ts` lines 23, 24, 49
- select-point: `packages/prosemirror/interaction-select-point/src/components/qti-select-point-interaction/qti-select-point-interaction.compose.ts` lines 119, 121, 179

Additional consumer:
- `packages/prosemirror/qti-item-divider/src/descriptor.ts:45` — declares `editorOnlyAttributes: []`

### Downstream consumers of the **result** field `editorOnlyAttributes`

- `packages/qti/core/src/composer/index.ts` calls compose handlers and reads `composeResult.normalizedElement` and `composeResult.editorOnlyAttributes` (around lines 538-539).
- The actual `data-*` mirroring is driven by **separate hardcoded tables** in:
  - `packages/qti/core/src/composer/index.ts:56-69` (`EDITOR_DATA_ATTRIBUTE_MAPPINGS`, `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS`, `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS`)
  - `packages/qti/roundtrip-export/src/index.ts:35-48` (same shape, parallel copy)
  - `packages/qti/roundtrip-import/src/index.ts:36-41` (inverse `data-*` → editor attr)

These hardcoded tables are the **source of truth for the round-trip** today. The metadata list is the source of truth for what gets stripped during compose. They MUST remain in sync; today they happen to agree (mostly — see fix in Phase 2).

### Existing documentation
- `packages/qti/roundtrip-export/ROUNDTRIP.md` — canonical doc for the `data-*` mapping table.
- `packages/qti/roundtrip-import/ROUNDTRIP.md` — links to export package's ROUNDTRIP.md.
- `docs/architecture.md` — high-level architecture; touches composer types.
- No doc currently names the "itembody-only QTI subformat" or explains the contract holistically.

---

## Phase 1 — Rename the type field across the codebase

### What to do

Mechanical rename. `editorOnlyAttributes` → `nonQtiAttributes` everywhere it appears as a property name, variable name, or string literal that refers to this concept.

### Files to edit (exhaustive — derived from Phase 0)

1. `packages/interfaces/src/composer.ts` — rename the field in both `InteractionComposerMetadata` (line 79) and `InteractionComposeResult` (line 59).
2. All 10 interaction `metadata.ts` files listed in the Phase 0 table — rename the property in the `satisfies InteractionComposerMetadata` object literal.
3. `packages/prosemirror/qti-item-divider/src/descriptor.ts:45` — rename the property.
4. All 10 interaction `.compose.ts` files listed in Phase 0 — rename:
   - the local `const editorOnlyAttributes = [...metadata.editorOnlyAttributes]` → `const nonQtiAttributes = [...metadata.nonQtiAttributes]`
   - the `.forEach(attr => normalizedElement.removeAttribute(attr))` callsite (just the variable name)
   - the returned field in the result object
5. `packages/qti/core/src/composer/index.ts` — wherever `composeResult.editorOnlyAttributes` is read (around line 538-539, also any logging/destructuring). Use grep, do not assume only one site.
6. Any other read site found by `rg -n 'editorOnlyAttributes' --type ts`.

### How to execute

Use a single repo-wide grep first to enumerate every occurrence, then do file-by-file edits. Do NOT use blind sed across the whole repo (risk of touching unrelated strings).

```bash
rg -n 'editorOnlyAttributes' --type ts --type tsx
```

The reference to `EDITOR_DATA_ATTRIBUTE_MAPPINGS` (uppercase const in core/composer/index.ts and roundtrip-export/src/index.ts) is a SEPARATE concept and MUST NOT be renamed in this phase.

### Verification

```bash
# Must return zero hits
rg -n 'editorOnlyAttributes' --type ts --type tsx

# These should all still work
pnpm -w typecheck
pnpm -w test
```

### Anti-patterns
- Do NOT rename `EDITOR_DATA_ATTRIBUTE_MAPPINGS` / `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS` / `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS` — those are a separate hardcoded mapping system.
- Do NOT touch the ROUNDTRIP.md mapping table content in this phase (that comes in Phase 3).
- Do NOT introduce backwards-compat aliasing (no `editorOnlyAttributes?: never` shims). It's a hard rename.

---

## Phase 2 — Complete the per-interaction declarations

### What to do

For each of the 8 interactions missing `correct-response` from `nonQtiAttributes`, add it. After Phase 1, the field is named `nonQtiAttributes`, so these edits apply against the renamed field.

### Files to edit (exact targets)

Add `'correct-response'` to the `nonQtiAttributes` array in each of:

1. `packages/prosemirror/interaction-choice/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`
2. `packages/prosemirror/interaction-extended-text/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'rubricScoringBlock', 'score']`
3. `packages/prosemirror/interaction-associate/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`
4. `packages/prosemirror/interaction-hottext/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`
5. `packages/prosemirror/interaction-text-entry/src/composer/metadata.ts` — `nonQtiAttributes: ['case-sensitive', 'correct-response', 'score']`
6. `packages/prosemirror/interaction-match/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`
7. `packages/prosemirror/interaction-gap-match/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`
8. `packages/prosemirror/interaction-order/src/composer/metadata.ts` — `nonQtiAttributes: ['correct-response', 'score']`

Keep arrays alphabetically sorted for readability.

`inline-choice` and `select-point` already have `correct-response` declared — leave them alone.

### Why this matters

Right now, `correct-response` leaks onto the normalized element because the compose handler never calls `removeAttribute('correct-response')` for these 8. It does NOT corrupt the final XML in practice because the downstream `preserveEditorDataAttributes()` writes the `data-correct-response` mirror BEFORE the leaked attribute is serialized — but the leak still produces a non-conformant intermediate element (a `qti-*-interaction` with both `correct-response="..."` AND `data-correct-response="..."` attached). Removing it via the existing strip loop in compose.ts keeps the normalized element clean.

### Verification

```bash
# All 10 should list 'correct-response'
rg -n "nonQtiAttributes" packages/prosemirror/interaction-*/src/composer/metadata.ts

# Add or extend a composer test that:
#  - feeds a <qti-choice-interaction correct-response="A" score="1">...
#  - asserts normalizedElement.hasAttribute('correct-response') === false
#  - asserts normalizedElement.hasAttribute('score') === false
# Put it in packages/qti/core/src/interactions/composer.test.ts or a new test
# in each interaction package — match whatever convention already exists.

pnpm -w test
```

Also run the existing roundtrip-export test (`packages/qti/roundtrip-export/src/index.test.ts:89-93`) to confirm the `data-correct-response` / `data-score` outputs are unchanged.

### Anti-patterns
- Do NOT add attributes that ARE standard QTI to the list (e.g. `response-identifier`, `max-choices`, `shuffle`). Cross-check against the per-interaction "STANDARD-QTI" lists in Phase 0.
- Do NOT add `area-mappings` or `case-sensitive` to interactions that don't use them (those are specific to select-point and text-entry respectively).
- Do NOT modify the hardcoded `EDITOR_DATA_ATTRIBUTE_MAPPINGS` tables in this phase.

---

## Phase 3 — Document the itembody-only QTI subformat

### What to do

Create a new doc that explains the subformat as a whole, and cross-link it from existing docs.

### Files to create / edit

1. **New file:** `docs/itembody-subformat.md` — the canonical subformat spec. Use the template below.
2. **Edit:** `packages/qti/roundtrip-export/ROUNDTRIP.md` — add a one-line link at the top pointing to `docs/itembody-subformat.md` as the higher-level explainer. Keep the existing mapping table; this doc is the implementation-level reference for the round-trip table.
3. **Edit:** `docs/architecture.md` — add one short paragraph in the relevant section linking to `docs/itembody-subformat.md`.
4. **Edit:** `README.md` — add a single-line bullet in the existing docs/links section pointing to the new file. Do not add a marketing section.

### Template for `docs/itembody-subformat.md`

Use this outline (copy structure, fill content from facts above — do not invent APIs):

```markdown
# Itembody-only QTI subformat

QTI-Editor stores authoring state in the QTI itembody itself, so the itembody
is the **single source of truth** for an item — including state that QTI 3.0
does not define an attribute for (e.g. an authoring `correct-response`,
per-interaction `score`, per-choice scoring).

This document explains the subformat: what extra attributes the editor reads,
how they are kept valid-QTI on export, and how to declare a new one.

## The contract

1. While editing, the QTI element may carry **non-QTI attributes** (e.g.
   `correct-response`, `score`, `case-sensitive`, `area-mappings`).
2. On compose / export, each non-QTI attribute is **stripped** from the QTI
   element and **mirrored** as a `data-*` attribute on the same element
   (e.g. `correct-response` → `data-correct-response`).
3. The exported XML is therefore **valid QTI 3.0**: every non-standard piece
   of authoring state lives behind the `data-*` prefix, which QTI permits
   on any element.
4. On re-import, the `data-*` attributes are converted back to their
   editor-facing names, restoring the authoring state losslessly.

## Where non-QTI attributes are declared

Each interaction declares its non-QTI attributes in its composer metadata:

`packages/prosemirror/interaction-<name>/src/composer/metadata.ts`

```ts
export const choiceInteractionComposerMetadata = {
  // ...
  nonQtiAttributes: ['correct-response', 'score'],
  // ...
} satisfies InteractionComposerMetadata;
```

The compose handler reads these from the source element to populate the
response declaration, then removes them from the normalized element so the
output is clean QTI.

## Current non-QTI attribute set

| Attribute | Interactions | data-* mirror |
|---|---|---|
| `correct-response` | choice, extended-text, associate, hottext, text-entry, match, gap-match, order, inline-choice, select-point | `data-correct-response` |
| `score` | all interactions above | `data-score` |
| `case-sensitive` | text-entry | `data-case-sensitive` |
| `area-mappings` | select-point | `data-area-mappings` |

The hardcoded `data-*` mapping tables live in
`packages/qti/core/src/composer/index.ts` and
`packages/qti/roundtrip-export/src/index.ts`. The detailed per-tag table is
in [packages/qti/roundtrip-export/ROUNDTRIP.md](../packages/qti/roundtrip-export/ROUNDTRIP.md).

## Adding a new non-QTI attribute

To extend the subformat with a new attribute on an interaction:

1. Add the attribute name to `nonQtiAttributes` in that interaction's
   `composer/metadata.ts`.
2. Read it in the interaction's `.compose.ts` from the source element and
   propagate it to whatever needs it (response declaration, UI state, etc.).
3. Add the editor → `data-*` mapping to `EDITOR_DATA_ATTRIBUTE_MAPPINGS`
   (or the interaction-specific mapping table) in
   `packages/qti/core/src/composer/index.ts` AND
   `packages/qti/roundtrip-export/src/index.ts`.
4. Add the inverse mapping to `DATA_ATTRIBUTE_MAPPINGS` in
   `packages/qti/roundtrip-import/src/index.ts`.
5. Document the new row in the table above and in
   `packages/qti/roundtrip-export/ROUNDTRIP.md`.

(The metadata list and the hardcoded mapping tables are intentionally
separate today; if/when they are unified, this guide should be updated.)
```

### Verification

- The new doc renders correctly in any markdown viewer.
- All links in the new doc resolve (relative paths to `packages/qti/roundtrip-export/ROUNDTRIP.md`).
- `ROUNDTRIP.md` table is unchanged content-wise; only a header link is added.
- `docs/architecture.md` mentions the subformat in one sentence with a link.

### Anti-patterns
- Do NOT invent a unification API in the doc (e.g. "the `data-*` mapping is derived from `nonQtiAttributes`") — it is not, today. Document the current state.
- Do NOT promise things this plan doesn't deliver (no migration tooling, no validator).
- Do NOT inline the full ROUNDTRIP.md table — link to it. One source of truth.

---

## Phase 4 — Final verification

### Checks

1. **No stale references:**
   ```bash
   rg -n 'editorOnlyAttributes' --type ts --type tsx --type md
   ```
   Must return zero hits (the only acceptable hit is inside the new `docs/itembody-subformat.md` if it mentions the *old* name in a "Renamed from" parenthetical — author's choice; recommend omitting).

2. **All 10 interactions declare `correct-response`:**
   ```bash
   rg -n "nonQtiAttributes" packages/prosemirror/interaction-*/src/composer/metadata.ts
   ```
   Every line should include `'correct-response'`.

3. **Type checks pass:** `pnpm -w typecheck`

4. **Tests pass:** `pnpm -w test`
   - Round-trip export test still produces `data-correct-response` and `data-score`.
   - Any new strip test added in Phase 2 passes.

5. **Manual round-trip sanity check** (optional but recommended): import a fixture XML with `correct-response="A"` on a `qti-choice-interaction`, re-export, and confirm:
   - Exported element has `data-correct-response="A"` and NOT `correct-response="A"`.
   - Re-importing the exported XML restores `correct-response="A"` on the in-memory model.

6. **Documentation cross-links resolve:**
   - `docs/itembody-subformat.md` → `packages/qti/roundtrip-export/ROUNDTRIP.md` ✓
   - `README.md` → `docs/itembody-subformat.md` ✓
   - `docs/architecture.md` → `docs/itembody-subformat.md` ✓

### Done when

- Grep for the old name returns nothing.
- All 10 interactions list `correct-response` (and any other non-QTI attrs they read).
- The new subformat doc exists and is linked from `README.md`, `docs/architecture.md`, and the roundtrip ROUNDTRIP.md.
- `pnpm -w typecheck` and `pnpm -w test` are green.

---

## Out of scope (explicitly deferred)

- **Unifying the metadata `nonQtiAttributes` list with the hardcoded `EDITOR_DATA_ATTRIBUTE_MAPPINGS`** so each interaction declares its own `data-*` mirrors. This is a sensible follow-up — file a separate plan if you want it. It would let `preserveEditorDataAttributes()` derive its work from per-interaction metadata instead of three hardcoded tables.
- Validating that an exported item actually conforms to the QTI 3.0 XSD (separate concern).
- Adding a per-choice non-QTI attribute audit (e.g. on `qti-simple-choice`). The Phase 0 audit found no per-choice non-QTI attributes read in the current compose pipeline; child-element attributes (`identifier`, `match-max`, `match-min`, `fixed`) are all standard QTI.
- Any UI changes (attribute panels, friendly editors).

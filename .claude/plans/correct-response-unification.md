# Plan: Unify `correct-response` Type Across Interactions

## Goal

Make every QTI editor interaction store its correct response as `string | string[]` (matching qti-components), and emit a single `data-correct-response` data attribute on export — removing the text-entry-specific plural `correctResponses` / `data-correct-responses` channel.

Editor naming stays `data-correct-response` (different from qti-components' `correct-response`); only the **type** and **serialization format** are unified.

---

## Phase 0: Documentation & Current State Reference

Bake the following facts into all subsequent phases. **Do not infer beyond these.**

### qti-components reference (the target shape)

File: [QTI-Components/packages/qti-base/src/abstract/interaction.ts:56-72, 130, 146-156](/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-base/src/abstract/interaction.ts)

- **Type**: `_correctResponse: string | string[] | null`
- **Attribute setter** (line 57-65): comma-split + trim
  ```ts
  set correctResponseAttr(val: string | null) {
    if (val === null) this._correctResponse = null;
    else if (val.includes(',')) this._correctResponse = val.split(',').map(v => v.trim());
    else this._correctResponse = val;
  }
  ```
- **Attribute getter** (line 67-72): array → `arr.join(',')`, string passthrough
- **Programmatic setter** (line 146-156): writes attribute via `Array.isArray(val) ? val.join(',') : val`
- **Markup examples**:
  - Single: `correct-response="A"`
  - Multiple: `correct-response="A,E"`
  - Order/match pairs: `correct-response="item1 droplist0,item2 droplist1"` (space within pair, comma between pairs)

### Escaping caveat (acknowledged limitation)

qti-components has **no escape mechanism for commas inside answer values**. An answer literally containing a comma (e.g. `"smith, john"`) cannot be round-tripped — it would split into `["smith", "john"]`. The current qti-editor text-entry uses JSON to avoid this. **Accepting this regression for consistency** is the tradeoff. Document it in code comments at the parser site.

### Current qti-editor state (what we are changing)

| Concern | Current | Target |
|---|---|---|
| Schema `correctResponse` type | `string \| null` (default `null`) on all interactions | `string \| string[] \| null` |
| text-entry has `correctResponses` plural | Yes (separate attr in schema) | **Remove** — fold into `correctResponse` array |
| text-entry friendly editor | binds to `correctResponses` | bind to `correctResponse` |
| Export mapping `data-correct-responses` | Set on text-entry from `correct-responses` source | **Remove** — use `data-correct-response` like everyone else |
| Export mapping `data-correct-response` | Excluded for text-entry | **Include for all** |
| Test expectation `data-correct-responses="[&quot;alpha&quot;,&quot;beta&quot;]"` | Present | Replace with `data-correct-response="alpha,beta"` |

### Files in scope

**Schemas (10):** `packages/prosemirror/interaction-{associate,choice,extended-text,gap-match,hottext,inline-choice,match,order,select-point,text-entry}/src/components/qti-*-interaction/qti-*-interaction.schema.ts`

**Compose functions (10):** same dirs, `*.compose.ts`

**Text-entry helpers:** `packages/prosemirror/interaction-text-entry/src/attributes/text-entry-attributes-editor.ts`

**Export pipelines:**
- `packages/qti/core/src/composer/index.ts` (lines 52-110)
- `packages/qti/package-export/src/index.ts` (lines 14-30, 256-260)

**Tests:** `packages/qti/package-export/src/index.test.ts` (lines 67-95), text-entry attribute editor tests

**Metadata:** `packages/prosemirror/interaction-text-entry/src/composer/metadata.ts` (drop `correct-responses` from `editorOnlyAttributes`, drop `correctResponses` from `userEditableAttributes` and `hiddenAttributes`)

---

## Phase 1: Add Shared `correct-response` Codec

Create one helper module that both schema parseDOM and compose functions reuse.

**Where:** New file `packages/prosemirror/interaction-shared/src/correct-response/codec.ts`

**API to expose** (copy this signature exactly):

```ts
export type CorrectResponseValue = string | string[] | null;

/** Parse the `correct-response` attribute string into editor representation.
 *  Mirrors qti-components: comma-split + trim; single value when no comma.
 *  Returns null for null/empty input. */
export function parseCorrectResponseAttribute(raw: string | null | undefined): CorrectResponseValue;

/** Serialize editor value back into the attribute string.
 *  string → as-is; string[] → comma-joined; null → null (caller decides whether to set/remove). */
export function serializeCorrectResponseAttribute(value: CorrectResponseValue): string | null;
```

**Implementation notes:**
- Trim each token in arrays; drop empty tokens.
- Add a one-line code comment at the parse site documenting the comma-escape limitation (no support for commas inside answer values — matches qti-components).
- Export from `packages/prosemirror/interaction-shared/src/index.ts`.

**Verification checklist:**
- [ ] Unit tests: `null` → `null`; `""` → `null`; `"A"` → `"A"`; `"A,B"` → `["A","B"]`; `"  a , b  "` → `["a","b"]`; round-trip for both shapes.
- [ ] No imports of this codec from text-entry yet (Phase 2 wires it in).

**Anti-pattern guards:**
- Do NOT use JSON.parse here. qti-components uses comma-split, period.
- Do NOT add an `escape` parameter or special-character handling.

---

## Phase 2: Update All Interaction Schemas to `string | string[] | null`

For every non-text-entry interaction schema, the change is type-only — the default stays `null`. ProseMirror NodeSpec attrs are loosely typed, so the practical work is:

1. Update `parseDOM.getAttrs` to call `parseCorrectResponseAttribute(node.getAttribute('correct-response'))` instead of returning the raw string.
2. Update `toDOM` to call `serializeCorrectResponseAttribute(node.attrs.correctResponse)` and only set the attribute if non-null.

**Files to edit (9 schemas, excluding text-entry):**
- `interaction-associate/.../qti-associate-interaction.schema.ts`
- `interaction-choice/.../qti-choice-interaction.schema.ts`
- `interaction-extended-text/.../qti-extended-text-interaction.schema.ts`
- `interaction-gap-match/.../qti-gap-match-interaction.schema.ts`
- `interaction-hottext/.../qti-hottext-interaction.schema.ts`
- `interaction-inline-choice/.../qti-inline-choice-interaction.schema.ts`
- `interaction-match/.../qti-match-interaction.schema.ts`
- `interaction-order/.../qti-order-interaction.schema.ts`
- `interaction-select-point/.../qti-select-point-interaction.schema.ts`

**Pattern to apply** (copy verbatim, adapt tag name):
```ts
// in getAttrs:
correctResponse: parseCorrectResponseAttribute(node.getAttribute('correct-response')),

// in toDOM, instead of unconditionally writing the string:
const cr = serializeCorrectResponseAttribute(node.attrs.correctResponse);
if (cr) attrs['correct-response'] = cr;
```

**Verification checklist:**
- [ ] All 9 schemas import from the new codec module.
- [ ] `grep -rn "correctResponse" packages/prosemirror/interaction-*/src/components/**/*.schema.ts` shows no raw `getAttribute('correct-response')` calls remaining.
- [ ] Existing schema tests still pass; if any test asserts `typeof correctResponse === 'string'`, update to allow array.

**Anti-pattern guards:**
- Do NOT introduce per-interaction parse logic. Use the shared codec.
- Do NOT change cardinality semantics in compose functions yet — Phase 3.

---

## Phase 3: Update Compose Functions to Handle `string | string[]`

Each `*.compose.ts` currently treats `correctResponse` as a single string when building the `responseDeclaration`. They must accept either shape and pick the right cardinality.

**Files to edit (9 compose functions, excluding text-entry):**

For each compose function:
1. Read the attribute via `parseCorrectResponseAttribute(sourceElement.getAttribute('correct-response'))`.
2. Determine cardinality:
   - `string` → `cardinality: 'single'`, `correctResponse: <string>`
   - `string[]` → keep the existing cardinality declared by that interaction (multiple/ordered), pass the array through.
3. The response declaration's `correctResponse` field (in `InteractionResponseDeclaration`) needs to accept `string | string[]`. **Verify** the type allows this — if not, widen it in `packages/interfaces/src/composer.ts`. Cite any change there in the phase log.

**Verification checklist:**
- [ ] `tsc` passes for all interaction packages.
- [ ] Round-trip test: a choice item with `correct-response="A,B"` exports a response declaration with `correctResponse: ["A","B"]`.

**Anti-pattern guards:**
- Do NOT split commas manually inside compose; use the codec.
- Do NOT silently coerce arrays to strings — preserve shape.

---

## Phase 4: Refactor text-entry to Use Single `correct-response` Attribute

This is the largest change. Drop the dual-channel scheme.

### 4a. Schema changes

File: `interaction-text-entry/.../qti-text-entry-interaction.schema.ts`

- Remove `correctResponses: { default: [] }` from `attrs`.
- Keep only `correctResponse: { default: null }` (now typed `string | string[] | null` via the codec).
- In `getAttrs`: read **only** `correct-response` via the shared codec. Drop the `correct-responses` legacy fallback path entirely (we're owning this format now).
- In `toDOM`: emit a single `correct-response` attribute via `serializeCorrectResponseAttribute`. Drop the dual-write block (lines 75-82).

### 4b. Friendly editor

File: `interaction-text-entry/src/attributes/text-entry-attributes-editor.ts`

- Change `textEntryAttributesFriendlyEditor.attribute` from `'correctResponses'` to `'correctResponse'`.
- Replace `parseTextEntryCorrectResponses` / `serializeTextEntryCorrectResponsesAttribute` / `getPrimaryTextEntryCorrectResponse` / `parseTextEntryLegacyCorrectResponse` / `normalizeTextEntryCorrectResponses` with a thin wrapper around the shared codec, or delete and import the codec directly. The friendly editor UI must work against `string | string[]`.
- Update the editor UI (wherever it adds/removes synonym rows) to read/write the array form directly.

### 4c. Compose function

File: `interaction-text-entry/.../qti-text-entry-interaction.compose.ts`

- Drop `parseTextEntryLegacyCorrectResponse` and `parseTextEntryCorrectResponses` calls (currently lines 24-29).
- Read `correct-response` once via the codec. Treat array as the list of synonyms; treat string as a single answer (same semantics as a one-element array for response processing).
- Build `stringMapping` entries from the normalized array (or a single-element array when scalar). Cardinality remains `single` per QTI spec for text-entry — the **stringMapping** is what carries the synonym set, not cardinality.

### 4d. Metadata

File: `interaction-text-entry/src/composer/metadata.ts`

- `editorOnlyAttributes`: drop `'correct-responses'`. Add `'correct-response'` if not implicitly stripped (verify; today it isn't listed because the export mapping handled it).
- `userEditableAttributes`: drop `'correctResponses'`. (`'correctResponse'` was already removed.)
- `hiddenAttributes`: drop `'correctResponses'`.

### 4e. Tests

Files: `text-entry-attributes-editor.test.ts`, any compose snapshot.
- Update fixtures from JSON-array `correct-responses="[&quot;alpha&quot;,&quot;beta&quot;]"` form to comma-separated `correct-response="alpha,beta"`.
- Add an explicit test asserting **single value** parsing (`correct-response="alpha"` → `correctResponse: "alpha"`) and **array** parsing.

**Verification checklist:**
- [ ] `grep -rn "correctResponses\|correct-responses\|correct_responses" packages/prosemirror/interaction-text-entry packages/qti` returns zero hits.
- [ ] `grep -rn "parseTextEntryLegacyCorrectResponse\|getPrimaryTextEntryCorrectResponse\|serializeTextEntryCorrectResponsesAttribute" packages/` returns zero hits.
- [ ] Friendly editor UI still allows adding/removing answer synonyms.

**Anti-pattern guards:**
- Do NOT keep the legacy fallback path "for safety." We just rewrote storage; nothing emits `correct-responses` anymore.
- Do NOT keep `correctResponses` as a hidden alias.

---

## Phase 5: Update Export Pipeline

Two files have the same logic; keep them in sync.

### 5a. `packages/qti/package-export/src/index.ts`

Lines 14-30:
```ts
const TEXT_ENTRY_INTERACTION_TAG = 'qti-text-entry-interaction';
const SELECT_POINT_INTERACTION_TAG = 'qti-select-point-interaction';
const EDITOR_DATA_ATTRIBUTE_MAPPINGS = [
  { source: 'correct-response', target: 'data-correct-response' },
  { source: 'correctResponse',  target: 'data-correct-response' },
  { source: 'correctAnswer',    target: 'data-correct-response' },
  { source: 'score',            target: 'data-score' },
] as const;
const TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS = [
  { source: 'case-sensitive', target: 'data-case-sensitive' },  // keep
  // REMOVED: correct-responses → data-correct-responses
] as const;
const SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS = [
  { source: 'area-mappings', target: 'data-area-mappings' },
] as const;
```

Lines 256-260: **remove the text-entry filter** that excluded `data-correct-response`. Text-entry now uses the same general mapping as everyone else.

```ts
const mappings = [
  ...EDITOR_DATA_ATTRIBUTE_MAPPINGS,
  ...(tagName === TEXT_ENTRY_INTERACTION_TAG ? TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS : []),
  ...(tagName === SELECT_POINT_INTERACTION_TAG ? SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS : []),
];
```

### 5b. `packages/qti/core/src/composer/index.ts`

Apply the equivalent edits:
- Drop `correct-responses` from `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS`.
- Remove the early-return guard in `preserveEditorDataAttributes` that skips `data-correct-response` for text-entry (the line `if (tagName === TEXT_ENTRY_INTERACTION_TAG && target === 'data-correct-response') return;`).

### 5c. Test expectations

File: `packages/qti/package-export/src/index.test.ts` lines 90-94.

Update from:
```ts
expect(item).toContain('data-correct-responses="[&quot;alpha&quot;,&quot;beta&quot;]"');
```
to:
```ts
expect(item).toContain('data-correct-response="alpha,beta"');
```

Also update the test's input markup (line 80): change `correct-responses="[&quot;alpha&quot;,&quot;beta&quot;]"` to `correct-response="alpha,beta"`.

**Verification checklist:**
- [ ] `grep -rn "correct-responses\|data-correct-responses" packages/qti` returns zero hits.
- [ ] `pnpm vitest run --project unit packages/qti/package-export` passes.

---

## Phase 6: Verification

Run in order — stop and fix on any failure:

1. **Type check**: `pnpm -r typecheck` (or `pnpm tsc --noEmit` per package).
2. **Codec unit tests** (Phase 1): `pnpm vitest run packages/prosemirror/interaction-shared`.
3. **Text-entry tests**: `pnpm vitest run packages/prosemirror/interaction-text-entry`.
4. **Package-export tests**: `pnpm vitest run --project unit packages/qti/package-export`.
5. **Full build**: `pnpm --filter @qti-editor/qti-package-export build && pnpm --filter @qti-editor/app build`.
6. **Lint**: `pnpm lint:check`.

### Grep sweeps (must all return zero)

```bash
grep -rn "correct-responses" packages/qti packages/prosemirror
grep -rn "correctResponses" packages/prosemirror/interaction-text-entry packages/qti
grep -rn "data-correct-responses" packages
grep -rn "parseTextEntryLegacyCorrectResponse" packages
grep -rn "getPrimaryTextEntryCorrectResponse" packages
```

### Manual smoke test (UI)

1. Start dev server.
2. Insert a text-entry interaction; add three synonym answers via the friendly editor.
3. Reload the document. Confirm all three synonyms still present.
4. Export the package; open the item XML. Confirm exactly one attribute: `data-correct-response="ans1,ans2,ans3"`. Confirm `data-correct-responses` is absent.
5. Insert a choice interaction with multiple correct answers (`A,B`). Export and confirm `data-correct-response="A,B"`.

---

## Rollback Plan

All changes are isolated to the editor packages. If any consumer breaks:
- Revert by branch.
- The exported QTI XML produced by previous versions used `data-qti-editor-*` (gone) and `data-correct-responses` (gone in this plan). No external systems should depend on those because they were editor-internal preservation attrs.

## Out of Scope (explicitly)

- Renaming editor data attribute from `data-correct-response` to `correct-response` (user said this is fine to keep different from qti-components).
- Implementing import/round-trip from `data-correct-response` back into the editor (separate feature; the original export plan said "Do not implement import yet").
- Adding comma-escape support — accepted limitation; document at the codec.

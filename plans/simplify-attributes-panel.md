# Simplify the attributes panel: drop `fields`, drive everything from `editableAttributes` + value type

## Goal

Today there are **two attribute panels** in the editor, with diverging configuration models:

| Panel | Path | How it decides what to show & how |
|---|---|---|
| ProseMirror (minimal) | [apps/qti-prosemirror-item/src/attributes-panel-plugin.ts](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts) | `editableAttrs` allowlist + value-type sniff (`typeof === 'boolean' \| 'number'`) → checkbox / number / text |
| ProseKit (rich) | [packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts) | `NodeAttributePanelMetadata.fields` per-attribute config: `label`, `input: 'text' \| 'number' \| 'checkbox' \| 'select'`, `options`, `readOnly` — falls back to value-type when `fields` is absent |

The `fields` indirection is mostly busywork: 90% of entries are `{ label: 'Score', input: 'number' }` — which the panel can derive from `typeof value === 'number'` alone. The remaining cases (`readOnly`, custom labels, `select` options) either duplicate `editableAttributes` (readOnly = "not in the allowlist") or belong in a more deliberate place (the rubric-block enum should live next to its node spec, not in a panel config).

**Target**: collapse to **one model** that both panels share — `editableAttributes` decides what's editable, the value's `typeof` decides the input control. Everything outside the allowlist renders disabled. The `fields` map is removed from the interface and from every metadata.ts.

This is the prosemirror panel's model. The prosekit panel becomes a strict superset (friendly editors still replace generic fields), but loses its per-field config.

---

## Phase 0 — Inventory of existing `fields` usage

(Done — recorded here so phases 1–3 don't have to re-grep.)

12 files reference `fields:`. Categorised by *what `fields` was actually adding* beyond value-type defaults:

### A. Pure label / input duplication (delete with no behavioral change)
- [associate/composer/metadata.ts:42-47](packages/prose-qti/src/components/associate/composer/metadata.ts#L42-L47) — labels + `number` inputs
- [choice/composer/metadata.ts:45](packages/prose-qti/src/components/choice/composer/metadata.ts#L45) — `score: number`, `shuffle: checkbox`
- [choice/composer/metadata.ts:52](packages/prose-qti/src/components/choice/composer/metadata.ts#L52) — `fixed: checkbox`
- [extended-text/composer/metadata.ts:25-31](packages/prose-qti/src/components/extended-text/composer/metadata.ts#L25-L31) — labels + `number`/`text`
- [gap-match/composer/metadata.ts:42](packages/prose-qti/src/components/gap-match/composer/metadata.ts#L42), [hottext/composer/metadata.ts:41](packages/prose-qti/src/components/hottext/composer/metadata.ts#L41), [order/composer/metadata.ts:43](packages/prose-qti/src/components/order/composer/metadata.ts#L43), [text-entry/composer/metadata.ts:36](packages/prose-qti/src/components/text-entry/composer/metadata.ts#L36) — `score: number`
- [inline-choice/composer/metadata.ts:42-45](packages/prose-qti/src/components/inline-choice/composer/metadata.ts#L42-L45) — labels
- [match/composer/metadata.ts:47-50,55-59](packages/prose-qti/src/components/match/composer/metadata.ts#L47-L50) — labels + `number`/`text`

### B. `readOnly: true` flags
The deprecated mechanism for making a single attribute non-editable inside an otherwise-allowlisted node:
- [associate/composer/metadata.ts](packages/prose-qti/src/components/associate/composer/metadata.ts) — `minAssociations`, `score`, `correctResponse`
- [match/composer/metadata.ts](packages/prose-qti/src/components/match/composer/metadata.ts) — `correctResponse` (both drag-drop and tabular)
- [select-point/composer/metadata.ts:34-38](packages/prose-qti/src/components/select-point/composer/metadata.ts#L34-L38) — every field
- [choice/composer/metadata.ts:52](packages/prose-qti/src/components/choice/composer/metadata.ts#L52) — `identifier: { readOnly: true }`

**Migration rule for B**: remove the attribute from `editableAttributes`. The panel's "outside-allowlist → disabled" rule covers it.

### C. Non-trivial — `select` with options
- [rubric-block/descriptor.ts:41-58](packages/prose-qti/src/components/rubric-block/descriptor.ts#L41-L58) — `use` and `view` use `input: 'select'` with `options` from QTI enum constants

**Migration for C**: keep the enum semantics, but move them into a *friendly editor* (the prosekit panel already supports `friendlyEditors: [{ kind: 'rubric-block-enum-editor', … }]`). The prosemirror panel doesn't have a select control today; it will render rubric-block `use`/`view` as plain text (acceptable — the prosemirror-item app isn't authoring rubric blocks).

### D. Custom labels that aren't just attribute name
Examples: `'Pattern mask (regex)'`, `'First column header'`, `'Max associations'`. The plain attribute name (`patternMask`, `dataFirstColumnHeader`, `maxAssociations`) is unambiguous enough — accept the regression.

---

## Phase 1 — Interface change: drop `fields` from `NodeAttributePanelMetadata`

**What to implement** — Edit [packages/prose-qti/src/interfaces/attributes.ts](packages/prose-qti/src/interfaces/attributes.ts) and remove the `fields?` property + the `AttributeFieldDefinition` and `AttributeFieldOption` interfaces (unless still re-exported elsewhere — grep first). Resulting interface should be:

```ts
export interface NodeAttributePanelMetadata {
  nodeTypeName: string;
  /** Attributes the user may edit. Every other attribute is shown disabled. */
  editableAttributes?: readonly string[];
  /** Custom editor components to render in place of the generic field list. */
  friendlyEditors?: readonly AttributeFriendlyEditorDefinition[];
}
```

Also update `interfaces/attributes.d.ts` if separate (the `.ts` and `.d.ts` are both checked in).

**Verification**
- `grep -rn "AttributeFieldDefinition\|AttributeFieldOption" packages/prose-qti/src packages/prose-qti-ui/src` returns no hits.
- `tsc --noEmit` in both `packages/prose-qti` and `packages/prose-qti-ui` errors point only at the metadata files about to be edited in Phase 2.

**Anti-pattern guard** — Do NOT preserve `fields` as deprecated. The point of this refactor is to remove the seam entirely.

---

## Phase 2 — Strip `fields:` from every metadata.ts

**What to implement** — In each file listed under Phase 0 §A and §B:
1. Delete the `fields: { … }` block entirely.
2. If any attribute had `readOnly: true`, remove it from `editableAttributes` instead.
3. For [select-point/composer/metadata.ts](packages/prose-qti/src/components/select-point/composer/metadata.ts) — every field was `readOnly`; the result is `editableAttributes: []` (already correct, just delete `fields`).
4. For [choice/composer/metadata.ts:52](packages/prose-qti/src/components/choice/composer/metadata.ts#L52) (simple-choice) — `identifier` was readOnly; it's not in `editableAttributes: ['fixed']` either, so deletion is a no-op.

For Phase 0 §C ([rubric-block/descriptor.ts](packages/prose-qti/src/components/rubric-block/descriptor.ts)):
1. Delete the `fields` block.
2. Create a new friendly-editor for the rubric-block enums under `packages/prose-qti-ui/src/components/rubric-block-attributes-editor/` mirroring `choice-attributes-editor` (a `<select>` per enum, dispatching `qti:attributes:patch` events). Register it via `registerFriendlyEditor('rubric-block-enums', …)`.
3. Add `friendlyEditors: [{ attribute: 'use', kind: 'rubric-block-enums' }]` (`view` is patched by the same editor) to the rubric-block metadata.

**Verification**
- `grep -rn "fields:" packages/prose-qti/src/components` returns no hits.
- `grep -rn "readOnly:" packages/prose-qti/src/components/*/composer/metadata.ts packages/prose-qti/src/components/*/descriptor.ts` returns no hits.
- Loading every kennisnet ITEM in the prosemirror-item app, clicking each interaction, confirms the attributes panel shows the same fields as before — just no custom labels, and previously `readOnly` fields now appear in the "system attributes" disabled section instead of the editable section.

**Anti-pattern guard** — Do NOT inline labels in render code. The panel uses the raw attribute key as the label.

---

## Phase 3 — Simplify the ProseKit panel to mirror the ProseMirror panel

**What to implement** — In [attributes-panel.ts](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts):

1. **Delete `defaultQtiMetadataResolver`'s field-synthesis** ([lines 34-49](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L34-L49)) — collapse to:
   ```ts
   const defaultQtiMetadataResolver: AttributesMetadataResolver = (nodeType) => {
     return getNodeAttributePanelMetadataByNodeTypeName(nodeType) ?? null;
   };
   ```

2. **Delete `getFieldMetadata`** ([line 182](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L182)) — its only callers are `renderNodeSection` lines 341 and 351. Inline value-type inference directly into `renderField`.

3. **Replace `getAttrEntriesByEditability`** ([line 201](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L201)) with a version that splits purely on the allowlist (no `fields[].readOnly` check):
   ```ts
   private getAttrEntriesByEditability(node) {
     if (!node) return { editable: [], readOnly: [] };
     const entries = Object.entries(node.attrs ?? {});
     const metadata = this.getPanelMetadata(node);
     const editableSet = metadata?.editableAttributes
       ? new Set(metadata.editableAttributes)
       : null; // null = all editable
     return {
       editable: editableSet ? entries.filter(([k]) => editableSet.has(k)) : entries,
       readOnly: editableSet ? entries.filter(([k]) => !editableSet.has(k)) : [],
     };
   }
   ```

4. **Rewrite `renderField`** ([line 236](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L236)) to take `(node, key, value, disabled)` only — no `field` argument. Infer input type:
   - `typeof value === 'boolean'` → checkbox
   - `typeof value === 'number'` → `<input type="number">`
   - otherwise → `<input type="text">`
   
   Label is just `key`. No `select` branch (moved to friendly editors). No `select`-specific `coerceValue` either.

5. **Update `coerceValue`** ([line 217](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L217)) — drop the `HTMLSelectElement` union; signature becomes `(input: HTMLInputElement, original: AttrValue)`.

**Verification**
- The match-tabular item still renders correctly (its `dataFirstColumnHeader` is a string attr → text input).
- Selecting an associate interaction: `maxAssociations` shows as number input; `correctResponse`, `score`, `minAssociations` appear under the read-only `<details>` (since we're removing them from `editableAttributes` in Phase 2).
- Friendly editors still render for `qti-choice-interaction` (the panel still consults `friendlyEditors`).

**Anti-pattern guard** — Do NOT special-case any attribute name in the panel. All decisions come from `editableAttributes` + `typeof value`. If a node needs richer editing (the rubric-block enums, choice class presentation), that's what `friendlyEditors` is for.

---

## Phase 4 — Drop the temporary `readOnlyAttrs` plumbing from the prosemirror app

**What to implement** — Undo the wiring added during the previous fields-aware migration:

1. [prosemirror-qti.ts](apps/qti-prosemirror-item/src/prosemirror-qti.ts) — delete the `readOnlyAttrs` export (the `Object.fromEntries(... metadata.fields[*].readOnly ...)` block).
2. [main.ts:58-59](apps/qti-prosemirror-item/src/main.ts#L58-L59) — drop the `readOnlyAttrs` import and the second argument to `attributesPanelPlugin`.
3. [attributes-panel-plugin.ts](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts):
   - Delete `readOnlyAttrs` from `AttributesPanelOptions`, the `AttributesPanelView` constructor, and `#buildSection` (revert to `const readOnly = editableAttrs ? !editableAttrs.has(key) : false;`).
   - The `typeof value === 'number'` number-input branch added in the previous round **stays** — it's exactly the model this refactor commits to.

**Verification**
- `grep -n "readOnlyAttrs\|readOnly" apps/qti-prosemirror-item/src/*.ts` returns no hits.
- ITEM017 (associate) still loads; `correctResponse`/`score`/`minAssociations` are now disabled (because Phase 2 removed them from the allowlist), `maxAssociations` is an editable number input.

**Anti-pattern guard** — Don't keep two readOnly mechanisms. The allowlist *is* the readOnly mechanism now.

---

## Phase 5 — Verify end-to-end across all interactions

Open each kennisnet item in the prosemirror-item app. For each, select the interaction's first attribute-bearing node (typically the interaction itself, sometimes a simple-choice inside it). Confirm:

| Check | Expectation |
|---|---|
| Boolean attrs (e.g. `shuffle`, `fixed`) | rendered as checkbox |
| Number attrs (e.g. `score`, `maxAssociations`, `expectedLines`) | rendered as `<input type="number">` |
| String attrs (e.g. `class`, `dataFirstColumnHeader`) | rendered as text input |
| Attrs outside `editableAttributes` | shown disabled — in the prosemirror panel inline-disabled, in the prosekit panel under the read-only `<details>` section |
| `qti-choice-interaction` | friendly editor (presentation) still appears in prosekit panel |
| `qti-rubric-block` (in prosekit-app only) | new rubric-block friendly editor renders the `use`/`view` selects |

Run:
```bash
pnpm -r typecheck
grep -rn "fields:\|AttributeFieldDefinition\|AttributeFieldOption" packages/prose-qti/src packages/prose-qti-ui/src apps
```
Both should be clean.

---

## Out of scope

- Re-organising the panel's visual hierarchy (collapsible sections, attribute groups). The refactor preserves the existing "editable above, read-only `<details>` below" prosekit layout and the prosemirror panel's inline layout.
- Migrating `friendlyEditors` themselves. They keep their `kind`-based registry.
- Localising the placeholder attribute names. They render as the raw camelCase key (`dataFirstColumnHeader` etc.); i18n is a separate concern.
- Renaming `editableAttributes` to something like `userEditable` or moving it onto the node spec. The naming is fine; touching every metadata.ts again isn't worth it.

## Estimated effort

- Phase 1 (interface): 10 min.
- Phase 2 (strip `fields:` from 12 files + new rubric-block friendly editor): ~2 hours (most of it the rubric-block editor).
- Phase 3 (prosekit panel simplification): 30 min.
- Phase 4 (revert prosemirror-app plumbing): 10 min.
- Phase 5 (verify): 30 min.

**Total: ~3.5 hours.** Land as a single PR; the interface change is breaking for any out-of-tree metadata, but inside this repo it's a coordinated sweep.

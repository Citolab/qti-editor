# Plan: Two-Button Export Toolbar + Per-Item Metadata on Divider

## Goal

1. Replace the Export dropdown + standalone Export Package button with **two explicit toolbar buttons**:
   - `Export qti3 item (${title}.xml)` — subtitle: `${title}.xml`
   - `Export qti3 test (${title}.zip)` — subtitle: `${title}.zip`
2. Rename the right-sidebar form from `Item-metadata` / `Item Metadata` to **`Metadata`**. Its `title` and `identifier` drive both buttons' filenames.
3. Per-item `title` and `identifier` live on `qti-item-divider`. Clicking a divider opens the existing attribute panel (same UX as interactions) to edit them.
4. Remove the `informatief` (informational) checkbox **entirely**. An item is informational iff it has zero interactions — derived, not stored.

## Allowed APIs / Patterns (sourced from current code)

- Attribute-editor wiring: descriptors expose `attributePanelMetadata` keyed by lowercased nodeTypeName; `getNodeAttributePanelMetadataByNodeTypeName` resolves it. Reference: `packages/prosemirror/interaction-text-entry/src/composer/metadata.ts:32-40`.
- Node attribute persistence in ProseMirror: declare `attrs` in NodeSpec, implement `parseDOM.getAttrs` (read DOM attrs) and `toDOM` (emit attrs). Reference: existing interaction schemas.
- Interaction counting: `doc.descendants(node => /qti.*-interaction$/.test(node.type.name))`. Reference: existing items-navigator pattern.
- Toolbar buttons: `ToolbarButton` component (`apps/editor/src/components/ui/toolbar-button.tsx`) — used today for `fileExportPackage`.

## Anti-patterns to avoid

- Do NOT keep an `informational` property anywhere (form, ItemContext, PerItemMetadata, ExportXmlOptions, qti-package context). Removal must be complete; derive at composition time.
- Do NOT invent a parallel `informationalItems: boolean[]` — the qti-package builder must compute it from the per-item interaction count.
- Do NOT introduce a second per-item metadata store. The divider is the source of truth for items 2..N; the top-level form keeps holding metadata for item 1 (no divider precedes it).
- Do NOT wire a custom click handler on the divider — ProseMirror's `NodeSelection` on `atom: true, selectable: true` already triggers the attribute panel once `attributePanelMetadata` is populated. Verify, don't reinvent.

---

## Phase 0 — Documentation Discovery (DONE)

Captured in this doc. Concrete findings:

| Concern | File | Line(s) |
|---|---|---|
| Export dropdowns + Package button | `apps/editor/src/components/file-management/file-actions.tsx` | 36–59 |
| Editor exposed export methods | `apps/editor/src/components/qti-editor-app.ts` | 287–333 |
| Export implementations | `apps/editor/src/lib/exportXml.ts` | 21–148 |
| Filename source (`fileName` state) | `apps/editor/src/editor.tsx` | ~36, 132–144, 198 |
| Metadata form (title/id/informational) | `packages/ui/src/components/composer-metadata-form/composer-metadata-form.ts` | full file |
| Metadata form mount | `apps/editor/src/components/qti-editor-app.ts` | 407–415 |
| Per-item state + informational sync | `apps/editor/src/components/qti-editor-app.ts` | 128–157, 159–164 |
| `PerItemMetadata` / `ItemContext` | `packages/qti/prosekit-integration/src/item-context/index.ts` | 11–23 |
| QtiPackageContext + writing `category="dep-informational"` | `packages/qti/package/src/index.ts` | 47, 69, 145, 162, 227–228 |
| Divider node spec (no attrs today) | `packages/prosemirror/qti-item-divider/src/qti-item-divider.schema.ts` | full |
| Divider component (no @property today) | `packages/prosemirror/qti-item-divider/src/qti-item-divider.ts` | full |
| Divider descriptor (empty panel metadata) | `packages/prosemirror/qti-item-divider/src/descriptor.ts` | 29–51 |
| Panel discovery / NodeSelection | `packages/ui/src/components/attributes-panel/attributes-panel.ts` | 44–60 |
| Reference editor metadata pattern | `packages/prosemirror/interaction-text-entry/src/composer/metadata.ts` | 32–40 |
| i18n strings | `packages/prosemirror/interaction-shared/src/i18n/messages.ts` | 17, 24–25, 154, 161–162 |
| App-level i18n keys (export labels) | `apps/editor/src/i18n.ts` | 30–40 |

---

## Phase 1 — Remove `informational` everywhere; derive from interaction count

**What to do (copy-shape from existing code, do not transform incrementally):**

1. `packages/ui/src/components/composer-metadata-form/composer-metadata-form.ts`
   - Delete `@property isInformational` (line 19).
   - Delete `#onInformationalChange` (lines 38–41).
   - Drop `informational` from the `metadata-change` event detail (line 49).
   - Delete the checkbox `<label>` block (lines 91–101).

2. `packages/prosemirror/interaction-shared/src/i18n/messages.ts`
   - Delete keys `composerMetadata.informational` and `composerMetadata.informationalHint` from EN (24–25) and NL (161–162).

3. `packages/qti/prosekit-integration/src/item-context/index.ts`
   - Remove `informational?: boolean` from `PerItemMetadata` (line 14).
   - Remove `informationalItems?: boolean[]` from `ItemContext` (line 23).

4. `apps/editor/src/components/qti-editor-app.ts`
   - `onMetadataChange` (128–157): remove `informational` from the destructure, the seed object literal at line 132, and the assignment at line 149.
   - Initial itemContext literal (163): remove `informational: false`.
   - Remove the `informationalItems` line entirely from the `setState` at 152–156.
   - Metadata-form mount (412): remove `.isInformational=...` binding.
   - Other lines that referenced `informational` (412 area): delete.

5. `apps/editor/src/lib/exportXml.ts`
   - `ExportXmlOptions.items` element type (line 12): drop `informational?: boolean`.
   - `exportPackage` (139): remove the `informationalItems: ...` field.

6. `packages/qti/package/src/index.ts`
   - Remove `informationalItems?: boolean[]` from the package context type (47).
   - Remove `informational?: boolean` from the item interface (69).
   - Delete the pass-through at 145 and 162.
   - At 227–228, replace the read-from-flag with derived logic: count `qti.*-interaction$` nodes per item (using the same per-item ProseMirror subtree the builder already walks). When zero, emit `category="dep-informational"`.

**Verification checklist:**
- `rg -n "informational|informatief|isInformational"` returns zero hits across the three repos (except possibly historical plans).
- Build all packages cleanly (`pnpm -r build` or whatever the project uses).
- Manually: an item with no interaction in the editor produces `<qti-assessment-item-ref ... category="dep-informational">`; adding any interaction removes that category on next export. (Use the dev "roundtrip" export or open the .zip's manifest XML.)

**Anti-pattern guards:**
- Don't leave a `derivedInformational: boolean` field on the context. The check happens at composition time inside the qti-package builder; no plumbing needed.
- Don't reintroduce the field as a UI override. Spec is final: zero interactions ⇒ informational, period.

---

## Phase 2 — Put `title` + `identifier` on `qti-item-divider`

**What to do:**

1. `packages/prosemirror/qti-item-divider/src/qti-item-divider.schema.ts`
   - Add `attrs: { title: { default: '' }, identifier: { default: '' } }`.
   - Replace `parseDOM` `getAttrs` to read both attributes from the DOM element (return `{ title: dom.getAttribute('title') ?? '', identifier: dom.getAttribute('identifier') ?? '' }`).
   - Update `toDOM(node)` to emit both attributes on the `qti-item-divider` element when non-empty.

2. `packages/prosemirror/qti-item-divider/src/qti-item-divider.ts`
   - Add Lit `@property({ type: String }) title = ''` and `@property({ type: String }) identifier = ''` decorators.
   - Optionally render the title in the divider's visible label when present (small enhancement — keep the current `divider.itemBoundary` text when empty).

3. `packages/prosemirror/qti-item-divider/src/descriptor.ts`
   - Replace the empty `attributePanelMetadata: {}` with a map keyed on `'qtiitemdivider'` (lowercased nodeTypeName) exposing `editableAttributes: ['title', 'identifier']` and `fields: { title: { label: <i18n>, input: 'text' }, identifier: { label: <i18n>, input: 'text' } }`. Model after `textEntryNodeAttributePanelMetadataByNodeTypeName`.

4. Ensure `nodeAttrsSyncExtension` is already in the editor extension union (it is — line 189 of qti-editor-app.ts) so DOM attribute mutations from the Lit component propagate back into ProseMirror node attrs. If it doesn't already cover dividers, confirm by editing a divider in the attribute panel and watching the PM doc state.

**Verification checklist:**
- Insert a divider, click it → the right-side attributes panel shows `title` and `identifier` text inputs.
- Edit them → ProseMirror node attrs update (inspect via `editor.view.state.doc.toJSON()` in console).
- Roundtrip: export then re-import the doc; divider keeps its title/identifier.
- Existing docs in localStorage still load (default attrs empty — no breakage).

**Anti-pattern guards:**
- Don't add a click handler in the Lit component. Selection is the framework's job; `selectable: true, atom: true` is sufficient.
- Don't store divider properties in `itemContext.items` — the divider node *is* the storage. `itemContext.items` for items 2..N becomes derived from divider attrs at export time (Phase 3).

---

## Phase 3 — Source export filenames from the renamed `Metadata` field; rebuild item array from dividers

**What to do:**

1. Rename the i18n key value at `packages/prosemirror/interaction-shared/src/i18n/messages.ts`:
   - EN (17): `'composerMetadata.heading': 'Metadata'`
   - NL (154): `'composerMetadata.heading': 'Metadata'`
   (Both languages now read "Metadata".)

2. `apps/editor/src/components/qti-editor-app.ts`
   - Add a helper `getEffectiveItems(): PerItemMetadata[]` that walks `editor.view.state.doc`:
     - Item 0: title/identifier from `itemContext.items[0]` (top-level metadata form, unchanged).
     - Items 1..N: title/identifier from each `qtiItemDivider` node's attrs.
   - Have `exportXml`, `exportItem`, `exportPackage` call `getEffectiveItems()` to build the `items` argument instead of passing `itemContext.items` directly.
   - The top-level metadata form's `title` becomes the canonical "document title" — pass it as the `fileName` parameter to all three exports (replacing the existing `fileName` state from editor.tsx — see step 4).

3. `apps/editor/src/lib/exportXml.ts`
   - Keep `exportItem` (writes `${fileName}.xml`) and `exportPackage` (writes `${fileName}.zip`). Remove `exportXml` (the `qtiTestFromProsemirror`-as-single-XML path) — it's the dropdown's "Export QTI Test" .xml variant, which the new UI no longer surfaces. Confirm with caller search before deleting; if any non-toolbar caller exists, leave the function but stop wiring it.

4. `apps/editor/src/editor.tsx`
   - Remove the `fileName` text input and `useFileOperations`-managed `fileName` state usage for export. Replace with: read `currentItem?.title` (item 0, from the metadata form) and pass that as the filename. The visible "filename input" UI element goes away — the metadata form's title field replaces it.
   - Update the export-callback closures (132–169) to take their filename from the metadata form's title instead of the removed input.

5. `apps/editor/src/components/file-management/file-actions.tsx`
   - Delete the entire **Export** `DropdownMenu` block (46–55).
   - Delete the **Export Package** standalone `ToolbarButton` (57–59).
   - Add two new `ToolbarButton`s side by side:
     - Label: `Export qti3 item` · `title` attribute: `${title}.xml` · onClick: `onExportItem`.
     - Label: `Export qti3 test` · `title` attribute: `${title}.zip` · onClick: `onExportPackage`.
   - Both labels are rendered with the filename suffix inside (per spec: `Export qti3 item (${title}.xml)`). Render as `{t('exportItem')} <span class="opacity-60">({title}.xml)</span>` or similar — pick the toolbar's existing typography pattern. Subtitle/tooltip uses the same string.
   - Drop the now-unused callback props: `onExport`, `onExportJson`, `onExportRoundtripXml`, `onImportJson`, `onImportRoundtripXml`. Keep the dev-only Import dropdown OR collapse the Import button to a single QTI-only `ToolbarButton`; pick whichever matches the symmetry the user wants. **Ask the user** before deleting dev-only Import options (they may want to keep them on `?dev=true`).
   - `title` prop comes from a new `title: string` prop on `FileActionsProps`. Thread it from `editor.tsx` (which reads it from the metadata form's title via the editor app's exposed accessor or context).

6. `apps/editor/src/i18n.ts`
   - Add: `exportItem`, `exportItemTitle`, `exportTest`, `exportTestTitle` (or reuse existing `fileExportQtiItem` / `fileExportPackage` and rename). Remove the keys that backed the deleted dropdown items (`fileExport`, `fileExportQtiTest`, `fileExportQtiTestTitle`, `fileExportPackage`, `fileExportPackageTitle`) once no caller remains.

**Verification checklist:**
- Toolbar shows exactly two export buttons; each shows the live filename in its visible label and tooltip; both update as the user edits the metadata `title`.
- Clicking the item button downloads `${title}.xml`; clicking the test button downloads `${title}.zip`.
- Multi-item doc: the test's per-item titles inside the package come from each divider's title attr; item 1 from the metadata form.
- Single-item doc (no dividers): item button still produces a valid `.xml`; test button produces a `.zip` with one item.
- Right sidebar heading reads "Metadata" (both EN and NL).

**Anti-pattern guards:**
- Don't keep the standalone `fileName` text input as a hidden backup. One source of truth — the metadata form.
- Don't compute the suffix in i18n strings — it's literal `.xml` / `.zip` and doesn't translate.

---

## Phase 4 — Final Verification

1. `rg -n "informational|informatief|isInformational|informationalItems"` across all three repos returns zero non-historical hits.
2. `rg -n "Item.metadata|Item Metadata|item-metadata"` returns zero hits except in plans/changelog.
3. `rg -n "exportXml\\b|fileExportQtiTest|fileExportPackage"` returns zero hits in `apps/editor/src` (the symbols are gone or renamed).
4. Manual flow:
   1. Fresh editor → metadata form heading says "Metadata".
   2. Type a title; both toolbar buttons' labels update with `(title.xml)` / `(title.zip)`.
   3. Add an interaction → export item → downloads `title.xml`, opens as valid QTI.
   4. Remove all interactions from item 1 → export test → unzip; the manifest's `<qti-assessment-item-ref>` for that item has `category="dep-informational"`.
   5. Insert a divider, click it → attribute panel shows `title` + `identifier` inputs.
   6. Edit divider title → export test → that item in the package uses the divider's title.
   7. Reload the page (localStorage roundtrip) → divider attrs survive.
5. Type-check passes (`pnpm typecheck` or `tsc -b`); existing tests pass.

---

## Decision: Metadata form is backed by doc attrs (Phase 3)

The top-level `title` and `identifier` shown in the Metadata form live on the ProseMirror doc node's attrs, not in React/Lit state or `itemContext.items[0]`.

**Implementation when Phase 3 runs:**
- Extend the doc `NodeSpec` (wherever `defineBasicExtension` configures it; likely a `topNode`/doc schema override) with `attrs: { title: { default: '' }, identifier: { default: '' } }`.
- Metadata form's `metadata-change` handler dispatches a transaction: `view.dispatch(view.state.tr.setDocAttribute('title', value))` (and same for identifier).
- Form initial values come from `editor.view.state.doc.attrs.title` / `.identifier`.
- Export functions read filename and identifier from `doc.attrs`, not from `itemContext.items[0]`.
- `getEffectiveItems()` (Phase 3 step 2): item 0's title/identifier = `doc.attrs`; items 1..N = divider attrs.
- Persistence layer already serializes the full doc JSON, which includes `attrs` — no extra wiring needed for localStorage roundtrip.
- ProseMirror's `parseDOM` / `toDOM` for the doc node should emit/read these on a wrapper element (e.g. `<qti-document title="..." identifier="...">`) so XML roundtrip survives.

## Open question for the user (before Phase 3)

The current Import dropdown holds two dev-only entries (JSON, Roundtrip). The spec only addresses Export. **Should the Import dropdown be left as-is, collapsed to a single button, or made symmetric with the new Export style?** Defaulting to "left as-is" unless told otherwise.

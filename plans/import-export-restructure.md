# Plan: Import/Export Restructure

## Goal

Make the import and export menus match what the user actually does with them. The current export menu has two dev entries — "QTI test (XML) exporteren" and "Roundtrip XML exporteren" — that are misleading or useless. The current import menu pretends a test import exists. Fix both, and add an editor-origin marker (`data-lab-editor-version`) plus `data-identifier` / `data-title` mirrors on exported QTI item bodies so we can later detect whether an imported QTI3 file came from this editor.

## Final user-visible shape

### Export menu
| Button / menu item | Visibility | Backing function |
|---|---|---|
| `Export qti3 item (${title}.xml)` (toolbar button) | always | `exportItem` (single QTI assessment item XML) |
| `Export qti3 test (${title}.zip)` (toolbar button) | always | `exportPackage` (QTI 3 package ZIP) |
| **`Export ▾` dropdown** | `isDev` only | |
| → `Export XML` | dev | `exportRoundtripXml` (lossless ProseMirror ↔ XML) |
| → `Export JSON` | dev | `exportJson` (ProseMirror JSON) |
| ~~`Export QTI test (XML)`~~ | **removed** | — |
| ~~`Export Roundtrip XML` (old label)~~ | **renamed → `Export XML`** | same fn |

### Import menu
| Menu item | Visibility | Backing function |
|---|---|---|
| `Import QTI XML` | always | `openXmlFilePicker` — QTI3 item only (uses interaction transforms to recover correct-response) |
| `Import XML` (was `Import Roundtrip XML`) | dev | `importRoundtripXml` (lossless XML → ProseMirror JSON) |
| `Import JSON` | dev | `importJson` (ProseMirror JSON) |

No test import. Ever.

### Editor-origin marker on exports
When `exportItem` (and the per-item composition inside `exportPackage`) emit a `<qti-assessment-item>`, its `<qti-item-body>` gains three mirror attributes:
- `data-identifier="${item identifier}"`
- `data-title="${item title}"`
- `data-lab-editor-version="1"`

These let a future QTI3 importer answer: *did this file come out of this editor?* If yes → trust the data-attribute roundtrip path. If no → fall through to the lossy QTI3 transform path (current `openXmlFilePicker`).

The actual *consumption* of the marker is **out of scope for this plan** — we only emit it. Detection logic lands in a follow-up.

---

## Phase 0 — Facts established (do not re-discover)

### Files modified by the in-flight working tree (see `git status`)
- [apps/editor/src/components/file-management/file-actions.tsx](apps/editor/src/components/file-management/file-actions.tsx)
- [apps/editor/src/components/layout/header.tsx](apps/editor/src/components/layout/header.tsx)
- [apps/editor/src/components/qti-editor-app.ts](apps/editor/src/components/qti-editor-app.ts)
- [apps/editor/src/editor.tsx](apps/editor/src/editor.tsx)
- [apps/editor/src/lib/exportXml.ts](apps/editor/src/lib/exportXml.ts)
- [apps/editor/src/i18n.ts](apps/editor/src/i18n.ts)

### Current export functions in [exportXml.ts](apps/editor/src/lib/exportXml.ts)
| Fn | Lines | What it does |
|---|---|---|
| `exportXml` | 21–57 | Calls `qtiTestFromProsemirror` → emits a multi-item assessment **test** XML. **This is the one to delete.** |
| `exportJson` | 59–69 | ProseMirror JSON dump. Keep. |
| `importJson` | 71–92 | File picker → `schema.nodeFromJSON`. Keep. |
| `exportItem` | 94–113 | Calls `qtiItemFromProsemirror` → single QTI assessment item. Keep. **Target for editor-origin marker.** |
| `exportRoundtripXml` | 115–125 | Calls `xmlFromNode` → emits `<qti-item-body>` with `data-*` mirrors. Keep, rename UI label. |
| `exportPackage` | 127–147 | Calls `createQtiPackageFromNode` → ZIP. Keep. **Per-item bodies inside also get the marker.** |

### Current import functions in [importXml.ts](apps/editor/src/lib/importXml.ts)
| Fn | What it does |
|---|---|
| `openXmlFilePicker` | QTI3 XML / ZIP file picker — runs `migrateHtmlFragment` over `xmlToHTML`. Already correctly limited to items (no test-shaped import path). Keep. |
| `importRoundtripXml` | Roundtrip XML → ProseMirror JSON. Keep, rename UI label. |
| `importJson` (in exportXml.ts) | JSON file picker → `nodeFromJSON`. Keep. |

### Current `FileActions` shape ([file-actions.tsx](apps/editor/src/components/file-management/file-actions.tsx))
- Props: `onExportItem`, `onExportPackage`, `onExportXml`, `onExportJson`, `onExportRoundtripXml`, `onImport`, `onImportJson`, `onImportRoundtripXml`.
- Renders: New · Save · Import▾ · Export-Item button · Export-Package button · Export▾ (dev-gated).
- The dev Export▾ currently has 3 items in order: `fileExportQtiTestXml` (test XML), `fileExportJson`, `fileExportRoundtrip`.

### i18n keys to remove ([i18n.ts:30-40, 97-107](apps/editor/src/i18n.ts))
- `fileExportQtiTestXml` + `fileExportQtiTestXmlTitle` — delete from both `en` and `nl`.
- Keep `fileExportRoundtrip` / `fileExportRoundtripTitle` keys, **but change their values** from "Export Roundtrip XML" → "Export XML" (and Dutch "Roundtrip XML exporteren" → "XML exporteren"). Same for `fileImportRoundtrip` / `fileImportRoundtripTitle` ("Import XML" / "XML importeren").

### Emission point for the editor-origin marker
`<qti-item-body>` is created/copied inside [packages/qti/core/src/composer/index.ts](packages/qti/core/src/composer/index.ts) — the relevant function is `buildAssessmentItemXml` (line 199–~330). The composed item body is obtained at lines 223–233 (either imported from `itemContext.itemBody` or freshly created). That's where we add the three mirror attributes.

**Why on `<qti-item-body>` and not on `<qti-assessment-item>`:** the user explicitly said *"op het item-body"*. It also keeps the marker scoped to the body the editor authored, leaving the outer item element alone for downstream tooling.

### Existing wrapper for the editor-origin emission
The same item body is built by `buildItemBodyContext` in [packages/qti/item-export/src/pm-qti-item.ts:23-37](packages/qti/item-export/src/pm-qti-item.ts#L23-L37). The marker should be added by `buildAssessmentItemXml` (a single chokepoint), so both single-item export (`qtiItemFromProsemirror`) and test/package export (which iterates per item) emit it without duplicate code.

### Anti-patterns to avoid
- Do **not** keep `exportXml` (the test-XML one) under a different name or as a hidden API. The user has rejected the artifact — delete the function, its caller wiring, and its i18n keys.
- Do **not** add an `Import Test` entry, ever. There is no test import path and we are not creating one.
- Do **not** put `data-lab-editor-version` on `<qti-assessment-item>`. User specified `<qti-item-body>`.
- Do **not** invent a separate "editor-flavor" XML schema. We are only adding three attributes to the existing emission.
- Do **not** add detection logic in this plan. Emission only — detection is a follow-up plan.
- Do **not** preserve backwards compatibility for the old `Export QTI test (XML)` button. It was dev-only and never user-facing in production.

---

## Phase 1 — Delete `exportXml` (the test-XML export) and its wiring

**What to do:**

1. **[apps/editor/src/lib/exportXml.ts](apps/editor/src/lib/exportXml.ts)**
   - Delete the `exportXml` function (lines 21–57) entirely.
   - Delete the `ExportXmlOptions` re-use only if no longer referenced. It's still used by `exportItem` and `exportPackage`, so keep the interface — only delete the function.
   - Remove the unused `qtiTestFromProsemirror` import on line 2 if nothing else in this file uses it. (Grep confirms: `exportPackage` uses `createQtiPackageFromNode`, not `qtiTestFromProsemirror`, so the import is dead after `exportXml` is removed.)

2. **[apps/editor/src/components/qti-editor-app.ts](apps/editor/src/components/qti-editor-app.ts)**
   - Remove the public `exportXml` method on `QtiEditorApp` and its forwarded callers.
   - Grep for `exportXml(` and `onExportXml` and remove every call site.

3. **[apps/editor/src/components/layout/layout-editor.tsx](apps/editor/src/components/layout/layout-editor.tsx)** (and any `EditorLayout` imperative-handle declaration)
   - Drop `exportXml` from the imperative-handle interface.

4. **[apps/editor/src/editor.tsx](apps/editor/src/editor.tsx)**
   - Delete `handleExportXml` and its `AppHeader` prop pass-through.

5. **[apps/editor/src/components/layout/header.tsx](apps/editor/src/components/layout/header.tsx)**
   - Drop `onExportXml` from `AppHeader`'s props and from the `FileActions` pass-through.

6. **[apps/editor/src/components/file-management/file-actions.tsx](apps/editor/src/components/file-management/file-actions.tsx)**
   - Delete `onExportXml` from the `FileActionsProps` interface.
   - Delete the corresponding line from the dev Export dropdown's `items` array (currently item index 0: `fileExportQtiTestXml`).

7. **[apps/editor/src/i18n.ts](apps/editor/src/i18n.ts)**
   - Delete the four keys `fileExportQtiTestXml`, `fileExportQtiTestXmlTitle` (English block lines 39–40 and Dutch block lines 106–107).

**Verification checklist:**
- `rg -n "exportXml\b|onExportXml|fileExportQtiTestXml" apps/editor/` returns zero hits.
- `rg -n "qtiTestFromProsemirror" apps/editor/` returns zero hits.
- `pnpm -w typecheck` passes.
- Toolbar in the running app: dev Export▾ no longer shows the "QTI test (XML)" entry.

**Anti-pattern guards:**
- Don't leave the prop in `FileActionsProps` with a `?` to "keep the type optional for compatibility". Delete it.
- Don't keep `qtiTestFromProsemirror` re-exported from anywhere on the suspicion something else might need it. If grep is clean across all three working dirs (`QTI-Editor`, `QTI-Components`, `QTI-Convert`), it's gone.

---

## Phase 2 — Rename "Roundtrip XML" → "XML" in the UI

**What to do:**

1. **[apps/editor/src/i18n.ts](apps/editor/src/i18n.ts)** — change the *values* only, not the keys:
   - `en.fileImportRoundtrip`: `'Import Roundtrip XML'` → `'Import XML'`
   - `en.fileImportRoundtripTitle`: `'Import item-body XML (dev)'` → `'Import lossless XML (dev)'`
   - `en.fileExportRoundtrip`: `'Export Roundtrip XML'` → `'Export XML'`
   - `en.fileExportRoundtripTitle`: `'Export item-body XML with data-* mirrors (dev)'` → `'Export lossless XML (dev)'`
   - `nl.fileImportRoundtrip`: `'Roundtrip XML importeren'` → `'XML importeren'`
   - `nl.fileImportRoundtripTitle`: `'Item-body XML importeren (dev)'` → `'Lossless XML importeren (dev)'`
   - `nl.fileExportRoundtrip`: `'Roundtrip XML exporteren'` → `'XML exporteren'`
   - `nl.fileExportRoundtripTitle`: `'Item-body XML met data-* spiegels exporteren (dev)'` → `'Lossless XML exporteren (dev)'`

2. **Function names** in [exportXml.ts](apps/editor/src/lib/exportXml.ts) and [importXml.ts](apps/editor/src/lib/importXml.ts):
   - Keep `exportRoundtripXml` / `importRoundtripXml` as **internal** function names — the name is still accurate at the code level (it's the lossless roundtrip path). The rename is UI-only.
   - **Exception:** the downloaded filename in `exportRoundtripXml` is `${safeFileName}.roundtrip.xml` (line 122). Change to `${safeFileName}.xml` since the user wants it to look like a plain XML.

**Verification checklist:**
- Toolbar in the running app: dev Export▾ shows "Export XML" (not "Export Roundtrip XML").
- Dev Import▾ shows "Import XML" (not "Import Roundtrip XML").
- Downloading from dev Export▾ → Export XML produces `${title}.xml`.
- Importing that same file via dev Import▾ → Import XML round-trips back to the editor losslessly (manually verify: edit something non-QTI, export, import, confirm it's identical).

**Anti-pattern guards:**
- Don't rename `exportRoundtripXml` / `importRoundtripXml` in code — the technical term "roundtrip" is correct internally. Only labels change.
- Don't change the i18n **keys**. Keys (`fileExportRoundtrip`) are stable identifiers; values are the localized labels.

---

## Phase 3 — Emit `data-identifier`, `data-title`, `data-lab-editor-version` on `<qti-item-body>` during QTI3 export

**Why a single chokepoint:** `buildAssessmentItemXml` in [packages/qti/core/src/composer/index.ts:199](packages/qti/core/src/composer/index.ts#L199) is called by both `qtiItemFromProsemirror` (single item export) and `getItemFragmentXmls` (multi-item, used by `exportPackage`). Adding the attributes there covers both `exportItem` and `exportPackage` automatically.

**What to do:**

1. **[packages/qti/core/src/composer/index.ts](packages/qti/core/src/composer/index.ts)**, inside `buildAssessmentItemXml` (around lines 230–235, immediately after `composedItemBody` is resolved at lines 230–233):
   - Add a constant at the top of the file (near other constants like `QTI_NS`):
     ```ts
     export const LAB_EDITOR_VERSION = '1';
     ```
   - After `composedItemBody` is assigned but before it's appended into the tree, set the three attributes on it:
     ```ts
     const itemIdentifier = sanitizeIdentifier(
       itemContext.identifier,
       createAutoIdentifier({ title: itemContext.title, baseIdentifier: itemContext.identifier, body: itemContext.itemBody }),
     );
     const itemTitle = itemContext.title?.trim() || 'Untitled Item';
     composedItemBody.setAttribute('data-identifier', itemIdentifier);
     composedItemBody.setAttribute('data-title', itemTitle);
     composedItemBody.setAttribute('data-lab-editor-version', LAB_EDITOR_VERSION);
     ```
   - The `identifier` and `title` used in attribute mirrors must match what's set on the outer `<qti-assessment-item>` (lines 207–218). The cleanest refactor: hoist the existing identifier + title computation into local consts at the top of the function and reuse them for both the outer element attributes and the mirrors. Don't duplicate the `sanitizeIdentifier(...)` call.

2. **[packages/qti/core/src/composer/index.ts](packages/qti/core/src/composer/index.ts)** — also patch the fragment branch:
   - `getItemFragmentXmls` (line 428) calls `buildAssessmentItemXml({ identifier: uniqueIdentifier, title, lang, itemBody: fragmentDoc })` for each item — same chokepoint, so no extra work needed if the change above is correctly inside `buildAssessmentItemXml`.

3. **Snapshot tests will fail.** Update:
   - [packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts](packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts) — re-run with `-u` (Vitest's `--update-snapshots`) **after** confirming the diff is exactly the three new attributes on every `<qti-item-body>` snapshot. Manually scan the diff first; do not blind-update.
   - Any other snapshot under `packages/qti/` that exercises `buildAssessmentItemXml`. Grep:
     ```sh
     rg -l "qti-item-body" packages/ --type ts | xargs rg -l "snapshot|toMatchInlineSnapshot"
     ```

4. **Roundtrip-import compatibility check.** The lossless roundtrip path uses `<qti-item-body>` as its root. Adding three `data-*` attributes to it means the roundtrip-import side (Phase 4 of related plans) must tolerate them — verify that `xmlToHTML` + `jsonFromHTML` doesn't choke on the extra attributes. Manual test: export item, re-import via `Import XML`, confirm the doc state is byte-equivalent.

**Verification checklist:**
- Export a single item via `Export qti3 item`. Open the `.xml`. Confirm `<qti-item-body data-identifier="…" data-title="…" data-lab-editor-version="1">`.
- Export a package via `Export qti3 test`. Unzip. Confirm **every** item XML inside has the same three attributes on its `<qti-item-body>`.
- Round-trip: dev Export XML → dev Import XML produces no editor diff.
- `pnpm -w test` is green (snapshots updated, manually reviewed).

**Anti-pattern guards:**
- Don't put the version literal (`'1'`) inline at multiple sites — export it once from `composer/index.ts`. Future bumps need a single change.
- Don't set `data-identifier` / `data-title` to a *different* value than the outer item element's `identifier` / `title`. They must be derived from the same source.
- Don't add the attributes inside `buildSingleAssessmentItemXml` only — it delegates to `buildAssessmentItemXml`. One place.
- Don't add the attributes to the roundtrip-XML path (`xmlFromNode`). That path already emits `<qti-item-body>` from ProseMirror directly with its own `data-*` mirrors; the editor-origin marker is a QTI3-export concern, not a roundtrip-XML concern.

---

## Phase 4 — Verification & cleanup

1. **Smoke test the running app:**
   - New item → fill metadata (title, identifier) → 3 toolbar buttons:
     - `Export qti3 item` → `.xml` opens, has the three `data-*` attrs on item-body.
     - `Export qti3 test` → `.zip` downloads; unzipping shows multi-item XML, each item-body has the attrs.
   - Dev mode (`?dev=true`):
     - Import▾: shows exactly 3 entries — Import QTI XML, Import XML, Import JSON. **No "Import Test"**.
     - Export▾: shows exactly 2 entries — Export XML, Export JSON. **No "Export QTI test (XML)"**, **no "Export Roundtrip XML"** (label rename).
   - Lossless round-trip: dev Export XML → dev Import XML → editor state unchanged.

2. **Grep guards (run from repo root):**
   ```sh
   rg -n "fileExportQtiTestXml" apps/editor/      # expect: zero hits
   rg -n "exportXml\b" apps/editor/src/lib/       # expect: zero hits (function deleted)
   rg -n "qtiTestFromProsemirror" apps/editor/    # expect: zero hits
   rg -n "Roundtrip XML"     apps/editor/src/i18n.ts  # expect: zero hits (en)
   rg -n "Roundtrip XML"     apps/editor/src/i18n.ts  # expect: zero hits (nl)
   rg -n "Import Test|test-import|importTest" apps/editor/  # expect: zero hits
   rg -n "data-lab-editor-version" packages/qti/  # expect: exactly one definition + tests/snapshots
   ```

3. **Typecheck + tests:**
   ```sh
   pnpm -w typecheck
   pnpm -w test
   ```

4. **Update [plans/toolbar-import-export-reorganize.md](plans/toolbar-import-export-reorganize.md)** if any of its targets are now stale. (Optional — the file is a prior plan, not a spec.)

---

## Out of scope (explicit follow-ups)

- **Detection of editor-origin on QTI3 import.** This plan only *emits* `data-lab-editor-version`. The import-side branch (trust roundtrip vs. fall through to QTI3 transform) is a separate plan.
- **Renaming the in-code function names** `exportRoundtripXml` / `importRoundtripXml`. The technical term stays internal.
- **Test-XML import.** Will not be built.
- **Versioning policy for `data-lab-editor-version`.** Currently `'1'`. Bump semantics (when, by whom) deferred.

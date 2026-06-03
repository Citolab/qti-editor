# Plan: Detect editor-origin on QTI3 import via `data-lab-editor-version`

## Goal

When the user picks `Import QTI XML` and the file came out of *this* editor (carries `data-lab-editor-version` on `<qti-item-body>`), skip the lossy `qti3-item-import` transforms — the data-* mirrors already carry everything we need. When the file is foreign QTI (marker absent), run the transforms first to recover correct-response, score, etc. from the QTI-native elements.

Predecessor: [import-export-restructure.md](plans/import-export-restructure.md) Phase 3 — emits the marker. This plan is the consumer.

---

## Phase 0 — Facts established

### Current QTI3 item import path
[apps/editor/src/lib/importXml.ts:61-102](apps/editor/src/lib/importXml.ts#L61-L102) — `importXmlFromText`:
1. `cleanXmlText(xmlText)` → strip BOM/ZWS/NBSP.
2. `xmlToHTML(cleanedXml)` → DOM string.
3. `migrateHtmlFragment(...)` → compatibility migration, preserves `rubric-text` attr + `qti-rubric-block` tag.
4. `jsonFromHTML(...)` → ProseMirror JSON.
5. `extractMetadata(cleanedXml)` → reads `title` + `identifier` off `<assessmentItem>` / `<qti-assessment-item>`.

**Crucially:** the current path does **not** call `roundtripQtiItem` (the transform that recovers `data-correct-response` from `<qti-correct-response>` for `qti-choice-interaction`, `qti-text-entry-interaction`, `qti-extended-text-interaction`). That means foreign QTI imports today silently lose correct-response on choice / text-entry / extended-text interactions.

So this plan does two things at once:
- **Wire `roundtripQtiItem` into the foreign-QTI branch** (a latent bug fix, not just an optimization).
- **Skip `roundtripQtiItem` for editor-origin imports** (the marker tells us the data-* mirrors are already in place).

### Available transforms
[packages/qti/qti3-item-import/src/roundtrip-qti-item.ts:13](packages/qti/qti3-item-import/src/roundtrip-qti-item.ts#L13) — `roundtripQtiItem(xmlString: string): string`. Pure XML→XML, runs three v1 transforms (`roundtripChoice`, `roundtripTextEntry`, `roundtripExtendedText`).

### Where the marker lives
On every `<qti-item-body>` emitted by `buildAssessmentItemXml` ([packages/qti/core/src/composer/index.ts:230](packages/qti/core/src/composer/index.ts#L230)) — `data-lab-editor-version="1"`. Adjacent to it: `data-identifier`, `data-title`.

### Anti-patterns to avoid
- **Do not** inspect `data-lab-editor-version` *after* `xmlToHTML` — `xmlToHTML` may rewrite or strip attributes. Read the marker from the raw XML string with `DOMParser`, identical to how `extractMetadata` already works ([apps/editor/src/lib/importXml.ts:42-55](apps/editor/src/lib/importXml.ts#L42-L55)).
- **Do not** trust a partially-marked file. If *any* item-body is missing the marker, treat the whole import as foreign. (Cheap & safe.)
- **Do not** version-compare yet (`'1' === LAB_EDITOR_VERSION`). The marker is a boolean signal for v1. A `compareVersion` shim is a future concern.
- **Do not** branch in `xmlToHTML` or further downstream. The branch is in `importXmlFromText`.
- **Do not** add a UI surface ("Imported as editor-origin / foreign"). Silent behavioral switch. The user will only notice it's working better.
- **Do not** touch the lossless dev `importRoundtripXml` path ([apps/editor/src/lib/importXml.ts:150](apps/editor/src/lib/importXml.ts#L150)). It already trusts the data-* mirrors by construction.

### Out of scope (deferred)
- **Package (`.zip`) import.** User stated they never want to import a test. A separate plan should *delete* `importQtiPackageFromBlob` and the `.zip` branch in `importXmlFromFile`. Not this plan.
- **Surfacing the marker version downstream.** Out of scope — single-version world.
- **Telemetry on origin detection.** Out of scope.

---

## Phase 1 — Detection helper + branching

**File:** [apps/editor/src/lib/importXml.ts](apps/editor/src/lib/importXml.ts)

### 1a. Add a detection helper

Mirror the shape of `extractMetadata`. Place adjacent to it:

```ts
/**
 * Returns true iff every <qti-item-body> in the XML carries data-lab-editor-version.
 * False if zero item-bodies are present, or any item-body lacks the marker.
 */
function isEditorOriginXml(xmlText: string): boolean {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const bodies = doc.querySelectorAll('qti-item-body');
  if (bodies.length === 0) return false;
  for (const body of bodies) {
    if (!body.hasAttribute('data-lab-editor-version')) return false;
  }
  return true;
}
```

### 1b. Wire the branch into `importXmlFromText`

Add the `roundtripQtiItem` import at the top of the file:
```ts
import { roundtripQtiItem } from '@qti-editor/qti3-item-import';
```

Modify `importXmlFromText` (current body at [importXml.ts:61](apps/editor/src/lib/importXml.ts#L61)):

```ts
export function importXmlFromText(xmlText: string, options: ImportXmlOptions): ImportXmlResult {
  let cleanedXml = cleanXmlText(xmlText);
  const firstLtIndex = cleanedXml.indexOf('<');
  if (firstLtIndex > 0) {
    cleanedXml = cleanedXml.substring(firstLtIndex);
  }

  // Foreign QTI: recover data-* mirrors from native QTI elements before HTML conversion.
  // Editor-origin XML already has them — skip the transform to keep the import lossless.
  const xmlForImport = isEditorOriginXml(cleanedXml)
    ? cleanedXml
    : roundtripQtiItem(cleanedXml);

  const compatibility = migrateHtmlFragment(xmlToHTML(xmlForImport), {
    metadata: { importPath: 'apps/editor/importXmlFromText' },
    preserve: {
      attributeNames: ['rubric-text'],
      elementTags: ['qti-rubric-block'],
    },
  });

  const json = jsonFromHTML(compatibility.document, { schema: options.schema });
  const metadata = extractMetadata(cleanedXml);

  return {
    json,
    metadata,
    compatibility: {
      html: compatibility,
      report: buildCompatibilityReport([
        {
          id: 'xml-import',
          label: metadata.identifier ?? metadata.title ?? 'Imported XML',
          result: compatibility,
        },
      ]),
    },
  };
}
```

**Note:** `extractMetadata` keeps reading from `cleanedXml` (pre-transform). Identifier/title are on `<qti-assessment-item>`, not affected by the interaction transforms.

### 1c. Package dependency

`@qti-editor/qti3-item-import` must be a runtime dep of `@qti-editor/app`. Check [apps/editor/package.json](apps/editor/package.json) — if missing, add it. Sister plans (`qti3-item-import.md`) have likely already done this; verify, don't duplicate.

```sh
rg -n '"@qti-editor/qti3-item-import"' apps/editor/package.json
```

If absent: `pnpm --filter @qti-editor/app add @qti-editor/qti3-item-import@workspace:*`.

---

## Phase 2 — Tests

**File:** new — [apps/editor/src/lib/importXml.test.ts](apps/editor/src/lib/importXml.test.ts) (or extend an existing test file if one exists for this module — grep first).

### 2a. Detection helper unit tests

Three cases:
1. Body with `data-lab-editor-version="1"` → `isEditorOriginXml` returns `true`.
2. Body without the attribute → returns `false`.
3. Mixed (one body has it, another doesn't) → returns `false`.
4. No `<qti-item-body>` at all → returns `false`.

The helper is private — either export it under `__test__` or write the assertions against `importXmlFromText`'s behavior (preferred). For preferred path, see 2b.

### 2b. Integration: `importXmlFromText` branches

Build two fixtures:
- **`editor-origin-choice-item.xml`** — a `<qti-assessment-item>` whose `<qti-item-body>` carries all three data-* attrs *and* whose `<qti-choice-interaction>` already has `data-correct-response="choice-a"`. (Easiest way: run a known PM doc through `qtiItemFromProsemirror` once and freeze the output.)
- **`foreign-choice-item.xml`** — the same item but with no `data-lab-editor-version` on item-body and no `data-correct-response` on the interaction; correct-response lives only in `<qti-correct-response>`.

Assertions:
- Both produce a PM doc whose `qti-choice-interaction` node has `correctResponse: 'choice-a'` (or whatever the node attr is called — check the schema).
- For editor-origin, `roundtripQtiItem` is **not** called. Stub or spy via `vi.mock('@qti-editor/qti3-item-import', ...)`.
- For foreign, `roundtripQtiItem` **is** called exactly once.

### 2c. Regression: round-trip on editor-origin

Real round-trip assertion: `exportItem(node)` → `importXmlFromText` of that output → resulting PM JSON `.eq` the original `node.toJSON()`. This is the "marker actually buys lossless round-trip" claim under test.

If the equality is too brittle (e.g., attribute ordering, whitespace), assert per-interaction: every interaction in the round-tripped doc has the same `correctResponse` (and other roundtripped attrs) as the original.

---

## Phase 3 — Verification

1. **Grep guards (run from repo root):**
   ```sh
   rg -n "isEditorOriginXml" apps/editor/src/lib/importXml.ts   # expect: 1 definition + 1 call
   rg -n "roundtripQtiItem"  apps/editor/src/lib/importXml.ts   # expect: 1 import + 1 call
   rg -n "data-lab-editor-version" apps/editor/                  # expect: 1 hit (detection helper)
   ```

2. **Manual smoke test (running app):**
   - **Editor-origin path:** Create item → `Export qti3 item` → `Import QTI XML` of the saved file → editor state matches original, including correct-response on every interaction.
   - **Foreign QTI path:** Take a `qti-choice-interaction` sample from `@qti-components` fixtures (or hand-author one with `<qti-correct-response><qti-value>choice-a</qti-value></qti-correct-response>` but **no** `data-correct-response`) → `Import QTI XML` → editor shows the correct choice as checked.
   - **Mixed/unmarked body:** Drop the `data-lab-editor-version` attr by hand from a previously-exported item; re-import; assert it now goes through the transform path (e.g., add a temporary `console.log` in the foreign branch, or rely on the test in 2b).

3. **Tests:**
   ```sh
   pnpm vitest run apps/editor/src/lib/importXml
   pnpm vitest run packages/qti/qti3-item-import
   ```

4. **Typecheck:**
   ```sh
   pnpm --filter @qti-editor/app exec tsc --noEmit
   ```

---

## Risks & open questions

- **Performance:** `DOMParser` runs twice on every import (once in `extractMetadata`, once in `isEditorOriginXml`). Acceptable — the parse is fast and only happens on user action. If profiling later shows it matters, fold into a single helper that returns `{ metadata, isEditorOrigin }`.
- **Migrated/old editor exports.** Files exported *before* this marker existed won't carry it → they'll go through the foreign-QTI branch. Result: the transforms run defensively and produce the right outcome. No data loss.
- **What if `roundtripQtiItem` throws on edge inputs?** Today no caller catches its errors. Decision: don't add a try/catch here either — let the error propagate to `openXmlFilePicker`'s existing reject path. If real-world users hit it, a follow-up wraps it in a friendly error.
- **Does `migrateHtmlFragment` strip `data-lab-editor-version` from the resulting HTML?** Either outcome is fine — by the time we'd care, we've already branched. But worth a sanity check during 2b.

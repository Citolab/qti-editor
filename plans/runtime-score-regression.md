# Plan: Runtime player regression — full kennisnet coverage

> This plan supersedes two earlier drafts (in git history). The key correction:
> all assertions live in `*.regression.browser.test.ts` files using
> `userEvent` from `vitest/browser` — verified that Storybook `play`
> functions use synthetic events from `@testing-library/user-event` (via
> `storybook/test`), which ProseMirror does not reliably respond to. Stories
> remain visualization-only.

## Goal

Cover **every kennisnet item (ITEM001–ITEM017)** with a uniform two-file regression pair:

- `*.regression.stories.ts` — Storybook story plus exported building-block helpers (importItemXXX, exportAssessmentItemDoc, mountEditor).
- `*.regression.browser.test.ts` — vitest browser tests that own all assertions.

**Location:** all story + test files live at **`apps/e2e/stories/`**, not in the example app. `apps/qti-prosemirror-item/` stays lean as a copy-pasteable starter that partners can fork. `apps/e2e/` is never published. The few cross-app imports (e.g. `attributesPanelPlugin`) are relative imports back into the example app — no published package needed, the example stays the canonical source.

Two test cases per item:

1. **Structural snapshot** — import → export → `expect(xml).toMatchFileSnapshot('__file_snapshots__/ITEMxxx-editor.xml')`. Replaces hand-maintained `-editor.xml` fixtures with vitest-managed snapshots; `pnpm vitest --update` regenerates them as a normal review-the-diff step.
2. **Runtime player score** — render the exported XML in an isolated iframe with `@citolab/qti-components`, click/stage the correct answer, call `processResponse()`, assert `getOutcome('SCORE').value === '1'`.

Future scenarios (edit score → re-export → player, add interaction → re-export → player) slot in as new tests in the same browser-test file. No new files for those.

---

## Phase 0 — Documentation discovery (DONE — captured below)

### Event fidelity verdict

- **`userEvent` from `vitest/browser`** (v4.1.3) routes through Playwright's CDP → **trusted/real events**. ProseMirror responds correctly.
- **`userEvent` from `storybook/test`** re-exports `@testing-library/user-event` → **synthetic events** (`element.dispatchEvent`). ProseMirror's contenteditable + keymap handlers may ignore these.

Both run under the same vitest+playwright stack (`vitest.config.ts:34-52`). The import path determines the dispatch path. `.storybook/vitest.setup.ts` does not patch this.

Implication: **All assertions that drive ProseMirror must live in `vitest/browser` tests, not Storybook `play` functions.** The clean line is: stories visualize, tests assert. Runtime-player click on `<qti-simple-choice>` doesn't strictly need trusted events, but consolidating all assertions in one place keeps the mental model simple.

### Runtime API (`<qti-assessment-item>` from `@citolab/qti-components`)

Source: `/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-elements/src/components/qti-assessment-item/qti-assessment-item.ts`

- `processResponse(countNumAttempts = true, reportValidityAfterScoring = true): boolean` — line 330.
- `getOutcome(identifier).value` — line 373. String.
- `updateResponseVariable(identifier, value)` — line 394. Programmatic alternative to UI clicks.
- User clicks bubble `qti-interaction-response` events — line 259.

Verified working pattern from `qti-assessment-item.spec.ts:55-105`:

```ts
assessmentItem.updateResponseVariable('RESPONSE', 'ChoiceA');
assessmentItem.processResponse();
expect(+assessmentItem.getOutcome('SCORE').value).toBe(1);
```

### Bootstrap

One module import side-effect-registers every interaction. The umbrella package re-exports all sub-packages (`packages/qti-components/src/index.ts:1-8`).

```js
import * as QTI from '@citolab/qti-components';
```

For the test harness, the iframe references **vendored-local** copies of the runtime files (not unpkg) — see Phase 2.

### Isolation primitive

An `<iframe srcdoc>` has an independent `contentWindow.customElements` registry per web platform spec — the only way to register the runtime versions of `qti-choice-interaction` (etc.) without colliding with the editor's already-registered wrappers in the parent realm.

### Anti-patterns

- ❌ Don't `import '@citolab/qti-components'` at top level of any file that runs in the editor's window.
- ❌ Don't use `document.implementation.createDocument(...)` — shares the parent's `customElements`.
- ❌ Don't put runtime-player assertions in story `play` functions — keep them in `.browser.test.ts`.
- ❌ Don't try to assert ProseMirror keystroke flows via Storybook play — synthetic events don't reach PM reliably.

### Kennisnet inventory (current state)

| Item | Interaction | source `.xml` | `-editor.xml` fixture | story file | test file |
|---|---|---|---|---|---|
| ITEM001 | choice | ✓ | ✓ (hand-maintained) | ✓ | ✓ |
| ITEM002 | choice | ✓ | ✓ (hand-maintained) | ✓ | ✓ |
| ITEM003 | text-entry | ✓ | ✓ (hand-maintained) | ✓ | ✓ |
| ITEM004 | text-entry | ✓ | ✓ (hand-maintained) | ✓ | ✓ |
| ITEM005 | extended-text | ✓ | ✓ (hand-maintained) | ✓ | ✓ |
| ITEM006 | inline-choice | ✓ | ✗ | ✓ | ✗ |
| ITEM007 | match | ✓ | ✗ | ✗ | ✗ |
| ITEM008 | match | ✓ | ✗ | ✗ | ✗ |
| ITEM009 | match | ✓ | ✗ | ✗ | ✗ |
| ITEM010 | match | ✓ | ✗ | ✗ | ✗ |
| ITEM011 | hottext | ✓ | ✗ | ✗ | ✗ |
| ITEM012 | hottext | ✓ | ✗ | ✗ | ✗ |
| ITEM013 | order | ✓ | ✗ | ✗ | ✗ |
| ITEM014 | order | ✓ | ✗ | ✗ | ✗ |
| ITEM015 | gap-match | ✓ | ✗ | ✗ | ✗ |
| ITEM016 | select-point | ✓ | ✗ | ✗ | ✗ |
| ITEM017 | associate | ✓ | ✗ | ✗ | ✗ |

**Snapshot location for the new plan:** all `-editor.xml` files live at
`apps/e2e/stories/__file_snapshots__/ITEMxxx-editor.xml` (alongside the
relocated test files — see Phase 1). The current 5 hand-maintained fixtures
in `public/qti/kennisnet/` get migrated in Phase 1 (relocation), then
Phase 3 switches the tests from `?raw` imports to `toMatchFileSnapshot`
against the new path.

---

## Phase 1 — Relocate existing stories/tests to `apps/e2e/stories/`

This phase is mechanical and zero-content-change. It establishes the new home before the substantive work in later phases.

### Steps

1. **Move 11 existing files** from `apps/qti-prosemirror-item/stories/` to `apps/e2e/stories/`:
   - 6 `*.regression.stories.ts`
   - 5 `*.regression.browser.test.ts` (ITEM006 has no test file yet)
2. **Update imports inside the moved files.** Two kinds of import paths need to change:
   - `from '../src/components/attributes-panel-plugin'` → `from '../../qti-prosemirror-item/src/components/attributes-panel-plugin'`
   - Any other `from '../src/...'` import → same shape (prefix with `../../qti-prosemirror-item/`).
   - `@qti-editor/example-items/*.xml?raw` imports stay as-is — they go through the workspace tsconfig alias.
3. **Move the 5 existing `-editor.xml` fixtures** from `public/qti/kennisnet/` to `apps/e2e/stories/__file_snapshots__/`. (Phase 3 will switch the tests to `toMatchFileSnapshot` against this new path.)
4. **Verify `vitest.config.ts` browser-project `include` covers the new location.** The current pattern `apps/**/src/**/*.browser.test.ts` does **not** match `apps/e2e/stories/*.browser.test.ts` — extend to `apps/**/{src,stories}/**/*.browser.test.ts` or similar. Test by running the existing 5 tests in the new location.

### Verification

- `ls apps/qti-prosemirror-item/stories/ 2>&1` returns "No such file or directory" (or the dir exists but is empty).
- `ls apps/e2e/stories/*.regression.{stories,browser.test}.ts | wc -l` returns 11.
- `pnpm vitest run --project browser` — all 5 existing tests pass from their new location.
- `grep -rn "from '\.\./src/" apps/e2e/stories/` returns 0 hits (all relative imports now point at sibling apps).

### Anti-pattern guards

- ❌ Don't copy `attributes-panel-plugin.ts` into apps/e2e — relative import keeps one source of truth.
- ❌ Don't change anything inside `apps/qti-prosemirror-item/src/` during this phase — relocation only.
- ❌ Don't move the existing `apps/e2e/stories/assessment-test.stories.ts` — that's its own thing, leave alone.

---

## Phase 2 — Runtime harness + local vendoring

### 1a. Vendor the runtime locally — pinned to the qti-components branch

The runtime must be **the same code as the rest of the qti-components packages the editor consumes** — i.e. pinned to `breaking-changes-for-editor-release` while that branch is active, not to whatever's published on npm. We use the existing yalc + packs infrastructure (see [docs/syncing-with-qti-components.md](docs/syncing-with-qti-components.md)) rather than inventing a parallel mechanism.

> **Status:** transitional. While the editor consumes the
> `breaking-changes-for-editor-release` branch, `@citolab/qti-components`
> lives behind the yalc + packs override exactly like the per-package
> `@qti-components/*` deps. Once that branch lands and qti-components ships a
> release containing the breaking changes, set `enabled: false` in
> `pnpm-local-overrides.json` (or delete it entirely), update the package.json
> range to the new published version, and `pnpm install`. The runtime then
> resolves from npm. Phase 2a is removable at that point; the harness and
> the rest of the test surface stay as-is.

**Steps:**

1. Add `@citolab/qti-components` as a devDep of `apps/qti-prosemirror-item`:
   ```sh
   pnpm --filter @qti-editor/prosemirror-item add -D @citolab/qti-components
   ```
   The `package.json` version range can be e.g. `"^7.28.1"` — that's the **fallback** when no override is active (fresh clones without yalc or packs setup).
2. **Add `@citolab/qti-components` to the existing yalc + packs pipeline.** Two edits:
   - `scripts/yalc-init.mjs` — add `@citolab/qti-components` to the `apps/qti-prosemirror-item` consumer's package list so `pnpm yalc:init` (first-time setup) links it.
   - From an interactive dev session: `cd apps/qti-prosemirror-item && yalc add @citolab/qti-components` so the current setup picks it up too.
   - On commit: `pnpm qti-overrides:snapshot` captures the SHA pin. **One small code change required** — the snapshot script's `collectYalcLinkedPackages` currently filters by `name.startsWith('@qti-components/')` only. Extend it to also accept `@citolab/qti-components` (or generalise to "any name present in `scanQtiComponentsPackagePaths()`'s output", which already handles both prefixes since it walks the qti-components workspace and reads each package.json `name`).

3. **What teammates and CI get:** `pnpm install` triggers the `.pnpmfile.cjs` self-heal, which auto-syncs the SHA-pinned tarball for `@citolab/qti-components` along with the others. No special steps.

4. Add a copy step to surface the dist files at the dev-server static path:
   ```sh
   # apps/qti-prosemirror-item/package.json
   "scripts": {
     "vendor:qti-runtime": "mkdir -p public/qti-runtime && cp node_modules/@citolab/qti-components/dist/index.js public/qti-runtime/ && cp node_modules/@citolab/qti-components/dist/item.css public/qti-runtime/",
     "test": "pnpm vendor:qti-runtime && vitest run",
     "dev": "pnpm vendor:qti-runtime && vite"
   }
   ```
   Or implement as a vitest `globalSetup` if you prefer a JS hook over a shell step.

3. Add `apps/qti-prosemirror-item/public/qti-runtime/` to `.gitignore` — it's a build artifact regenerated on every install/test.

### 1b. Create the harness

**Create:** `apps/qti-prosemirror-item/stories/runtime-harness.ts`

**Export:**

```ts
export interface RuntimeHarness {
  iframe: HTMLIFrameElement;
  assessmentItem: HTMLElement;
  doc: Document;
  win: Window;
  destroy(): void;
}

export async function mountQtiRuntime(itemXml: string): Promise<RuntimeHarness>;
```

**Recipe:**

1. `document.createElement('iframe')`, append to `document.body`. Style `border:0; width:800px; height:600px`.
2. Build `srcdoc`:
   ```html
   <!doctype html>
   <html>
     <head>
       <link rel="stylesheet" href="/qti-runtime/item.css">
       <script type="module">
         import * as QTI from '/qti-runtime/index.js';
         window.__QTI_READY__ = true;
       </script>
     </head>
     <body>${itemXml}</body>
   </html>
   ```
   Strip XML prolog (`<?xml ... ?>`) from `itemXml` before passing. `/qti-runtime/...` is resolved by Vite's `publicDir` mapping (already pointed at `apps/qti-prosemirror-item/public`).
3. `iframe.srcdoc = html`. Use `srcdoc`, not blob URL.
4. `await once(iframe, 'load')`.
5. Poll `iframe.contentWindow.__QTI_READY__` (max ~5s).
6. `await iframe.contentWindow.customElements.whenDefined('qti-assessment-item')`.
7. `const assessmentItem = iframe.contentDocument.querySelector('qti-assessment-item')!`.
8. Microtask for Lit first render.
9. Return harness; `destroy()` removes the iframe.

**Verification:**

- `ls apps/qti-prosemirror-item/public/qti-runtime/` shows `index.js` + `item.css` after running `pnpm vendor:qti-runtime`.
- Throwaway test with a minimal `<qti-assessment-item>` HTML returns a harness without throwing.
- Two calls in the same test do not throw "this name has already been used."
- Disconnect from the network → tests still pass.

**Anti-pattern guards:**

- ❌ No module-level import of `@citolab/qti-components` in this file (would register custom elements in the editor's own window, conflict).
- ❌ No `https://unpkg.com/...` URLs in the srcdoc (would require network at test time and pin a version we can't control locally).
- ❌ Don't query the assessment-item before `whenDefined` resolves.

---

## Phase 3 — Migrate 5 covered items to `toMatchFileSnapshot` + add runtime score test

**Modify:** each of `qti-choice-interaction-item001.regression.browser.test.ts`, `…item002…`, `qti-text-entry-interaction-item003…`, `…item004…`, `qti-extended-text-interaction-item005…`.

### 2a. Migrate the structural snapshot

For each file:

1. Move `public/qti/kennisnet/ITEMxxx-editor.xml` → `apps/qti-prosemirror-item/stories/__file_snapshots__/ITEMxxx-editor.xml` (one git mv per file).
2. Remove the `import assertedXML from '@qti-editor/example-items/ITEMxxx-editor.xml?raw'` line.
3. Replace the assertion:
   ```ts
   // before:
   const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');
   expect(exported).toEqualXmlDoc(expected);

   // after:
   const exportedXml = new XMLSerializer().serializeToString(exported);
   await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEMxxx-editor.xml');
   ```
4. Run `pnpm vitest run --project browser path/to/<file>.browser.test.ts`. First run should pass (the snapshot matches the file we just moved). If it fails, run once with `--update` to absorb formatter / whitespace differences between `toEqualXmlDoc` (semantic) and `toMatchFileSnapshot` (textual). Diff carefully — any structural change is real and worth investigating.

### 2b. Add runtime score test

**Add** to the same file (do not modify existing tests):

```ts
import { mountQtiRuntime } from './runtime-harness';

test('runtime scores 1 after correct answer in ITEM00X', async () => {
  const exported = exportAssessmentItemDoc(importItemXXX());
  const xml = new XMLSerializer().serializeToString(exported);

  const { assessmentItem, doc, destroy } = await mountQtiRuntime(xml);

  // Pick correct (see per-item table below)
  // ... click or updateResponseVariable ...

  (assessmentItem as any).processResponse();
  expect(+(assessmentItem as any).getOutcome('SCORE').value).toBe(1);

  destroy();
});
```

### Per-item correct-answer recipe

| Item | Interaction | How to pick correct |
|---|---|---|
| ITEM001 | choice (single) | `doc.querySelector('qti-simple-choice[identifier="choice3"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))` |
| ITEM002 | choice (multi) | Same `dispatchEvent` shape, one click per correct identifier read from source |
| ITEM003 | text-entry | `(assessmentItem as any).updateResponseVariable('RESPONSE', '<correct-string>')` |
| ITEM004 | text-entry | same |
| ITEM005 | extended-text | No auto-scoring. Test asserts `SCORE` stays `0` after `processResponse()` — proves the pipeline doesn't leak a spurious score. |

For choice items, `correctResponse` is in the source XML; either read it via the existing import helper or hardcode the identifier with a comment pointing at the source line.

**Verification:**

- `pnpm vitest run --project browser` — 5 new tests pass.
- Existing tests in the same files still pass.

---

## Phase 4 — Complete ITEM006 (inline-choice)

ITEM006 has a story file but no test file and no snapshot.

### Steps

1. **Verify the story file** exports the same shape (`importItem006`, `exportAssessmentItemDoc`, `mountEditor`) as the others. Patch if needed.
2. **Create `qti-inline-choice-interaction-item006.regression.browser.test.ts`** following the same pattern as item001/002. Two tests:
   - Structural snapshot: `await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM006-editor.xml')`. Run with `--update` once to generate the file. Open the generated XML, sanity-check it, commit.
   - Runtime score: `updateResponseVariable('RESPONSE', '<correct>')` → `processResponse` → assert 1.

**Verification:**

- `pnpm vitest run --project browser apps/qti-prosemirror-item/stories/qti-inline-choice-interaction-item006.regression.browser.test.ts` passes both tests.
- `apps/qti-prosemirror-item/stories/__file_snapshots__/ITEM006-editor.xml` exists, contains valid QTI XML, was reviewed manually before commit.

---

## Phase 5 — Pilot new interaction: ITEM007 (match)

This is the first item from an *uncovered* interaction family. Validate the recipe end-to-end before fanning out to the remaining 10.

### Steps

1. **Create `qti-match-interaction-item007.regression.stories.ts`** — copy the structure of `qti-choice-interaction-item001.regression.stories.ts`. Swap the imports for match's `roundtripMatch` (verify the name in `@citolab/prose-qti/qti3-item-import`) and `matchInteractionDescriptor`.
2. **Create `qti-match-interaction-item007.regression.browser.test.ts`** with the two tests:
   - Structural: `await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM007-editor.xml')`. Run with `--update` once. Manually review the generated snapshot for sanity (the structure matches what you'd expect a match-interaction round-trip to produce). Commit.
   - Runtime score: the match interaction's response is an array of `"sourceId targetId"` pairs. Use `updateResponseVariable('RESPONSE', [...pairs])` rather than trying to drive drag-drop UI cross-realm. Read the correct pairs from `ITEM007.xml`'s `<qti-correct-response>`.

### Verification

- Both tests pass.
- A non-headless run shows the match interaction render correctly in the iframe (visual sanity check).

### Anti-pattern guards specific to match

- ❌ Don't try to simulate drag events cross-realm — even with trusted events, drag-drop is brittle. `updateResponseVariable` is the right tool.
- ❌ Don't reuse the same `RESPONSE` identifier convention for all items — read it from the source XML (some items use multiple response variables).

---

## Phase 6 — Extend to remaining 10 items (ITEM008–017)

Apply the Phase 5 pattern. Per item:

| Item | Interaction | Click path | Notes |
|---|---|---|---|
| ITEM008 | match | `updateResponseVariable(..., [pairs])` | |
| ITEM009 | match | same | |
| ITEM010 | match | same | check if tabular variant — affects class on the host but not response shape |
| ITEM011 | hottext | `updateResponseVariable(..., [hottextIds])` OR click each `qti-hottext` element | hottext is reasonably click-friendly cross-realm |
| ITEM012 | hottext | same | |
| ITEM013 | order | `updateResponseVariable(..., [orderedIds])` | order's drag UI is unreasonable cross-realm |
| ITEM014 | order | same | |
| ITEM015 | gap-match | `updateResponseVariable(..., [pairs])` | gap-match drag is unreasonable cross-realm |
| ITEM016 | select-point | `updateResponseVariable(..., [coords])` | OR `dispatchEvent(new MouseEvent('click', {clientX, clientY, …}))` if cleaner |
| ITEM017 | associate | `updateResponseVariable(..., [pairs])` | |

For each: create the stories file, create the test file, run with `--update` to generate the snapshot, manually review the snapshot for sanity, commit. Pattern is identical to Phase 5 — only the interaction-specific imports and response shape change.

### Helpers worth extracting (after Phase 5 reveals duplication)

If you find yourself copy-pasting the same structure 10 times, factor out:

- `apps/qti-prosemirror-item/stories/regression-template.ts` exporting `createRegressionTests({ itemId, interactionTag, correctResponse, … })`. Each per-item test file becomes one `createRegressionTests(...)` call.
- A `readCorrectResponseFromXml(xml: string, responseId: string)` helper so individual tests don't hardcode correct-answer identifiers.

Only do this **after Phase 5** — premature factoring is worse than copy-paste in a 10-item rollout.

### Verification

- All 17 items have a green structural-snapshot test AND a green runtime-score test (extended-text has the "score stays 0" variant).
- `pnpm vitest run --project browser` runs the full suite in <60s (rough budget).
- `ls apps/qti-prosemirror-item/stories/__file_snapshots__/ITEM*-editor.xml | wc -l` returns 17.

---

## Phase 7 — Optional: visual `Player` story per item

Once all tests pass, add **one optional `Player` story** per item file. Purpose: visual demo only, no `play` function.

```ts
export const Player: Story = {
  name: 'Exported XML rendered in @citolab/qti-components player',
  render: () => {
    const container = document.createElement('div');
    const xml = new XMLSerializer().serializeToString(exportAssessmentItemDoc(importItemXXX()));
    mountQtiRuntime(xml).then(({ iframe }) => container.appendChild(iframe));
    return container;
  },
};
```

This gives anyone opening Storybook a one-click way to see the runtime render — useful for design review, sanity checks, and debugging when a test fails. **The story carries no assertions** — those stay in the browser test files.

---

## Phase 8 — Future scenarios (design-in, no code yet)

These extend the same files — no new files, no new test runners.

### "Edit score from 1 to 5"

Add to `qti-choice-interaction-item001.regression.browser.test.ts`:

```ts
test('runtime scores 5 after editing item to score=5 and clicking correct', async () => {
  const doc = setInteractionScore(importItem001(), 'RESPONSE', 5);
  const xml = serialize(exportAssessmentItemDoc(doc));
  const { assessmentItem, doc: iframeDoc } = await mountQtiRuntime(xml);
  iframeDoc.querySelector('qti-simple-choice[identifier="choice3"]')!.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true })
  );
  (assessmentItem as any).processResponse();
  expect(+(assessmentItem as any).getOutcome('SCORE').value).toBe(5);
});
```

New helper `setInteractionScore(doc, responseId, score)` lives in the PM helpers module (write once, reuse across items).

### "Add another interaction"

Same shape: new helper `addInteraction(doc, kind, args)`, new test that mounts the result and checks the combined SCORE.

### "Edit via the editor UI then re-export"

This is the path that **needs trusted events**. Use vitest/browser's `userEvent` to drive the editor mounted by `mountEditor(host, …)`:

```ts
test('clicking choice2 in editor exports cardinality=multiple', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = mountEditor(host);
  const choice = await findByShadowText(host, 'Jodium (I)');
  const control = choice.closest('qti-simple-choice')!.shadowRoot!.querySelector<HTMLElement>('[part="ch"]')!;
  await userEvent.click(control);   // ← vitest/browser userEvent, trusted
  // ... assert exported state
});
```

This pattern already exists in `qti-choice-interaction-item001.regression.browser.test.ts:20-47`. Future scenarios that drive the editor follow exactly the same pattern.

---

## Phase 9 — Verification

1. **All tests green:** `pnpm vitest run --project browser` — full suite.
2. **Editor stories still work:** `pnpm vitest run --project storybook` — no regressions.
3. **No accidental cross-realm imports:** `grep -rn "from '@citolab/qti-components'" apps/qti-prosemirror-item/ packages/prose-qti/src/components/` — should hit only the `runtime-harness.ts` string literal (inside srcdoc), never an actual import.
4. **Registry hygiene visual check:** non-headless run, open browser devtools, run two runtime-player tests back-to-back, console must NOT show "this name has already been used."
5. **Snapshot freshness:** `git diff apps/qti-prosemirror-item/stories/__file_snapshots__/` after a clean `pnpm vitest run --project browser` should be empty. If anything mutated, a snapshot is out of date — investigate before regenerating.
6. **Snapshot-update review habit:** when a legitimate composer change requires regenerating snapshots, run `pnpm vitest --update`, inspect the diff in `__file_snapshots__/` per item, and commit them in the same PR as the code change. Reviewers see exactly which items the change rippled into.

---

## Open questions to resolve before executing

- **Runtime source of truth:** Phase 2a vendors `@citolab/qti-components` via the editor's normal dep chain (yalc-linked during active dev, npm in CI). No `@next` pin, no unpkg. The vendored files live at `apps/qti-prosemirror-item/public/qti-runtime/` and are regenerated by `pnpm vendor:qti-runtime` (which the `test` and `dev` scripts call). This handles both "local dev" and "offline CI" cleanly.
- **Fixture generation tooling:** ~obviated.~ `toMatchFileSnapshot('--update')` IS the generator. No standalone script needed. The manual sanity-check is "open the generated file and read the diff once per new item."
- **ITEM016 select-point coordinates:** the runtime's response payload for a click at `(x, y)` is `"x y"` strings per the QTI spec. Read the correct coordinates from source XML, confirm the encoding matches what the runtime expects, and decide whether to dispatch a real MouseEvent at the right coordinates or use `updateResponseVariable` with the literal string.

---

## Summary of footprint

| What | How much |
|---|---|
| New helper file | 1 (`runtime-harness.ts`, ~80 lines) |
| New devDep | 1 (`@citolab/qti-components` in `apps/qti-prosemirror-item`) |
| New build/test scripts | 1 (`vendor:qti-runtime` + `test`/`dev` updates) |
| New gitignore entry | 1 (`apps/qti-prosemirror-item/public/qti-runtime/`) |
| Per-item story files added | 11 (ITEM006 patched, ITEM007–017 new) |
| Per-item browser-test files added | 11 |
| Per-item `__file_snapshots__/ITEMxxx-editor.xml` snapshots | 12 new (auto-generated by `--update`) + 5 migrated from `public/qti/kennisnet/` |
| Optional Player story added per item | 17 (Phase 7) |
| Total new test cases | ~34 (17 pipeline + 17 runtime) |
| Files touched but not added | 5 (existing ITEM001–005 browser-test files, one new test each) |

This is the smallest reasonable footprint to get end-to-end runtime regression coverage across the kennisnet corpus. Anything bigger is scope creep; anything smaller leaves uncovered interactions silently broken.

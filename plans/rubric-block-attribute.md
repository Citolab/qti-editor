# Plan: Promote `rubric-block` to a first-class non-QTI attribute

## Goal

Today the `qti-extended-text-interaction` element stores rubric/model-answer text in the PM node attribute `rubricScoringBlock`, but serializes it on the DOM as `correct-response="..."` ([qti-extended-text-interaction.schema.ts:37,60](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.ts#L37)) — overloading the standard QTI meaning of `correct-response` ("the correct answer"). This collides badly with any external QTI consumer or converter, and is the only interaction-specific surprise in the otherwise consistent non-QTI attribute system.

Rename the DOM attribute on extended-text to `rubric-block`, and **declare `rubric-block` as a reusable non-QTI attribute** in the unified registry — so any future interaction that needs to carry a rubric / model answer / grader-facing text (e.g. an upload or drawing interaction added later) can opt in with one line.

## Prerequisites

- [plans/unify-non-qti-attribute-metadata.md](plans/unify-non-qti-attribute-metadata.md) **must ship first** — this plan declares `rubric-block` using the unified `NonQtiAttribute` shape from Phase 2 of that plan. Without unification, the rename still works but is more code (touches three hardcoded mapping tables instead of one declaration).

## Scope guardrails

- Rename is **DOM-attribute-only**, scoped to `qti-extended-text-interaction`. Other interactions' `correct-response` attribute is untouched.
- The PM node attribute name stays `rubricScoringBlock` — that rename happened previously (v2→v3 JSON migration) and isn't revisited here.
- The data-* mirror name becomes `data-rubric-block` automatically (derived by `collectMirrorMappings` from the unified shape).
- Legacy items with `correct-response` on extended-text must migrate to `rubric-block` transparently — new HTML migration step required.
- The `<qti-rubric-block view="scorer" use="scoring">` element synthesis on export is **unchanged**. The strip+mirror behavior on the interaction is what changes; the element-side serialization stays as-is.

---

## Phase 0 — Facts (post-unification state)

### Where extended-text references `correct-response` today

After unification, the references are:

1. [packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.ts:37](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.ts#L37) — `parseDOM`: `parseCorrectResponseAttribute(node.getAttribute('correct-response'))` → populates PM attr `rubricScoringBlock`.
2. [qti-extended-text-interaction.schema.ts:60](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.ts#L60) — `toDOM`: `attrs['correct-response'] = serializeCorrectResponseAttribute(node.attrs.rubricScoringBlock);`
3. [qti-extended-text-interaction.ts:124](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.ts#L124) — Lit `@property({type: String, attribute: 'correct-response'})` on the `rubricScoringBlock` field.
4. [qti-extended-text-interaction.compose.ts:52](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.compose.ts#L52) — `sourceElement.getAttribute('correct-response')` to populate the variable that drives `<qti-rubric-block>` synthesis (lines 21-40).
5. [packages/prosemirror/interaction-extended-text/src/composer/metadata.ts:17](packages/prosemirror/interaction-extended-text/src/composer/metadata.ts#L17) — `nonQtiAttributes` includes `'correct-response'` (post-unification: probably still as a plain string after the unification rewrite, OR as an object with `aliases` if extended-text matches the unification convention).
6. `packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.test.ts:82` — fixture: `'correct-response': 'rubric-1'`.
7. `packages/prosemirror/interaction-extended-text/src/interaction-extended-text.stories.ts:29` — fixture: `correct-response="..."` in story HTML.

### Existing migrations (precedent)

[packages/prosemirror/extensions/src/compatibility/migrations.ts:113-136](packages/prosemirror/extensions/src/compatibility/migrations.ts#L113-L136) has a JSON migration `v2→v3` renaming PM attr `correctResponse` → `rubricScoringBlock` ONLY on `qtiExtendedTextInteraction`. That migration is the right precedent for the new HTML migration this plan adds — same scoping (extended-text only), same versioning model.

### What other interactions use `correct-response` for

All other QTI interactions (choice, inline-choice, text-entry, associate, match, gap-match, order, hottext, select-point) use `correct-response` for its standard QTI meaning: the correct answer. Their parseDOM/toDOM, compose, and schemas continue to do so. The rename does NOT touch them.

### Reuse story

After this plan, `rubric-block` is a registered non-QTI attribute. The unified shape allows any other interaction to declare it:

```ts
nonQtiAttributes: ['correct-response', 'rubric-block', 'score'],
```

That single line gives the interaction:
- `rubric-block` is stripped from the QTI output element (clean QTI 3.0).
- `data-rubric-block` is mirrored automatically.
- The roundtrip-import inverse map picks it up automatically (via `getAllMirrorTargets`).

The actual *handling* of the rubric (synthesizing a `<qti-rubric-block>` element, reading it on import, rendering it in the UI) remains per-interaction logic, but the attribute plumbing is free.

---

## Phase 1 — Schema + Lit element + compose

### What to edit

1. **`qti-extended-text-interaction.schema.ts`** (2 edits):
   - Line 37: `node.getAttribute('correct-response')` → `node.getAttribute('rubric-block')`.
   - Line 60: `attrs['correct-response'] = cr;` → `attrs['rubric-block'] = cr;`.

2. **`qti-extended-text-interaction.ts:124`**: change `@property({type: String, attribute: 'correct-response'})` → `@property({type: String, attribute: 'rubric-block'})`.

3. **`qti-extended-text-interaction.compose.ts:52`**: change `sourceElement.getAttribute('correct-response')` → `sourceElement.getAttribute('rubric-block')`. The local variable name (`correctResponse`) can stay or be renamed to `rubricBlock` — recommend renaming for clarity.

4. **`composer/metadata.ts`**: in `nonQtiAttributes`, replace `'correct-response'` (or its object form if Phase 3 of unification chose object form for this entry) with `'rubric-block'`. Keep array alphabetical.

5. **Test fixtures**:
   - `schema.test.ts:82`: `'correct-response': 'rubric-1'` → `'rubric-block': 'rubric-1'`.
   - `interaction-extended-text.stories.ts:29`: `correct-response="..."` → `rubric-block="..."`.

### Verification

- `pnpm --filter @qti-editor/interaction-extended-text typecheck` green.
- `pnpm --filter @qti-editor/interaction-extended-text test` green.

### Anti-patterns

- Do NOT do a workspace-wide find/replace of `correct-response`. Scope every edit to extended-text-specific files.
- Do NOT rename the PM node attribute `rubricScoringBlock`. That stays.
- Do NOT touch the compose handler's `<qti-rubric-block>` synthesis logic (the `createRubricBlock` function at lines 21-40). It still triggers when the source attribute has a value — only the source attribute name changes.

---

## Phase 2 — HTML migration step for legacy DOM items

### What to do

Add a new HTML migration step that renames `correct-response` → `rubric-block` **only on `qti-extended-text-interaction` elements**. This ensures items saved before this rename load correctly.

### File to edit

`packages/prosemirror/extensions/src/compatibility/migrations.ts`:

1. Bump the HTML version constant (find it near `HTML_MIGRATION_STEPS` array; same pattern as the existing JSON v2→v3 step).
2. Add a new entry to `HTML_MIGRATION_STEPS`:

```ts
{
  id: 'html-vN-to-vN+1-extended-text-correct-response-to-rubric-block',
  fromVersion: N,
  toVersion: N + 1,
  description: 'On qti-extended-text-interaction, rename DOM attr correct-response → rubric-block. Other interactions are not touched.',
  transforms: [
    (html, addChange) => {
      // Walk the parsed DOM; only edit qti-extended-text-interaction elements.
      // Use the same DOMParser/serializer pattern as existing HTML transforms in this file.
      // For each matching element with `correct-response`, copy the value to `rubric-block`
      // and remove `correct-response`.
      // Call addChange({code: 'RENAME_ATTRIBUTE', attributeName: 'rubric-block', ...}).
    },
  ],
}
```

(Replace `N` with whatever the current HTML version constant is. Use the existing `renameLegacyHtmlAttributes` function as a structural reference — but be careful: that function renames camelCase variants globally. The new migration is SCOPED to one tag.)

3. Add a unit test in the existing migrations test file:
   - Input: `<qti-extended-text-interaction correct-response="x"></qti-extended-text-interaction>` → output has `rubric-block="x"`, no `correct-response`.
   - Input: `<qti-choice-interaction correct-response="A"></qti-choice-interaction>` → output is **unchanged** (other interaction).

### Verification

- New unit test passes.
- Existing migration tests still pass.
- `pnpm --filter @qti-editor/prosemirror-extensions test` green.

### Anti-patterns

- Do NOT generalize the migration to "all interactions with rubric-block." Only extended-text had the legacy overload; other interactions never used `correct-response` for rubric content.
- Do NOT skip the test that other interactions are untouched — that's the load-bearing invariant of this migration.

---

## Phase 3 — Update Phase 1 snapshots (expected diffs)

### What to do

Two Phase 1 snapshot tests cover the extended-text fixture:

- `packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts` — extended-text item with `correct-response="Model answer"`.
- `packages/qti/roundtrip-export/src/non-qti-mirror-regex.snapshot.test.ts` — same shape.

After this plan's edits, the fixture sources should use `rubric-block="Model answer"`, and the snapshots should show `data-rubric-block="Model answer"` in the output (mirror) instead of `data-correct-response="Model answer"`.

### Steps

1. Update each snapshot test's extended-text fixture: replace `correct-response="Model answer"` → `rubric-block="Model answer"` in the source XML literal.
2. Re-record snapshots:
   ```bash
   pnpm exec vitest run packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts -u
   pnpm exec vitest run packages/qti/roundtrip-export/src/non-qti-mirror-regex.snapshot.test.ts -u
   ```
3. Review the diff carefully:
   - Source `rubric-block="..."` is stripped from output (not on the interaction element).
   - Output contains `data-rubric-block="Model answer"` mirror.
   - Output still contains the synthesized `<qti-rubric-block view="scorer" use="scoring">` element with the same content.
   - **No occurrence of `correct-response` or `data-correct-response` on `qti-extended-text-interaction`** in either snapshot.
4. Run without `-u` to confirm stable:
   ```bash
   pnpm exec vitest run packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts
   pnpm exec vitest run packages/qti/roundtrip-export/src/non-qti-mirror-regex.snapshot.test.ts
   ```

### Anti-patterns

- Do NOT use `-u` blindly without inspecting the diff. The snapshot diff is the proof that the rename did what it should — if anything unexpected appears (e.g. `correct-response` still showing on the interaction), STOP and investigate.
- Do NOT update snapshots for the OTHER interactions in the same run. Their fixtures don't change; their snapshots must remain byte-identical.

---

## Phase 4 — Documentation

### What to do

Update the subformat doc and the canonical roundtrip spec (if it exists by now) to:
1. Document `rubric-block` as a registered non-QTI attribute.
2. Note that it's currently only used by extended-text but is reusable.
3. Explain the historical `correct-response` overload and the migration.

### Files to edit

1. `apps/site/src/content/docs/packages/itembody-subformat.mdx` — update the "Current non-QTI attribute set" table to include `rubric-block` (used by extended-text) → `data-rubric-block`. Update the "Adding a new non-QTI attribute" section to mention rubric-block as an example of a reusable attribute.
2. Whatever spec doc exists in `apps/site/src/content/docs/packages/` (roundtrip-format-spec if it's been written by then, otherwise just the subformat doc) — same updates.
3. `packages/qti/roundtrip-export/ROUNDTRIP.md` — add a row to the per-tag mapping table for `qti-extended-text-interaction`: `rubric-block` → `data-rubric-block` (replacing whatever row existed for the old `correct-response`-overload behavior on extended-text).

### Verification

- All cross-links resolve.
- The docs site builds (`pnpm --filter site build` or `pnpm --filter site dev` smoke-check).

### Anti-patterns

- Do NOT remove the documentation of `correct-response` for OTHER interactions. They still use it (legitimately, for actual correct answers).
- Do NOT speculate in docs about future interactions using `rubric-block`. Document what is, not what might be.

---

## Phase 5 — Final verification

### Checks

1. **No stale references on extended-text**:
   ```bash
   rg -n "correct-response" packages/prosemirror/interaction-extended-text/
   ```
   Should return ZERO hits. (Other interactions' files still mention it — that's fine.)

2. **Round-trip works**: hand-edit a fixture item with `rubric-block="My rubric"` on an extended-text interaction. Export it via the editor's pipeline. Import the result. Confirm the imported ProseMirror node has `rubricScoringBlock: 'My rubric'`.

3. **Legacy migration works**: feed a legacy item with `correct-response="Old rubric"` on an extended-text interaction through `migrateHtmlFragment`. Confirm the output has `rubric-block="Old rubric"` and the importer can read it.

4. **Other interactions unchanged**: feed a legacy choice item with `correct-response="A"`. Confirm the migration does NOT rename it; the choice interaction still reads `correct-response` as the answer.

5. **All Phase 1 snapshots green** (with the two updated extended-text snapshots, all others byte-identical).

6. **Full test suite**:
   ```bash
   pnpm exec vitest run --project unit
   ```
   All tests pass (modulo pre-existing storybook story failures unrelated to this work).

### Done when

- `correct-response` is gone from extended-text source.
- `rubric-block` is a declared non-QTI attribute with `data-rubric-block` mirror.
- Legacy items still load correctly via the new migration step.
- Docs explain the new attribute and its reusability.

---

## Reuse: declaring `rubric-block` on a future interaction

After this plan, supporting rubrics on a future interaction (e.g. a hypothetical `qti-drawing-interaction` or `qti-upload-interaction`) is:

```ts
// future interaction's composer/metadata.ts
nonQtiAttributes: [
  { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
  'rubric-block',
  'score',
],
```

Plus interaction-specific UI/handling for the rubric content. The mirror plumbing, strip behavior, and import inverse are free — the unified registry handles them.

---

## See also

- [plans/unify-non-qti-attribute-metadata.md](plans/unify-non-qti-attribute-metadata.md) — prerequisite. Establishes the unified `NonQtiAttribute` shape used here.
- [plans/qti3-to-roundtrip-converter.md](plans/qti3-to-roundtrip-converter.md) — follow-up. When the v2 converter eventually adds `roundtripExtendedText()`, it maps the source's sibling `<qti-rubric-block view="scorer" use="scoring">` cleanly to `rubric-block="..."` on the interaction, with no overload to navigate.

## Estimate

- Phase 1 (schema/lit/compose/metadata/fixtures): ~30 min
- Phase 2 (HTML migration step + tests): ~30 min
- Phase 3 (snapshot updates + review): ~15 min
- Phase 4 (docs): ~15 min
- Phase 5 (verification): ~15 min

Total: ~1.75 hours.

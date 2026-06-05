# Replace prosekit flat list with prosemirror-schema-list

**Goal:** Remove `prosekit/extensions/list` (flat list, kind-attr + direct paragraph children) from the editor and adopt `prosemirror-schema-list` so the document model uses standard `bullet_list / ordered_list / list_item` nodes that serialize to ordinary `<ul><li>…</li></ul>` / `<ol><li>…</li></ol>` DOM.

**Scope decisions (locked):**
- **No nesting.** Lists are single-level. `list_item` content is `paragraph` only — no `block*` — so nested lists are structurally impossible. No Tab/Shift-Tab indent commands.
- **No task or toggle lists.** Toolbar buttons and slash-menu entries deleted; not QTI-compatible.
- **No data migration.** Documents persist as XML and are re-parsed on load (Path A confirmed). Schema swap takes effect on next reload of any open item.

**User-visible surfaces (both must be updated together):**
- **Toolbar** — [packages/ui/src/components/toolbar/toolbar.js](packages/ui/src/components/toolbar/toolbar.js): button definitions at lines 103-130, render blocks at lines 398-449 (bulletList, orderedList, taskList, toggleList) + indent/dedent at 131-144, 450+.
- **Slash menu** — [apps/editor/src/components/blocks/slash-menu/slash-menu.ts:156-179](apps/editor/src/components/blocks/slash-menu/slash-menu.ts#L156-L179): four `<lit-editor-slash-menu-item>` entries (Bullet/Ordered/Task/Toggle).
- **Site-app slash menu** — `apps/site/src/editor/components/qti-slash-menu.ts` (mirror of the above, handled in Phase 5).

---

## Background & rationale

### What prosekit's flat list does today

`defineList()` from `prosekit/extensions/list` produces a **single** `list` node:

```
list (attrs: { kind: 'bullet' | 'ordered' | 'task' | 'toggle' })
  └─ paragraph+        ← direct paragraph children, no <li> wrapper in the model
```

`toDOM` renders `<ul>` / `<ol>` but children are sibling paragraphs. To produce valid HTML on serialization the codebase injects `ListDOMSerializer.fromSchema(...)` at every save/serialize boundary — confirmed at:

- [packages/qti/prosekit-integration/src/save-xml/index.ts:15](packages/qti/prosekit-integration/src/save-xml/index.ts#L15)
- [packages/qti/prosekit-integration/src/save-qti-item/index.ts:22](packages/qti/prosekit-integration/src/save-qti-item/index.ts#L22)
- [packages/qti/prosekit-integration/src/save-qti-test/index.ts:25-34](packages/qti/prosekit-integration/src/save-qti-test/index.ts#L25-L34)
- [packages/qti/prosekit-integration/src/events/index.ts:57,85](packages/qti/prosekit-integration/src/events/index.ts#L57)
- [packages/qti/prosekit-integration/src/code/index.ts:35](packages/qti/prosekit-integration/src/code/index.ts#L35)

### What prosemirror-schema-list gives us

The canonical ProseMirror lists schema:

```
bullet_list / ordered_list
  └─ list_item+
       └─ paragraph (block+)
```

Plus exported helpers: `addListNodes`, `wrapInList`, `splitListItem`, `liftListItem`, `sinkListItem`. `toDOM` already emits valid `<ul><li>…</li></ul>` so `DOMSerializer.fromSchema(...)` is enough — no `ListDOMSerializer` shim.

---

## Advantages

1. **Valid HTML/XHTML by default.** `DOMSerializer.fromSchema` produces `<ul><li>…</li></ul>` without a special list-aware serializer. The injection layer in `prosekit-integration` collapses to one line.
2. ~~Nested lists work natively.~~ **Not relevant** — single-level only, per scope decision. (Still a future option: changing `list_item` content from `paragraph` to `paragraph block*` later would unlock nesting without another schema rewrite.)
3. **Standard ecosystem.** Any ProseMirror tool that expects `bullet_list / list_item` (markdown serializers, html parsers, collaborative editing libs, content checkers) starts working without adapters.
4. **QTI fit.** QTI item HTML allows nested `<ul>/<ol>` per QTI HTML5 profile; flat-list was a model-level shortcut, not a QTI requirement.
5. **Drop bespoke conversion glue.** [`isFlatList`](packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/commands/convert-selection-to-choice.commands.ts#L18) exists only because the flat shape can't represent nesting; with the standard schema the converter simplifies to "walk `list_item` children".
6. **Simpler mental model for contributors.** Standard schema is what everybody learns from the ProseMirror guide.

## Disadvantages / risks

1. ~~Lose `kind: 'task' | 'toggle'` lists.~~ **Resolved:** task and toggle lists are not QTI-compatible and will be dropped from the slash menu (decision confirmed by user). The slash entries at [apps/editor/src/components/blocks/slash-menu/slash-menu.ts:172,178](apps/editor/src/components/blocks/slash-menu/slash-menu.ts#L172-L178) will be removed in Phase 2.
2. **Lose prosekit's list keymaps / input rules out of the box.** `defineList()` ships Enter-splits-item and `-` / `1.` input rules. We must wire `splitListItem` from `prosemirror-schema-list` for Enter, and optionally `prosemirror-inputrules` for `- ` / `1. ` auto-create. No sink/lift needed (no nesting).
3. **Wide blast radius.** Touches 3 apps + 5 files in `prosekit-integration` + the choice converter + its tests + any XML-import path that builds list nodes. Multi-session refactor.
4. **Schema migration of stored documents.** In-memory state already in a flat shape will fail to validate against the new schema. We need either (a) a one-time on-load transform from flat-list to nested ul/li, or (b) rely on the fact that persisted documents are stored as XML and re-imported (most likely — verify in Phase 0).
5. **`canConvertFlatListToChoiceInteraction` and the convert-menu copy ("Convert flat list to Choice") become misnomers.** Code, i18n keys, and label strings all need renaming.
6. **prosekit may assume its own list node exists elsewhere in the extension graph.** E.g. its base keymap or commands. Confirm at Phase 0 by grepping prosekit dist for cross-references; if needed, retain `defineList()` minus its node spec, or stop importing the base-commands extension that references it.
7. **Some prosekit slash-menu / floating-menu utilities may special-case the `list` node type.** Verify before deletion.

## Recommendation

**Proceed**, but only after Phase 0 produces firm answers to: (a) do we keep task/toggle lists, (b) do any stored documents need a model-level migration, and (c) does prosekit reference the list node type internally from any extension we still want to keep.

---

## Phase 0 — Documentation & API discovery (READ-ONLY)

**Goal:** Lock down the API surface we'll use and resolve the three open questions above before any code changes.

### Tasks
1. **Read `prosemirror-schema-list` package docs/types**
   - File: `node_modules/prosemirror-schema-list/dist/index.d.ts` (and the .js for behavior comments)
   - Capture exact signatures of `addListNodes`, `wrapInList`, `splitListItem`, `liftListItem`, `sinkListItem`, `bulletList`, `orderedList`, `listItem`
   - Note: `addListNodes(nodes, itemContent, listGroup?)` returns an `OrderedMap` extending an existing node spec map.

2. **Verify `prosemirror-schema-list` is available**
   - Check pnpm workspace + lockfile. If absent, the install step belongs in Phase 1.

3. **Read prosekit `defineList` source** (in `node_modules/prosekit/dist/extensions/list*`)
   - Confirm whether `defineList` only contributes the `list` node + commands + keymaps, or whether other prosekit extensions reference `schema.nodes.list` by name (would surface breakage after removal).
   - List every prosekit command name that disappears with it (e.g. `wrapInList`).

4. **Audit stored-document situation**
   - Read [packages/qti/qti-roundtrip-import](packages/qti/qti-roundtrip-import/) and [packages/qti/qti3-item-import](packages/qti/qti3-item-import/): when XML is imported, how are `<ul>/<ol>/<li>` parsed into the current flat-list shape? Cite file:line.
   - Determine whether documents are ever round-tripped via the ProseMirror JSON (would require model-level migration) or always via XML (no migration needed).

5. ~~Decide on task/toggle list fate~~ — **resolved:** drop both. No work needed in Phase 0; the deletions happen in Phase 2.

6. **Audit list-aware places we may have missed**
   - Grep across the entire repo (excluding `node_modules` and `dist`) for: `schema.nodes.list`, `'list'`, `kind: 'bullet'`, `kind: 'ordered'`, `kind: 'task'`, `kind: 'toggle'`, `wrapInList`, `ListDOMSerializer`, `defineList`.
   - Inspect [packages/ui/src/components/convert-menu/convert-menu.ts:34](packages/ui/src/components/convert-menu/convert-menu.ts#L34) and the i18n keys it uses.

### Output of Phase 0
A short doc — committed to this plan file as an appendix — answering:

- ✅ Final node spec we'll add (likely `addListNodes(basicNodes, 'paragraph block*', 'block')`).
- ✅ Allowed APIs list with file:line citations.
- ✅ Decision (already made): **drop** task list and toggle list — not QTI-compatible.
- ✅ Decision: migration path for already-open documents (no-op if XML import always reparses).
- ✅ List of every file touched by later phases (the "blast radius manifest").

### Anti-patterns to call out before Phase 1 starts
- Do **not** invent commands. If a desired binding (e.g. Backspace at start of empty item lifts) is not in `prosemirror-schema-list`'s exports, treat it as something we'll implement explicitly, not assume.
- Do **not** keep `ListDOMSerializer` "just in case" — once the schema changes the default `DOMSerializer` is correct and the prosekit class will not match the new node names.

---

## Phase 1 — Schema swap in the editor app

Single-app pilot. We change `apps/editor` first, leave `apps/site` and `apps/qti-minimal` on prosekit until Phase 4 so we can compare behavior side-by-side.

### Tasks
1. **Install dep** in [apps/editor/package.json](apps/editor/package.json) if Phase 0 found it missing: `prosemirror-schema-list@^1`.
2. **Replace `defineList()` in [apps/editor/src/extensions/basic-extension.ts:19,36,62](apps/editor/src/extensions/basic-extension.ts#L19)** with a custom prosekit extension that registers `bullet_list`, `ordered_list`, `list_item` node specs via `defineNodeSpec` from `prosekit/core`, sourcing the specs from `prosemirror-schema-list`'s exported `bulletList`, `orderedList`, `listItem` objects.
   - Pattern to **copy** from Phase 0 docs output ("Allowed APIs"), not invent.
   - **Override `listItem.content` to `"paragraph"`** (not the default `"paragraph block*"`) — this is what makes nesting structurally impossible.
   - Drop the `ListExtension` type from the `Union` and the import.
3. **Register list commands & keymaps via prosekit `defineCommands` + `defineKeymap`** (or equivalent prosekit primitive — confirmed in Phase 0):
   - `toggleBulletList` → `wrapInList(bulletList)`
   - `toggleOrderedList` → `wrapInList(orderedList)`
   - `Enter` → `splitListItem(listItem)`
   - **No Tab / Shift-Tab bindings** — nesting is intentionally disabled (scope decision).
   - Optional: `prosemirror-inputrules` for `1. ` / `- ` auto-create (only if Phase 0 confirms the package is already available).

### Verification
- `pnpm -F @qti-editor/app dev` boots without errors; the editor renders.
- Typing `-` then space (or using the slash menu — see Phase 2) creates a `<ul><li><p>…</p></li></ul>` in the DOM tree (inspect via devtools).
- Pressing Enter inside a list item creates a new sibling item; Enter on an empty item exits the list.
- Tab does NOT create a nested list (nesting is intentionally disabled).
- TypeScript build (`pnpm -F @qti-editor/app build`) passes.

### Anti-patterns
- Do not add a `kind` attribute to the new list nodes. Bullet and ordered are now distinct node types.
- Do not parallel-run both `defineList()` and the new schema; they collide on `schema.nodes.list`.

---

## Phase 2 — Toolbar + slash menu: drop task/toggle, rewire bullet/ordered

This is the user-visible piece. Both UI surfaces must move together — they share the same editor commands, so a half-done swap leaves one of them broken.

### Tasks

**2a. Toolbar** — [packages/ui/src/components/toolbar/toolbar.js](packages/ui/src/components/toolbar/toolbar.js)
- **Delete** the `taskList` definition (lines 117-123) and `toggleList` definition (lines 124-130) from the `items` builder.
- **Delete** the render blocks for the `taskList` button (lines 424-436) and `toggleList` button (lines 437-449).
- **Delete** the `indentList` / `dedentList` definitions (lines 131-144) and their render blocks (lines 450+). Reason: no nesting means indent/dedent have no meaning.
- **Rewire `bulletList` and `orderedList`** (lines 103-116, render lines 398-423) from `editor.commands.toggleList({ kind: '...' })` + `editor.nodes.list.isActive({ kind: '...' })` to the new prosemirror-schema-list commands defined in Phase 1:
  - `bulletList.command` → `editor.commands.toggleBulletList()`
  - `bulletList.isActive` → `editor.nodes.bullet_list.isActive()`
  - `bulletList.canExec` → `editor.commands.toggleBulletList.canExec()`
  - Mirror for `orderedList` with `toggleOrderedList` / `ordered_list`.
- Remove the now-unused i18n keys: `toolbar.taskList`, `toolbar.toggleList`, `toolbar.indentIncrease`, `toolbar.indentDecrease`.

**2b. Slash menu** — [apps/editor/src/components/blocks/slash-menu/slash-menu.ts:156-179](apps/editor/src/components/blocks/slash-menu/slash-menu.ts#L156-L179)
- **Delete** the "Task list" entry (lines 168-173) and "Toggle list" entry (lines 174-179) wholesale.
- **Rewire** "Bullet list" (line 160) and "Ordered list" (line 166) from `commands.wrapInList?.({ kind: '...' })` to `commands.toggleBulletList?.()` / `commands.toggleOrderedList?.()`.

**2c. Convert menu copy** — [packages/prosemirror/interaction-shared/src/i18n/messages.ts:25,161](packages/prosemirror/interaction-shared/src/i18n/messages.ts#L25)
- Rename `'convert.flatListToChoice'` → `'convert.listToChoice'` in both English and Dutch translations.
- Update the call site in [packages/ui/src/components/convert-menu/convert-menu.ts:34](packages/ui/src/components/convert-menu/convert-menu.ts#L34).

### Verification
- Toolbar shows only Bullet list and Ordered list buttons; Task / Toggle / Indent / Dedent gone. No console errors about missing i18n keys.
- Clicking the bullet button on a paragraph wraps it in `<ul><li><p>…</p></li></ul>`. Clicking again un-wraps. Same for ordered.
- `isActive` highlighting works (button looks "pressed" when the cursor is in a list).
- Slash menu shows only Bullet list and Ordered list entries.
- Convert menu still appears for a list selection with its renamed label.

### Anti-patterns
- Do NOT keep `editor.commands.toggleList` calls — that command came from `defineList()` and is gone after Phase 1.
- Do NOT special-case "if toggleList exists fall back to it" — clean break.

---

## Phase 3 — Rewrite the choice-interaction converter

The current converter assumes flat `list { kind } > paragraph+`. Under the new schema it must walk `bullet_list | ordered_list > list_item > paragraph(+)`.

### Tasks
File: [packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/commands/convert-selection-to-choice.commands.ts](packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/commands/convert-selection-to-choice.commands.ts)

1. **Delete `isFlatList`** entirely — nesting is impossible in the new schema, so the check is moot.
2. **Rewrite `isConvertibleList`** (line 42):
   - Accept node when `node.type === schema.nodes.bullet_list` OR `schema.nodes.ordered_list`.
   - Drop the `kind` attr lookup.
   - For each child: require `child.type === schema.nodes.list_item` AND that the item contains exactly one paragraph with plain text inline content.
3. **Rewrite `buildConversionPlan`** (line 133, list mode branch starting line 147):
   - For each `list_item`, extract its first paragraph's content (`item.firstChild.content`).
4. **Rename exports** `canConvertFlatListToChoiceInteraction` → `canConvertListToChoiceInteraction` (same for the action) and update callers (grep `convertFlatListToChoiceInteraction` across repo before renaming).
5. **Update tests** in the sibling `.test.ts` file:
   - Replace the inline test schema (currently flat `list` with `kind`) with one assembled via `addListNodes` so the test exercises the production shape.
   - Update fixtures: `bullet_list(list_item(paragraph("a")), list_item(paragraph("b")))`.
   - Drop the old "rejects nested list" test — nesting is no longer representable, so the case can't arise.

### Verification
- `pnpm -F @qti-editor/interaction-choice test` passes (or the workspace-level vitest filter equivalent).
- In the running editor: select a 2-item list → convert menu → produces a `qti-choice-interaction` with two `qti-simple-choice` children.
- Selecting a nested list does NOT offer the conversion.

---

## Phase 4 — Strip `ListDOMSerializer` from the serialization pipeline

Once the schema produces valid HTML out of the box, the `prosekit-integration` wrappers degenerate to passthroughs.

### Tasks (in this order to keep the build green between steps)

1. **[packages/qti/prosekit-integration/src/save-xml/index.ts:8,15](packages/qti/prosekit-integration/src/save-xml/index.ts#L8)** — delete the `ListDOMSerializer` import; change line 15 to `return xmlFromNodePure(node);` (let the pure helper default to `DOMSerializer.fromSchema`).
2. **[packages/qti/prosekit-integration/src/save-qti-item/index.ts:5,22](packages/qti/prosekit-integration/src/save-qti-item/index.ts#L5)** — same treatment; pass no serializer override.
3. **[packages/qti/prosekit-integration/src/save-qti-test/index.ts:5,25,30,34](packages/qti/prosekit-integration/src/save-qti-test/index.ts#L5)** — remove all three injection points.
4. **[packages/qti/prosekit-integration/src/events/index.ts:9,57,85](packages/qti/prosekit-integration/src/events/index.ts#L9)** — replace `ListDOMSerializer.fromSchema(...)` with `DOMSerializer.fromSchema(...)` (import from `prosekit/pm/model` or `prosemirror-model`).
5. **[packages/qti/prosekit-integration/src/code/index.ts:9,35](packages/qti/prosekit-integration/src/code/index.ts#L9)** — same.
6. **Audit the pure helper [packages/qti/item-export/src/pm-xml.ts](packages/qti/item-export/src/pm-xml.ts)** — the comment about an "injected list-aware serializer" is stale; update or remove. No behavior change needed because it already defaults to `DOMSerializer.fromSchema`.

### Verification
- Build the affected packages: `pnpm -F @qti-editor/prosekit-integration build` and `pnpm -F @qti-editor/qti-item-export build` pass.
- Export a QTI item containing a bullet list and an ordered list; inspect the resulting XML/HTML — should contain `<ul><li>…</li></ul>` and `<ol><li>…</li></ol>` with no stray sibling-paragraph nesting.
- Import the freshly-exported item back into the editor; the list round-trips.

### Anti-pattern guard
- After this phase, **grep `ListDOMSerializer` in src/ — expect zero hits** outside markdown/stale comments. Track that count in the verification log.

---

## Phase 5 — Roll out to other apps + final cleanup

### Tasks
1. **Apply Phase 1 + Phase 2 changes** to:
   - [apps/site/src/editor/extensions/basic-extension.ts:18,59](apps/site/src/editor/extensions/basic-extension.ts#L18) + [apps/site/src/editor/components/qti-slash-menu.ts:177-195](apps/site/src/editor/components/qti-slash-menu.ts#L177)
   - [apps/qti-minimal/src/extensions/basic-extension.ts:12,22](apps/qti-minimal/src/extensions/basic-extension.ts#L12)
2. **Remove `prosekit/extensions/list` from any remaining import** (final grep).
3. **Decide on the package dep itself**: `prosekit/extensions/list` is exported by the umbrella `prosekit` package, so no package.json change unless a sub-import was pinned. Confirm.
4. **Update README / docs / SKILLS.md** if they reference flat lists. Grep `flat list`, `flat-list`, `flatList` in `*.md`.

### Verification
- Full repo build: `pnpm -r build` passes.
- Full repo test: `pnpm -r test` passes.
- Spot-check each app boots: editor, site, qti-minimal.

---

## Phase 6 — Final verification & sign-off

### Checklist
- [ ] `grep -r "ListDOMSerializer\|defineList\|prosekit/extensions/list\|isFlatList\|convertFlatListToChoice" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v dist` returns 0 matches.
- [ ] `grep -r "schema.nodes.list\b" --include="*.ts" | grep -v node_modules | grep -v dist` returns 0 matches (we now use `bullet_list` / `ordered_list`).
- [ ] All three apps boot.
- [ ] Roundtrip test: open an existing QTI item file → add a bullet list and an ordered list → save → re-open. Both reload as proper `<ul><li>` / `<ol><li>` and the in-editor view is identical.
- [ ] Choice-interaction conversion works on a single-level list.
- [ ] Tab inside a list item does NOT create a nested list (no-op or default Tab behavior).
- [ ] Importing an existing QTI item that contains nested `<ul>` in its HTML: confirm graceful handling — the parser either flattens (acceptable) or rejects the nested structure with a clear error (also acceptable). **Decide and document the behavior in Phase 0.**
- [ ] `pnpm -r test` and `pnpm -r build` both green.

---

## Appendix A — Files touched (blast-radius manifest)

To be filled in by Phase 0. Seed list, in order of phase:

- Phase 1: `apps/editor/src/extensions/basic-extension.ts`
- Phase 2: `packages/ui/src/components/toolbar/toolbar.js`, `apps/editor/src/components/blocks/slash-menu/slash-menu.ts`, `packages/prosemirror/interaction-shared/src/i18n/messages.ts`, `packages/ui/src/components/convert-menu/convert-menu.ts`
- Phase 3: `packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/commands/convert-selection-to-choice.commands.ts` + sibling test
- Phase 4: `packages/qti/prosekit-integration/src/{save-xml,save-qti-item,save-qti-test,events,code}/index.ts`, `packages/qti/item-export/src/pm-xml.ts` (comment only)
- Phase 5: `apps/site/src/editor/extensions/basic-extension.ts`, `apps/site/src/editor/components/qti-slash-menu.ts`, `apps/qti-minimal/src/extensions/basic-extension.ts`, docs

## Appendix B — Open questions for the user

1. ~~Task list / toggle list~~ — **resolved: drop both** (not QTI-compatible).
2. ~~Document migration~~ — **resolved: Path A** (XML reparse on load; no in-memory migration needed).
3. ~~Nesting~~ — **resolved: not supported** (`list_item` content = `paragraph` only).
4. ~~Cheap-alternative check~~ — **moot** given the no-nesting decision.
5. **Pilot rollout**: ship Phase 1–4 in `apps/editor` and gather feedback before Phase 5 touches `site` and `qti-minimal`? Recommended.
6. **Imported nested HTML**: what should happen when a QTI item already in the wild contains nested `<ul>` (legitimate HTML)? Options: (a) flatten silently during import, (b) flatten and warn, (c) reject the import. Needs a one-line decision in Phase 0.

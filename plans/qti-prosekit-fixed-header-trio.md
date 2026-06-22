# Fixed undeletable header trio in qti-prosekit-app

Constrain every document in `apps/qti-prosekit-app` so its first three top-level children are, in order, ALWAYS present and undeletable:

1. `heading` level 1 (title)
2. `paragraph` (subtitle)
3. `qtiItemDivider`

Everything after these three is normal block content and remains freely editable. The three "locked" nodes themselves remain *content-editable* (you can change the title/subtitle text and the divider's attrs) — they just can't be removed, reordered, or split out of position.

**Scope guard:** changes live ONLY inside `apps/qti-prosekit-app/`. Do not modify `packages/prose-qti`, `packages/prose-extensions`, or `apps/qti-prosemirror-item`. The qti-prosemirror-item app is reference material (`divLockPlugin` precedent) — read it, don't change it.

---

## Phase 0 — Documentation discovery (already done; consolidated here)

The exploration is complete; an executing agent should re-open these files before coding.

### Allowed APIs / patterns

| API / pattern | Where it's used | Cite |
| --- | --- | --- |
| Override doc content expression | ProseKit `defineNodeSpec({ name: 'doc', ... })` style override (paragraph/table are patched the same way in qti-interactions-extension) | [apps/qti-prosekit-app/src/extensions/qti-interactions-extension.ts:46-95](apps/qti-prosekit-app/src/extensions/qti-interactions-extension.ts#L46-L95) |
| Reject deletion of structural nodes | ProseMirror `Plugin({ filterTransaction })` — count invariant precedent | [apps/qti-prosemirror-item/src/qti-layout-div.ts:43-90](apps/qti-prosemirror-item/src/qti-layout-div.ts#L43-L90) |
| Auto-repair instead of reject | ProseMirror `Plugin({ appendTransaction })` precedent | [packages/prose-qti/src/components/inline-choice/extensions/correct-response-click.ts:43-96](packages/prose-qti/src/components/inline-choice/extensions/correct-response-click.ts#L43-L96) |
| Wrap a PM Plugin as a ProseKit extension | `definePlugin(() => pmPlugin)` | [packages/prose-extensions/src/prosemirror/block-select/index.ts](packages/prose-extensions/src/prosemirror/block-select/index.ts) |
| Compose into editor | `union(...)` in `qti-editor-app.ts` constructor | [apps/qti-prosekit-app/src/components/qti-editor-app.ts:205-229](apps/qti-prosekit-app/src/components/qti-editor-app.ts#L205-L229) |
| qti-item-divider node name & spec | Node name `qtiItemDivider`, `atom: true`, attrs `title` + `identifier` | [packages/prose-qti/src/components/item-divider/qti-item-divider.schema.ts:11-37](packages/prose-qti/src/components/item-divider/qti-item-divider.schema.ts#L11-L37) |
| Existing doc content | `defineDoc()` (default `block+`) plus `defineNodeAttr` for `title`/`identifier` | [apps/qti-prosekit-app/src/extensions/basic-extension.ts:51-75](apps/qti-prosekit-app/src/extensions/basic-extension.ts#L51-L75) |
| Default content / persistence | Editor restores from localStorage; falls back to empty doc on parse error | [apps/qti-prosekit-app/src/components/qti-editor-app.ts:231-248](apps/qti-prosekit-app/src/components/qti-editor-app.ts#L231-L248) |

### Anti-patterns to avoid

- Inventing a `defineDocContent()` or similar API — ProseKit's surface is `defineNodeSpec`, `defineNodeAttr`, `definePlugin`, `union`.
- Marking the heading/paragraph nodes themselves `isolating: true` or `selectable: false` globally — those are general nodes used elsewhere; the lock belongs in a plugin, not on the node specs.
- Modifying `packages/prose-qti`'s `qtiItemDividerNodeSpec` to enforce position — the constraint is app-level, not schema-level for the divider.
- Using `filterTransaction` to *create* the missing nodes. `filterTransaction` only accepts/rejects; use `appendTransaction` (or initial-doc seeding) to *insert*, and `filterTransaction` to *protect*.
- Relying on the doc content expression alone — PM will only enforce it on initial parse; runtime deletions of the heading still pass schema validation if the schema allows `block+` to backfill. The expression is necessary but not sufficient; the lock plugin is the enforcement.

### Open question for executing agent to resolve before writing code

Decide between two enforcement strategies and pick one:

- **(A) Reject-only** (`filterTransaction`, mirrors `divLockPlugin`): if a transaction would make the first three children differ in *type* from `[heading, paragraph, qtiItemDivider]`, reject the whole tr. Simpler; rejects whole compound edits even when a benign part could have applied.
- **(B) Auto-repair** (`appendTransaction`): let the tr through, then append steps that restore any missing locked nodes. More forgiving UX; harder to get right (cursor positioning, history).

Recommendation: start with **(A)** — it's the closest analogue to existing precedent and easier to verify. If UX feedback demands it, swap to (B) in a follow-up.

---

## Phase 1 — Add the locked-header extension

**Goal:** create one new file that owns both the doc schema override and the runtime lock.

**File to create:** `apps/qti-prosekit-app/src/extensions/locked-header-extension.ts`

**What to implement** — copy patterns, don't invent:

1. Doc content override. Use ProseKit's `defineNodeSpec({ name: 'doc', topNode: true, content: 'heading paragraph qtiItemDivider block+' })`. Pattern model: how the QTI interactions extension patches the `paragraph` spec at [qti-interactions-extension.ts:46-95](apps/qti-prosekit-app/src/extensions/qti-interactions-extension.ts#L46-L95). Confirm the exact `defineNodeSpec` signature in `node_modules/prosekit/core` before coding; if `topNode` isn't accepted, fall through to a plain `defineNodeSpec({ name: 'doc', content: '...' })` since `defineDoc()` already marks it as top.
2. Lock plugin (strategy A). Mirror [qti-layout-div.ts:85-90](apps/qti-prosemirror-item/src/qti-layout-div.ts#L85-L90):
   ```ts
   new Plugin({
     filterTransaction(tr, state) {
       if (!tr.docChanged) return true
       return hasLockedPrefix(tr.doc) && prefixUnchanged(state.doc, tr.doc)
     }
   })
   ```
   where `hasLockedPrefix(doc)` checks `doc.childCount >= 3` and child types `[heading, paragraph, qtiItemDivider]` (with `heading.attrs.level === 1`), and `prefixUnchanged` compares the *types and positions* of the first three children before/after. Allow text edits inside them (types match → pass); reject deletions/replacements (types change → reject).
3. Wrap the plugin with `definePlugin(() => lockPlugin)` — see [block-select/index.ts](packages/prose-extensions/src/prosemirror/block-select/index.ts).
4. Export a single `defineLockedHeaderExtension()` that returns `union(defineNodeSpec({...doc override...}), definePlugin(() => lockPlugin))`.

**Documentation references for the agent to re-read:**
- [apps/qti-prosemirror-item/src/qti-layout-div.ts](apps/qti-prosemirror-item/src/qti-layout-div.ts) — full file, the canonical pattern the user told us to "watch".
- [apps/qti-prosekit-app/src/extensions/qti-interactions-extension.ts:33-96](apps/qti-prosekit-app/src/extensions/qti-interactions-extension.ts#L33-L96) — how ProseKit `defineNodeSpec` is used alongside `definePlugin`.
- [packages/prose-qti/src/components/item-divider/qti-item-divider.schema.ts](packages/prose-qti/src/components/item-divider/qti-item-divider.schema.ts) — confirm the divider's PM node name is `qtiItemDivider` (camelCase — must match what goes in the doc content expression).

**Verification checklist for Phase 1:**
- `pnpm -w typecheck` passes for qti-prosekit-app.
- No references to `topNode`, `isolating`, or `selectable: false` on the heading/paragraph specs themselves — the lock lives in the plugin only.
- `grep -n 'doc' apps/qti-prosekit-app/src/extensions/locked-header-extension.ts` shows the content expression starts with `heading paragraph qtiItemDivider`.

**Anti-pattern guards:**
- Don't import from `apps/qti-prosemirror-item` — that's a separate app; copy the pattern, don't reach across.
- Don't mutate `defineBasicExtension()` to delete `defineDoc()` — `defineNodeSpec` should override/extend it via `union` precedence. If a later phase reveals the override is being shadowed by `defineDoc()`, the fix is union order in Phase 2, not deleting `defineDoc()`.

---

## Phase 2 — Wire the extension into the editor

**File to edit:** `apps/qti-prosekit-app/src/components/qti-editor-app.ts`

**What to change** — minimal:

- Add `import { defineLockedHeaderExtension } from '../extensions/locked-header-extension'`.
- Insert `defineLockedHeaderExtension(),` into the `union(...)` block at [qti-editor-app.ts:205-229](apps/qti-prosekit-app/src/components/qti-editor-app.ts#L205-L229). Place it **after** `defineBasicExtension()` and `defineQtiInteractionsExtension()` so its doc override wins.

**Default content / seeding** — also in this phase:

The editor reads `defaultContent` from localStorage; on empty/parse failure it falls back to `createEditor({ extension })` with no default content (line 247). With the new schema, an empty doc would fail validation (content expression demands `heading paragraph qtiItemDivider block+`). Provide a seed:

- Define a `LOCKED_HEADER_DEFAULT_CONTENT` JSON constant near the top of `qti-editor-app.ts` (or co-locate it in the new extension file and import) shaped like:
  ```json
  {"type":"doc","content":[
    {"type":"heading","attrs":{"level":1},"content":[]},
    {"type":"paragraph","content":[]},
    {"type":"qtiItemDivider","attrs":{"title":"","identifier":""}},
    {"type":"paragraph","content":[]}
  ]}
  ```
- Pass it as `defaultContent` in **both** `createEditor` calls (the restore path's fallback and the catch-block path at lines 233-248).
- Also use it as the fallback when `restoredState.doc` is missing.

**Verification checklist for Phase 2:**
- Fresh editor (clear localStorage for the editor key) loads showing an empty H1, empty subtitle, and a divider — in that order.
- `grep -rn "defineLockedHeaderExtension" apps/qti-prosekit-app/src` shows exactly two hits (definition + import).

**Anti-pattern guards:**
- Don't change the localStorage key/version to "force a reset" — existing stored docs that pre-date this feature need a real migration story (Phase 4), not silent data loss.

---

## Phase 3 — Manual + automated verification

**Manual smoke test (mandatory — UI behavior, not just types):**

Run the qti-prosekit-app dev server. In the editor:

1. Place the cursor in the H1, type text — works, locked plugin lets text edits through.
2. Select-all + Delete — first three nodes must remain (transaction rejected or repaired).
3. Backspace at the start of the divider — should NOT merge it into the subtitle (divider is `atom: true`; backspace transaction that would remove it must be rejected).
4. Backspace at the start of the H1 — must be a no-op (no node above to merge into; doc-content expression also forbids removing it).
5. Try dragging the divider above the H1 via block-handle — must be rejected.
6. Type freely in a paragraph **below** the divider — must work normally (lock only protects the first three children).
7. Undo/redo across an attempted deletion — history must not desync.

**Automated checks:**
- `pnpm -w typecheck`
- `pnpm -w lint` for the app
- If there are existing vitest tests for qti-prosekit-app, run them. (Don't write new tests in this plan unless the area already has them — keep scope tight.)

**Anti-pattern grep:**
```
grep -rn "isolating\s*:\s*true" apps/qti-prosekit-app/src
grep -rn "selectable\s*:\s*false" apps/qti-prosekit-app/src
```
Both should return nothing new — the lock lives in the plugin, not on node specs.

---

## Phase 4 — Migration of pre-existing localStorage docs (only if Phase 3 reveals breakage)

If smoke testing shows existing persisted docs fail to load with the new schema (likely — old docs don't start with the trio), add a one-shot upgrader:

- In `readPersistedStateFromLocalStorage` (or a sibling util), if the parsed doc doesn't start with `[heading, paragraph, qtiItemDivider]`, prepend the missing nodes before handing it to `createEditor`.
- This is a forward-only repair; do not delete the user's existing content.
- Re-run Phase 3 smoke tests.

Skip this phase entirely if existing docs load fine.

---

## Out of scope (explicit, to prevent scope drift)

- Toolbar buttons / slash-menu entries for inserting the divider (the divider exists for free elsewhere; here it's a fixture).
- Export changes — XML/QTI roundtrip is not in scope. If/when the trio needs to surface in export, that's a separate plan keyed off `packages/prose-qti`.
- Touching the other editor apps (`qti-prosekit-item`, `qti-prosemirror-item`).
- Replacing the lock with `appendTransaction` auto-repair (deferred; see Phase 0 strategy choice).

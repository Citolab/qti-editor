# qti-prosekit-item toolbar — coco parity

Goal: re-shape the qti-prosekit-item toolbar so it mirrors the functional layout of the coco editor (https://coco.citolab.nl/editor). Specifically:

- Keep the existing `qti-interaction-insert-menu` as the leftmost group — this is coco's **Bewerk** dropdown.
- Add text-alignment controls (left / center / right; coco has no justify).
- Promote the AI buttons (`lit-ai-check-toolbar` = robot/bot, `lit-ai-create-toolbar` = wand) from the secondary row onto the rightmost end of the main toolbar — these match coco's "AI Review" (bot) and "Cito AI" (wand-sparkles).
- Drop or de-emphasise items coco doesn't expose in its primary toolbar (Strike, inline Code, Code-block, Divider, Blockquote, Undo/Redo) — keep behind the slash-menu / inline-menu we just added.

Out of scope (explicit): formula editor, justify-align, all secondary list-style and book-open dialogs from coco. Math/formula was explicitly skipped by the user.

---

## Phase 0 — Discovery (done)

### Coco toolbar (live DOM, left → right)

1. **Bewerk** — dropdown insert menu (1 kolom, 2 kolommen, Paragraaf, Afbeelding, Meerkeuze, …)
2. Bold / Italic / Underline (toggles)
3. Clear formatting
4. Align left / Align center / Align right (**no justify**)
5. Ordered list / Bullet list (split with style picker)
6. Superscript
7. **Titel** — heading dropdown (Kop 1 … Kop 6)
8. Insert non-breaking space
9. File / image insert (split-button)
10. Formula — **out of scope**
11. Cito AI (lucide `wand-sparkles`) + book-open dialog
12. AI Review (lucide `bot`)

Source: live snapshot via chrome-devtools MCP. Screenshot saved at `.tmp-coco-editor-toolbar.png`.

### Current qti-prosekit-item toolbar
File: `apps/qti-prosekit-item/src/components/blocks/toolbar/toolbar.js`. Render order (`toolbar.js:212-436`):
1. `qti-interaction-insert-menu` (212) — already the Bewerk equivalent
2. `qti-convert-menu` (213) — heading/paragraph/list converter (Titel equivalent)
3. Undo / Redo (215, 228)
4. Bold (`toggleStrong`), Italic (`toggleEm`), Underline (`toggleUnderline`), Strike (`toggleStrike`), Code (`toggleCode`) (242–305)
5. Code Block (307), H1/H2/H3 (320–357), Divider (359), Blockquote (372), Bullet/Ordered (385–409)
6. Image upload popover (411), Insert Table (425)

Secondary row in `apps/qti-prosekit-item/src/qti-prosekit-item.ts:166-179`:
- `lit-ai-check-toolbar` (167) — uses 🤖 emoji + "Check"
- `lit-ai-create-toolbar` (168) — wand
- `lit-ai-chat-toolbar` (170)

### Allowed APIs (verified)
- `prosekit/extensions/text-align` → `defineTextAlign(options)`, command `setTextAlign(align)` — confirmed at `packages/extensions/src/text-align/index.ts:93,120` in the Prosekit checkout; bundled with installed `prosekit@^0.21.3`.
- Existing toolbar marks come from `@citolab/prose-extensions/prosekit` (`toggleStrong`, `toggleEm`) and prosekit-basic. Underline/strike/code marks ARE present in the current basic extension (toolbar already uses them).
- `qti-interaction-insert-menu` lives in `@citolab/prose-qti-ui/components/interaction-insert-menu` — already imported in `qti-prosekit-item.ts:4`.
- AI buttons live at `apps/qti-prosekit-item/src/components/blocks/ai-check/robot-toolbar.ts` and `apps/qti-prosekit-item/src/components/blocks/ai-create/wand-toolbar.ts`.
- Lucide icons available via `@iconify-json/lucide` (already a dep). New icon classes used: `i-lucide-align-left`, `i-lucide-align-center`, `i-lucide-align-right`. (Confirmed available by inspecting `node_modules/@iconify-json/lucide`.)

### Anti-patterns to avoid
- Do **not** invent `editor.commands.setAlign` — the real name is `setTextAlign`.
- Do **not** add `text-align: justify` controls — coco doesn't have justify and adding it expands scope.
- Do **not** edit the dist/ artefacts; only sources.
- Do **not** rip out the existing convert-menu before adding equivalent functionality.

---

## Phase 1 — Add text-align extension and commands

**What to implement**
1. Add `defineTextAlign` to `apps/qti-prosekit-item/src/extensions/basic-extension.ts`. Configure it to apply to `paragraph` and `heading` nodes (the only block types currently in the schema that should accept alignment). Allow values `left | center | right`.
2. Export nothing new from the extension file — `basic-extension.ts` already returns a single `union(...)`; just include the new `defineTextAlign({ types: ['paragraph', 'heading'] })` call.

**Documentation references**
- Source of truth: `/Users/patrickklein/Projects/Editor/Prosekit/packages/extensions/src/text-align/index.ts` (lines 93 = command, 120 = `defineTextAlign` export).
- Mirror the pattern of the existing `defineGapCursor()` / `defineHistory()` adds in `basic-extension.ts:11,28-29`.

**Verification**
- `pnpm --filter @qti-editor/prosekit-item exec tsc --noEmit` clean.
- In a temporary dev session, run `editor.commands.setTextAlign('center').canExec()` from console and confirm `true` on a paragraph.

**Anti-pattern guards**
- Don't call the extension with no `types` option — alignment must be node-scoped.
- Don't add `'justify'` to any allowed list (coco doesn't ship it).

---

## Phase 2 — Add align buttons to the primary toolbar

**What to implement**
Edit `apps/qti-prosekit-item/src/components/blocks/toolbar/toolbar.js` and insert three new `<lit-editor-button>` entries directly after the heading buttons (after H3, before Divider). Each button:
- Uses icon `i-lucide-align-left|center|right size-5 block`.
- Tooltip: `"Align left"`, `"Align center"`, `"Align right"`.
- `pressed` reflects whether the current selection's block has `textAlign === '<value>'`. Use `editor.nodes.paragraph?.isActive({ textAlign: 'center' })` style queries (see how `pressed` is computed for H1/H2/H3 at toolbar.js:320-357).
- `@click` → `editor.commands.setTextAlign('<value>')`.

**Documentation references**
- Pattern to copy: existing heading buttons in `toolbar.js:320-357`.
- Active-state pattern in the same file: it reads `editor.marks/nodes.<name>.isActive({...})` for the highlight.

**Verification**
- Visual check in dev (`pnpm --filter @qti-editor/prosekit-item dev`): three icons appear between H3 and Divider; clicking aligns the selected paragraph and the `pressed` state highlights.
- `grep -n "i-lucide-align-" apps/qti-prosekit-item/src/components/blocks/toolbar/toolbar.js` returns three lines.

**Anti-pattern guards**
- Don't add a "justify" button.
- Don't gate the alignment buttons behind the `qti-convert-menu` — coco surfaces them inline.

---

## Phase 3 — Promote AI buttons onto the primary toolbar

**What to implement**
1. In `apps/qti-prosekit-item/src/qti-prosekit-item.ts`, remove `lit-ai-check-toolbar` and `lit-ai-create-toolbar` from the secondary row (`qti-prosekit-item.ts:167-168`).
2. In `apps/qti-prosekit-item/src/components/blocks/toolbar/toolbar.js`, render `<lit-ai-create-toolbar>` and `<lit-ai-check-toolbar>` at the end of the toolbar (after the existing Image / Insert Table group). The toolbar already has access to `editor` via the same context consumer those components already use, so no prop wiring is needed.
3. Update the icons inside those two components so they match coco:
   - `ai-create/wand-toolbar.ts` button → swap the wand emoji/text for `<div class="i-lucide-wand-sparkles size-5 block"></div>` inside the existing `<lit-editor-button>`-style trigger.
   - `ai-check/robot-toolbar.ts:176` → replace `🤖 ${running ? … : 'Check'}` with `<div class="i-lucide-bot size-5 block"></div>` + an `sr-only` "AI Review" label. Keep the running spinner.
4. Keep `lit-ai-chat-toolbar` in the secondary row for now — coco's chat affordance is a separate dialog and we already have a dedicated chat toggle there.

**Documentation references**
- Toolbar button styling: `apps/qti-prosekit-item/src/components/blocks/button/button.js` (already wraps a tooltip + icon).
- Coco mapping (from Phase 0 catalog): bot icon = AI Review; wand-sparkles = Cito AI.

**Verification**
- Open the app: the secondary row no longer shows the wand and bot buttons; the main toolbar now ends with them on the right side.
- Click each AI button — the existing popovers (`lit-ai-create-result`, `lit-ai-check-fragment-popover`, etc.) still open. No regression in `editor.use(...)` lifecycles.
- `grep -n "lit-ai-check-toolbar\|lit-ai-create-toolbar" apps/qti-prosekit-item/src/qti-prosekit-item.ts` returns nothing.

**Anti-pattern guards**
- Don't delete the underlying components — only move where they render.
- Don't rename the custom elements (`lit-ai-check-toolbar` / `lit-ai-create-toolbar`); other code may listen to their events.
- Don't drop the `running` / disabled state styling in the robot button when swapping to the lucide icon.

---

## Phase 4 — Prune items coco doesn't surface (optional / behind a flag)

**What to implement (recommend doing it, but isolate so it's easy to revert)**
Decide per item — for each, either keep, or remove from `toolbar.js` (functionality remains available through inline-menu / slash-menu we already added):

| Toolbar item | Recommendation | Rationale |
|---|---|---|
| Undo / Redo | **Keep** | Coco lacks them but our users will expect them; cheap to keep. |
| Strike | Remove | Available in inline-menu. |
| Code (inline) | Remove | Available in inline-menu. |
| Code Block | Remove | Available via slash-menu. |
| Divider | Remove | Available via slash-menu (`---`). |
| Blockquote | Remove | Available via slash-menu (`>`). |
| Bullet / Ordered list | **Keep** | Coco keeps these as primary buttons. |
| Image upload | **Keep** | Coco has the equivalent. |
| Insert Table | **Keep** | Useful, even though coco buries it. |
| Convert menu (Titel) | **Keep** | Direct analogue of coco's Titel dropdown. |
| H1 / H2 / H3 individual buttons | Remove | Redundant with the convert-menu / Titel dropdown. |

**Verification**
- After the prune, the toolbar reads (left → right): Bewerk · Titel · Undo · Redo · Bold · Italic · Underline · AlignL · AlignC · AlignR · Bullet · Ordered · Image · Table · Wand · Bot — close to coco's order.
- Slash-menu still offers Quote / Divider / Code / Code Block when the user types `/`.
- Inline-menu still offers Strike / Code on selection.

**Anti-pattern guards**
- Don't delete the underlying extensions — only the toolbar buttons. The marks must remain callable from the inline-menu and from keyboard shortcuts.
- Don't remove a button until you've confirmed there's an alternative entry point in the inline-menu / slash-menu.

---

## Phase 5 — Verification

1. `pnpm --filter @qti-editor/prosekit-item exec tsc --noEmit` — clean.
2. `pnpm --filter @qti-editor/prosekit-item dev` — toolbar renders, no console errors.
3. Visual diff against the saved `.tmp-coco-editor-toolbar.png`: confirm group order roughly matches Bewerk → marks → align → lists → titel → image/table → AI.
4. Smoke-test each new control:
   - Type a paragraph, click each align button → text aligns.
   - Click the bot icon → AI Review flow runs as before.
   - Click the wand icon → AI Create popover opens as before.
   - Open slash-menu (`/`) → Divider / Quote / Code still selectable.
   - Open inline-menu (select text) → Strike / Code still toggle.
5. `grep -rn "qti-minimal-app\|QtiMinimalApp" apps/qti-prosekit-item/src` returns nothing (sanity check from prior rename).
6. Update [feedback_quickstart_shape.md] memory only if quickstart sequence changes — not expected for this work.

---

## Open questions for the user

1. Phase 4 prune — yes/no? Keeping more buttons is fine; the question is whether you want a coco-faithful toolbar or a coco-plus-extras toolbar.
2. The `qti-convert-menu` currently doubles as Titel; do you want it relabelled to "Titel" in the UI for closer parity?
3. Coco's lists are split-buttons with style pickers (Decimal / Lower Alpha / …). Skip in this round? (Recommended — would need new list-style extension work.)

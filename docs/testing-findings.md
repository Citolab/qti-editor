# Testing Findings

A running log of product bugs, upstream gaps, and design smells surfaced while
building out the regression suite. Each entry records what was found, how it was
verified, and what still needs to happen — so nothing gets silently worked
around inside a test.

Status legend: **fixed** · **open** · **upstream** (needs a change outside this repo) · **accepted** (documented, no action planned)

---

## 1. `Enter` was bound to `undefined` in two hottext stories — **fixed**

`item011-qti-hottext-interaction.regression.stories.ts:66` and `…item012…:66` did:

```ts
keymap({ Enter: hottextInteractionDescriptor.enterCommand })
```

`enterCommand` is optional on `InteractionDescriptor` (`packages/prose-qti/src/interfaces/descriptor.ts:55`) and was defined only on the **choice, match, associate, gap-match and inline-choice** descriptors — never hottext. (Associate has since been removed.) The keymap therefore bound `Enter` to `undefined` (a silent no-op).

- **Why it survived**: Vite never typechecks, so `pnpm test` stayed green. `tsc` flags it immediately.
- **Resolution**: removed the dead entry; `baseKeymap` handles Enter. Hottext genuinely has no Enter affordance — its children *wrap existing text* rather than forming a list of siblings, unlike the interactions that do define `enterCommand`.
- **Follow-up**: none for the code, but it is the strongest argument for the `Typecheck` CI gate added alongside.

## 2. Unused import in the select-point story — **fixed**

`item016-qti-select-point-interaction.regression.stories.ts:28` imported `nodeAttrsSyncPlugin` without using it (`TS6133`). Removed.

## 3. Interaction controls expose no ARIA roles — **upstream** (`@citolab/qti-components`)

Role-based queries cannot address any custom-element interaction control. Verified empirically against the live runtime; every role query returns **0 matches** in *both* query engines:

| query | shadow-dom-testing-library | vitest `page` locators |
| --- | --- | --- |
| `radiogroup`, `radio`, `option`, `listbox`, `group`, `checkbox` | 0 | 0 |
| text (`'Xenon (Xe)'`) | 1 | 1 |

Root causes, both real:

1. `qti-choice-interaction` **does** set a role — but through `ElementInternals` (`internals.role = 'radiogroup'`). `getAttribute('role')` returns `null`, and neither testing-library (attribute + `dom-accessibility-api`) nor Ivya/Playwright consults `ElementInternals`. The role is invisible to tooling and to some AT.
2. `qti-simple-choice` has **no role at all** — it carries `tabindex="0"` (so it is focusable) but its control is a bare `<div part="control">` with no `role="radio"`/`role="checkbox"` and no `aria-checked`. Focusable, but semantically anonymous.

By contrast `qti-text-entry-interaction` renders a real `<input part="input" type="text">`, so `getByRole('textbox')` works there — proof the tooling is fine and the gap is in the components.

- **Impact on tests**: interaction tests query by **text/label**, not role. This is a workaround, not a preference.
- **Impact on users**: screen-reader users cannot perceive choice state. This is an accessibility defect, not just a testing inconvenience.
- **Proposed upstream change**: reflect roles as attributes (or add them alongside the `ElementInternals` assignment) — `role="radio"`/`"checkbox"` plus `aria-checked` on `qti-simple-choice`, `role="radiogroup"`/`"group"` on the interaction. Would suit the `breaking-changes-for-editor-release` branch.
- **Migrate tests to `getByShadowRole` once this lands.**

## 4. `qti-text-entry-interaction` does not commit on input — **open**

Filling the input is not enough to update the response variable; the value only reaches `RESPONSE` after a blur/`change`:

```
fill only  -> SCORE 0
fill + Tab -> SCORE 1
type + Tab -> SCORE 1   (response value = "refractie")
```

- **Consequence**: a candidate who types the correct answer and submits **without leaving the field** scores 0. Worth confirming against the real delivery flow — if the player submits on a button that blurs first, it is masked; if not, it is a live scoring bug.
- **Test handling**: the interaction helper always commits with a `Tab` after typing, and this is documented at the call site so it is not mistaken for incidental ceremony.

## 5. The e2e suite tests a schema the app does not ship — **open** (structural)

Every `*.regression.stories.ts` hand-builds `new Schema({...prosemirror-schema-basic, ...descriptor.nodeSpecs})` and states *"No ProseKit imports."* The shipping editors are ProseKit-based (`packages/prose-extensions/src/prosekit/basic.ts`). Consequences:

- The base schema every real editor uses is covered by **no test**.
- Changing real plugin/schema wiring does not flow into the tests — they keep passing against their own private stack.

**Follow-up**: rebuild the harness on the real ProseKit extension set, or add a parallel ProseKit-based suite. Tracked as the largest remaining coverage gap.

## 6. Snapshot tests are not a true roundtrip — **open**

The suite asserts `export(import(source)) == frozen_snapshot`, never `import(export(x)) == export(x)`. A bug that loses data symmetrically stays green forever and gets baked into the snapshot on the next `-u`.

Known latent example: `ITEM003.xml` declares **two** accepted answers (`breking`, `refractie`); the frozen `ITEM003-editor.xml` retains only **one**. The alternate answer is already lost at generation 1 and the snapshot has frozen that loss.

**Follow-up**: the planned `roundtrip-stability.ts` fixpoint assertion.

## 7. `roundtripAssociate` is dead in the real import path — **closed, deleted**

`packages/prose-qti/src/qti3-item-import/roundtrip-associate/index.ts` was not exported from that directory's `index.ts`, had no `package.json` subpath, and was absent from `defaultRoundtripTransforms`. ITEM017 (the associate fixture) was handled by the generic `roundtripInteractions` fallback instead. The finding offered two ways out — wire it in or delete it — and deletion is what happened: it went with the rest of the editor's associate support.

## 8. Ten package stories are orphaned by a commented-out glob — **open**

`.storybook/main.ts` lines 9–14 comment out the `packages/*` and `apps/*/src` story globs, so 10 story files under `packages/prose-qti/src/components/` never build or run — including **6 with real `play` interaction tests**.

Note: those `play` functions predate the "stories render, tests interact" rule now in `AGENTS.md`. Reviving them means **porting their assertions into `*.browser.test.ts`**, not re-enabling `play`.

Also found while assessing revival: `packages/prose-qti/src/components/order/interaction-order.stories.ts` passes `correct-response='["choice-b","choice-c","choice-a"]'`, but `qti-order-interaction.ts:134` parses with `.split(',')` and has **no JSON fallback** (unlike match and gap-match, which do). That story is broken against the current component.

## 10. e2e stories rendered an unstyled editor — **fixed**

The regression stories imported only `prosemirror-view/style/prosemirror.css`. The shipping editors load two more (`apps/qti-prosekit-app/src/style.css`, `apps/qti-prosemirror-item/src/app.css`):

```css
@import '@qti-components/theme/item.css';
@import '@citolab/prose-qti/core-css.css';
```

Without them the interaction controls computed to **0×0**:

```
before: rect=0x0    display=flex  visibility=visible  opacity=1   (host 1280x50)
after:  rect=16x16  display=grid  visibility=visible  opacity=1   (host 109x66)
```

Two consequences, both bad:

1. **Real pointer events could not click the control** — Playwright correctly refuses to click a zero-area element. The old tests only worked because a *synthetic* `element.click()` ignores geometry entirely. This is precisely the divergence the "no synthetic events" rule exists to prevent: the suite was asserting against a layout that no user ever sees.
2. The stories were exercising an editor styled differently from the shipping app, so any layout-dependent behaviour was untested.

**Resolution**: all 17 stories now import the same two stylesheets as the real editors.

## 11. Vite warns about fixture imports on every test run — **accepted**

Every run prints:

> Assets in public directory cannot be imported from JavaScript. … use `/src/qti/kennisnet/ITEM001.xml?raw`

The fixtures live in `public/qti/kennisnet/` and are imported via the `@qti-editor/example-items` alias with `?raw`. It works, but the warning is noise on every run and the guidance suggests the fixtures belong under `src/`. Low priority; worth tidying when the fixture layout is next touched.

## 12. `qti-inline-choice-interaction`'s listbox exposes only its placeholder — **upstream** (`@citolab/qti-components`)

Refines finding #3. Inline-choice is the **only** interaction with real combobox semantics:

```html
<button part="trigger" aria-haspopup="listbox" aria-expanded="false" popovertarget="…">
<div part="menu" role="listbox" popover="auto">
  <button role="option" part="option option-prompt option-selected" aria-selected="true">
    <span part="option-content">kies het juiste antwoord…</span>
  </button>
  <slot></slot>          <!-- the real choices land here -->
</div>
```

The placeholder is a proper `role="option"`. The three real choices are slotted `<qti-inline-choice tabindex="-1">` elements carrying **no role**. So the listbox advertises exactly **one** option — the placeholder — and none of the actual answers:

```
after trigger click: 1 option -> {text="kies het juiste antwoord…"}
```

- **Verified not an editor bug**: the original `public/qti/kennisnet/ITEM006.xml` renders identically to the exported snapshot, so the export is faithful and the gap is entirely in the component.
- **Consequence**: a screen-reader user opening this dropdown hears one option, the placeholder. This is more severe than the missing roles in #3 because the element *claims* listbox semantics and then under-reports its contents.
- **Fix**: give the slotted `qti-inline-choice` elements `role="option"` + `aria-selected`, and set `aria-activedescendant` on the trigger.
- **Test handling**: options are clicked by text after opening the popover.

## 13. Harness re-parented siblings of self-closed elements — **fixed**

`mountQtiRuntime` injected the item XML into an HTML `srcdoc`. HTML has no self-closing syntax for non-void elements, so the parser read

```xml
<qti-extended-text-interaction response-identifier="RESPONSE" expected-lines="5"/>
<qti-rubric-block use="scoring" view="scorer">…</qti-rubric-block>
```

as an interaction that **contains** the rubric block. The runtime then hid the whole subtree (correctly — `view="scorer"` is marker-only content), taking the candidate's `<textarea>` with it. `getByRole('textbox')` found 0 elements; `includeHidden: true` found 1.

- **Not a product bug**: the rubric block is a sibling in both `public/qti/kennisnet/ITEM005.xml` and the export. Self-closing empty elements is valid XML.
- **Resolution**: the harness now rewrites `<qti-foo … />` to `<qti-foo …></qti-foo>` before injection, for hyphenated (custom) elements only — real void elements like `<img/>` must keep their form.
- **Worth noting**: this is the same hazard `packages/prose-qti/src/components/shared/roundtrip-xml-to-pm.ts` already documents and works around for `qti-gap`. Any consumer that feeds the editor's XML output to an **HTML** parser will hit it. If items are ever delivered that way, the export should emit explicit closing tags.

## 14. Pointer-drag cannot be driven by Playwright — but a keyboard path exists — **partly resolved**

> **Correction.** This entry first claimed drag interactions could not be driven at all. That was wrong: `drag-drop-core.mixin.ts` implements a full keyboard placement protocol, verified working. Only the *pointer* drag remains undriveable. The tests now use the keyboard path.

**The keyboard protocol** (`packages/interactions/core/src/mixins/drag-drop-observables/drag-drop-core.mixin.ts:509-574`):

| key | effect |
| --- | --- |
| `Space` / `Enter` on a focused draggable | grab it (sets `data-keyboard-dragging`), drop target index = 0 |
| `ArrowRight` / `ArrowDown` | next drop target (wraps) |
| `ArrowLeft` / `ArrowUp` | previous drop target (wraps) |
| `Space` / `Enter` / `Tab` | drop at the current target, then `saveResponse()` |

Drop targets are `[...trackedDroppables, ...trackedDragContainers]`. Verified end to end against ITEM013.

**Pointer drag still cannot be driven.** `locator.dropTo()` and `userEvent.dragAndDrop()` both hang on Playwright's actionability check ("waiting for element to be visible and stable"), even though the element measures as stable across six consecutive frames with zero running animations. Note the mixin filters `pointerdown` on `e.isTrusted` (line 357) — CDP events *are* trusted, so that is not the cause; the blocker is upstream of the component, in Playwright's own pre-click checks.

- **Consequence**: the keyboard placement path is covered; the mouse path is not. A regression that broke only pointer dragging would still pass.
- **Follow-up**: worth a separate investigation into why Playwright refuses to act on these elements (candidate: the hit-target check against a shadow-DOM overlay or the `touch-action: none` container).



order, match and gap-match use a **pointer-based** drag implementation (`qti-draggable="true"`, `cursor: grab`, `touch-action: none`, `qti-droppable="true"` on the targets). Neither `locator.dropTo()` nor `userEvent.dragAndDrop()` engages it — both hang and time out:

```
frame.dragAndDrop: Timeout 59557ms exceeded.
  - locator resolved to <p>Hypothese formuleren</p>
  - attempting move and down action
    - waiting for element to be visible and stable
```

The element is **not** actually unstable — measured directly, its box is identical across six consecutive animation frames, with zero running animations:

```
rect samples: 8.0,50.0 180.6x68.0 | (×6, identical)
animations: 0   computed transition=all animation=none
```

Click-to-place does not work either: clicking a choice focuses it (`activeElement = QTI-SIMPLE-CHOICE`) but stages nothing, and a follow-up click on a drop region times out.

- **Consequence**: ITEM007–010, ITEM013–015 and ITEM017 still stage responses through `updateResponseVariable`, bypassing the UI. Their scoring is well covered (correct / incorrect / partial), but **the drag gesture itself is untested** — a regression that broke dragging entirely would not fail any test.
- **Next steps to try**: (a) a manual `pointerdown` → `pointermove`×N → `pointerup` sequence at the CDP level (vitest does not expose `page.mouse`, so this may need a custom locator or a Playwright escape hatch); (b) check whether the components expose a keyboard placement affordance — the order choices carry `tabindex="0"`, which suggests one was intended; (c) if neither, adding an accessible keyboard path upstream would make these testable *and* usable without a mouse.
- This is the single largest remaining gap in the interaction suite.

## 15. Associate export downgrades `base-type="pair"` to `"identifier"` — **moot, associate removed** (scoring bug)

Kept because the bug is real and was never fixed — it is waiting for whoever restores associate, and
the tests that pinned it are in the archive rather than in the repo. Nothing in the editor can hit it
today: qti-associate-interaction is gone from the schema, the descriptor registry, the insert menu
and the corpus.

Found by adding a reversed-pair scoring test to ITEM017.

```
source  (public/qti/kennisnet/ITEM017.xml):
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
export  (ITEM017-editor.xml):
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
```

A QTI `pair` is **unordered**: `A O` and `O A` denote the same association. Downgraded to `identifier`, the values become opaque strings and only the exact authored order matches.

- **Consequence**: a candidate who associates Obelix→Asterix scores 0 where Asterix→Obelix scores 1. The association is symmetric in the question but not in the scoring.
- **Secondary**: `A O` contains a space, which is not a valid QTI identifier — so the exported declaration is questionable on its own terms.
- **Why it hid**: the previous test staged only the exact correct strings, so the distinction never arose. This is the clearest example of why correct-*and*-incorrect assertions matter.
- **Was pinned by**: two tests in `item017-qti-associate-interaction.regression.browser.test.ts` — one on runtime scoring, one asserting the exported `base-type` directly. Both live in the removal archive; restore them with the interaction and flip them when fixed.
- **Where to look**: the associate composer metadata / `composeAssociateInteractionElement`, plus `roundtripAssociate` (finding #7 — deleted at the same time).

## 9. `schema:check` and `typecheck` were not enforced — **fixed, then obsolete**

`pnpm schema:check` existed specifically to catch drift between `schema/content-model.json` and the generated model, and was never wired into CI. Likewise three packages define `typecheck` scripts that nothing ran. Both were made CI steps.

`schema:check` is since **gone**, along with the generated content model it checked. That export existed for out-of-process consumers who never arrived; the conversion runs in Node now and callers build the real schema with `createQtiSchema()`. What remains in `schema/` runs as ordinary browser tests. The `typecheck` half of this finding stands.

An out-of-process consumer that wants the grammar as data now has `schemaToJson()` (`@citolab/prose-qti/schema` and `/node`) instead — a function returning a value, not a generator writing a committed file. No fixture gating comes back with it: a fixture of a projection has to be re-blessed whenever the schema moves, which is exactly the drift-hiding failure mode this finding is about.

A single root `tsc -p tsconfig.json` is **not** viable (161 errors from `apps/*` compiler-option conflicts — missing `jsx`, duplicate `HTMLElementTagNameMap`); typechecking fans out per project instead.

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

The regression stories imported only `prosemirror-view/style/prosemirror.css`. The shipping editors load two more (`apps/qti-prosemirror-item/src/app.css`, and the extracted editor app's own `src/style.css`):

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

A single root `tsc -p tsconfig.json` is **not** viable (161 errors from `apps/*` compiler-option conflicts — missing `jsx`, duplicate `HTMLElementTagNameMap`); typechecking fans out per project instead.

## 16. Three unscoped parse rules let nodes escape their intended context — **fixed**

Found while removing `qti-layout-*` wrappers from QTI-Coco's sample items — the wrappers had been masking all three. Any item body not wrapped in a layout div already hit the first two:

1. `qtiSimpleAssociableChoiceParagraph`'s parse rule was a bare `{ tag: 'p' }`, unlike its sibling `qtiSimpleChoiceParagraph` (`context: 'qtiSimpleChoice/', priority: 60`). It matched **every** `<p>` in the document, and ProseMirror synthesises whatever parent a matched node needs — so ordinary prose came back wrapped in a stray drag-and-drop answer chip. Four visible symptoms traced to this one line: chips around plain paragraphs, rubric text escaping its block, an empty feedback box on ITEM016, and gap-match gaps rendering 80×0 because the paragraph holding them was hoisted out of the interaction that sizes them.
2. `imgSelectPoint`'s rule matched **every** `<img>`, so any illustration anywhere in the document became the select-point interaction's clickable canvas and rendered at container width.
3. A different but related mistake in a content expression, not a parse rule: an emptied document refilled itself with a rubric block containing an empty table. `doc` was `content: 'block+'` and `qtiRubricBlock` was `content: 'richtext+'`; ProseMirror fills an empty node via `ContentMatch.defaultType` — the first edge of the expression — and for a bare group reference that's whichever node registered first in the group (`qtiRubricBlock` and `table` respectively). Naming `paragraph` first in both (`'(paragraph | block)+'` / `'(paragraph | richtext)+'`) makes it the filler without changing the accepted node set.

- **Consequence**: any editor content outside a `qti-layout-*` wrapper was at risk of silently misrendering; this was hidden in the existing regression corpus because every fixture happened to use layout divs.
- **Resolution**: scoped both parse rules — `qtiSimpleAssociableChoiceParagraph` to `context: 'qtiSimpleAssociableChoice/', priority: 60` and `imgSelectPoint` to `context: 'qtiSelectPointInteraction/', priority: 60` — matching the pattern their siblings already used. Rebuilt the `doc` node spec directly (`defineQtiDoc()` in `packages/prose-extensions`) rather than patching `defineDoc()` a second time, since a second `defineNodeSpec({ name: 'doc', … })` does not win the merge and `content` silently stays `block+` — the same trap already documented for paragraph's group.
- **VRT**: item016's baseline was re-blessed for an unrelated, coincident upstream change (the `@qti-components` catalog pin moved to `9a2532b`, which stops the select-point marker painting its prompt text via an inherited `color`) — a 0.454% diff confined to the prompt line.
- **Not fixed here**: the `image` node is block-level while QTI's XSD requires `img` inside a block, and the node spec has no `alt` attribute, so alt text is destroyed on every round trip. Needs a design decision, not a scoped selector. Recorded in `plans/prose-qti-parse-rules-and-image-roundtrip.md`.

## 17. Every interaction's shadow tree rendered taller than its content — **fixed**

Measured on `qti-hottext-interaction`: a 181px box around 60px of text.

The extra height was lit's own template formatting. Newlines and indentation between elements in a component's `render()` become real text nodes in its shadow root. Under `white-space: normal` they collapse to nothing, which is why they're normally invisible — but ProseMirror sets `white-space: break-spaces` on `.ProseMirror` so authors' typed spaces survive, and `white-space` is inherited across the shadow boundary, so every one of those stray nodes became a line box.

- **Resolution**: a shared `editorWhiteSpace` reset (`packages/prose-qti/src/components/shared/styles/white-space.ts`), applied per-component like `boxSizing` already is — a shadow tree has to opt in, since a rule in the document can't reach across the boundary on its own. Two rules, both load-bearing: `:host { white-space: normal }` collapses the stray template nodes, and `::slotted(*) { white-space: break-spaces }` puts the author-facing behavior back, because slotted content inherits from the host in the *light* tree and would otherwise silently collapse typed double spaces.
- **Scope**: only `prose-qti`'s editing components changed. The runtime elements in `@qti-components/*` are untouched — a player still renders the XML's own indentation, which is correct there.
- **VRT**: five baselines re-blessed, all shrinking as the phantom space goes (item011 1618px → 1022px, item012 366 → 194, item013 502 → 354, item014 702 → 554; item002 keeps its frame and compacts internally). Content compared old against new before blessing.

## 18. Pasting from Word could duplicate or overwrite images — **fixed**

Word (and Excel, PowerPoint, Outlook) put two things on the clipboard on copy: the real `text/html` content, and a single PNG rendering of the whole selection, meant as a fallback for paste targets that cannot read HTML. `getClipboardImageFiles` in `paste-semantic-html/semantic-paste-plugin.ts` treated that PNG as image content unconditionally, which surfaced as two separate bugs:

- **Duplicate images**: the function read both `DataTransfer.items` and `.files` and deduplicated with a `Set<File>`, on the assumption that the same clipboard image would be `===` across both. It isn't — Blink builds `files` by calling `getAsFile()` on each file item, and for a clipboard-sourced item that mints a NEW `File` object every call. The identity check never matched, so the fallback PNG was inserted twice. A synthetic `DataTransfer` built in a test caches a real `File` on that call, so this bug is invisible to any test that builds its own clipboard rather than driving a real paste.
- **Overwritten images**: a paste containing one real embedded `<img>` alongside the fallback PNG had the PNG hydrate the image node too, so the first real figure in a mixed paste got replaced by a screenshot of everything around it.

- **Resolution**: the fallback PNG is now only treated as content when there is no usable HTML, or the HTML's own images are all unloadable (e.g. Word's `file:///...clip_image001.png` paths) and match the clipboard images one-for-one. An embedded, loadable `<img>` in the pasted HTML is always kept as-is.
- **Where to look**: `packages/prose-extensions/src/prosemirror/paste-semantic-html/semantic-paste-plugin.ts`, pinned by `semantic-paste-plugin.browser.test.ts`.

## 19. Gap cursor between two block interactions had no writable space, then opened the wrong node — **fixed**

Two bugs stacked on top of each other in `qti-layout-row`-nested interactions (imported side-by-side content) and, more generally, anywhere the schema's `block` group has more than one textblock.

- **No gap cursor at all**: `qtiLayoutDivNodeSpec` admits `block+`, which should make the collapsed space between two interactions a legitimate cursor position — but `prosemirror-gapcursor` decides by reading `contentMatchAt(index).defaultType` and asking whether *that* is a textblock. `defaultType` is the first admitted type with no required attributes, which for `block+` resolved to `qtiItemDivider`, not a textblock. The heuristic said no at every position between two interactions. Fixed by setting `allowGapCursor: true` explicitly on the node spec, which is the library's override for when the caller knows better than the heuristic.
- **Wrong node when typing**: fixing reachability alone surfaced the second bug. Typing at a gap cursor goes through ProseMirror's default `replaceRange`, which wraps the bare text using `findWrapping(schema.nodes.text)` — a breadth-first search that returns the shortest wrapping. Every textblock in the `block` group is depth one, so they all tie, and the tie is broken by schema registration order, an implementation detail of extension union order. Measured order in this schema: `qtiSimpleChoiceParagraph, qtiPromptParagraph, heading, paragraph` — so typing between two interactions produced a `qtiSimpleChoiceParagraph` loose at item-body level, not a `paragraph`.
- **Resolution**: `defineGapCursorParagraph()` (`packages/prose-extensions/src/prosekit/gap-cursor-paragraph.ts`), added to `defineBasicExtension()`, claims the keystroke via `handleTextInput` before the default handling runs and names `paragraph` outright, so no future schema change can shift the tie-break again.
- **Where to look**: `packages/prose-extensions/src/prosekit/gap-cursor-paragraph.ts` and `gap-cursor-paragraph.browser.test.ts`; the layout-div side is `packages/prose-qti/src/schema/qti-layout-div.ts`.

## 20. Five interaction-internal nodes could be inserted loose at item-body level — **fixed**

`qtiGapText`, `qtiPromptParagraph`, `qtiSimpleChoiceParagraph`, `qtiSimpleMatchSet` and `qtiSimpleAssociableChoice` carried `group: 'block'` alongside their real home (named directly in their parent interaction's content expression). `block` means "may appear in an item body", so this made all five candidates for `ContentMatch.defaultType`, `defaultBlockAt` and `findWrapping` — every one of ProseMirror's own-initiative "what goes here?" lookups, all of which resolve ties by group registration order rather than intent. `qtiGapText` registered early enough to win: pressing `Enter` inside an item body inserted a gap-match answer chip (`<qti-gap-text/>`) loose at the top level, which is not valid QTI.

- **Resolution**: all five nodes now declare no `group` at all, matching the existing convention already used by `qtiPrompt`, `qtiSimpleChoice` and `qtiSimpleAssociableChoiceParagraph`. They are reachable only by being named in their parent's content expression, which is also the only place they are legal. Pinned by `packages/prose-qti/src/schema/block-group.browser.test.ts`, which asserts the `block` group's exact node-name membership rather than deriving it — whether a node belongs in an item body is a judgment about the QTI format, not something the schema graph can answer on its own.
- **Not fixed by this**: `imgSelectPoint` (named by `qtiSelectPointInteraction`) stays in `block qtiMedia` — it is an atom, so it cannot win `defaultBlockAt`, but it can still win `defaultType`. Recorded as a known gap in the test itself rather than silently left out.
- **Migration**: this narrows the schema, so a document that already had one of these nodes loose at item-body level is now invalid rather than merely odd. Hosts that persist documents need to migrate them; that ladder lives in the extracted `qti-editor-full-assessment` repository, not here.
- **Where to look**: `packages/prose-qti/src/schema/create-qti-schema.ts` ("The block group" section) and `block-group.browser.test.ts`.

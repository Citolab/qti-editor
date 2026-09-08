# Choice interaction decorator — port into `packages/prose-qti`

## Context

`QTI-Editor-angular` has a working editor affordance for the choice interaction — a ProseMirror
decoration plugin that reveals the interaction's boundaries on hover and, once you click into it,
offers buttons to add and remove choices. It was originally written in this repo (local branch
`choice-decorator`), moved into the Angular app to let the design settle, and has since been
refined there. The design has settled, so it comes home.

It comes home as **the first of a family**: the goal is that every QTI interaction eventually has a
decorator with the same shape — hover shows the boundary and what is inside it, focus/click shows
add/remove affordances — and that the look of all of them is retargetable from a handful of CSS
custom properties rather than by restating selectors. This plan ports the choice decorator and, in
doing so, lays down the descriptor field, the composer helper, the host extension, and the token
set that the other interactions will reuse unchanged.

Two things make the port small: everything the Angular file imports (`createSimpleChoiceNode`,
`translateQti`, and the `choice.removeOption` / `choice.addOption` / `interaction.settings` message
keys in both en and nl) **already exists in this package**. The work is placement, wiring, CSS, and
tests — not new mechanism.

### Decisions taken

- The decorator is exposed via a **new, opt-in** descriptor field, not the existing
  `pluginFactories`. `pluginFactories` is auto-installed by every ProseKit host
  ([prosekit.ts:80](packages/prose-qti/src/integration/interactions/prosekit.ts#L80)); authoring
  affordances must not appear in a read-only or player host by default.
- The hover view outlines **the interaction and each choice inside it**, going a step beyond the
  Angular version, which tints the block only.
- CSS ships as a **separate opt-in stylesheet**, pairing with the opt-in plugin.
- The ⚙ settings pill and its `qti:node-settings:open` event are **kept**. The pill mutates nothing;
  a host with no listener simply gets an inert pill.

### Known-stale assumption to fix during the port

The Angular CSS header claims `--qti-edit-interaction-hover-bg` is consumed by core-css's
`.ProseMirror [response-identifier]:hover`, and therefore only *re-points* it. **No such rule and no
`--qti-edit-*` declaration exists in this repo** — `grep -rn 'qti-edit\|response-identifier'` over
[core-css/](packages/prose-qti/src/core-css/) returns nothing, and
[editor-states.css](packages/prose-qti/src/core-css/editor-states.css) is deliberately paint-free.
So the hover tint currently paints nothing. The ported CSS must **declare** the rule and the tokens
itself, and the header comment must be rewritten to say so. Do not copy that paragraph across.

---

## 1. The plugin

**New:** `packages/prose-qti/src/components/choice/extensions/choice-decorations.ts`

Port [qti-choice-interaction.decorator.ts](../../QTI-Editor-angular/src/app/editor/decorations/choice/qti-choice-interaction.decorator.ts)
(336 lines) essentially verbatim. `extensions/` is the established home for per-interaction plugins
— see [hottext](packages/prose-qti/src/components/hottext/), inline-choice, gap-match.

Keep as-is: `props.decorations` derived fresh from state (this is what makes "pill only while the
selection is inside" free), the emit-after-the-node placement rule and the per-position
`anchor-name` minting (both have load-bearing comments explaining *why* — CSS anchor positioning
cannot anchor to an ancestor, and duplicate anchor names collapse every box onto the last one), the
`childCount <= 2` delete guard, `withoutIdentifier` correct-response cleanup, `ignoreSelection` +
`stopEvent` + `mousedown` preventDefault, and the walk over `qtiChoiceInteraction` children rather
than a global `qtiSimpleChoice` match (order interaction shares that node).

Changes on the way in:

- Imports move from the package subpaths to relative in-package paths:
  `createSimpleChoiceNode` from
  [insert-choice-interaction.commands.ts:23](packages/prose-qti/src/components/choice/components/qti-choice-interaction/commands/insert-choice-interaction.commands.ts#L23),
  `translateQti` from [shared/i18n](packages/prose-qti/src/components/shared/i18n/index.ts).
- Rewrite the header. Drop the "deliberately app-local / ported from qti-editor" section — it is now
  false. Replace with: what the three affordances are, the anchor-positioning constraint, and a note
  that this is the reference implementation other interactions' decorators should follow.
- Keep `QTI_OPEN_NODE_SETTINGS_EVENT` and `QtiOpenNodeSettingsDetail` exported. They are the
  host-facing contract and are already generic over `nodeTypeName`/`tagName`, so the other
  decorators will emit the same event.

Re-export from [components/choice/index.ts](packages/prose-qti/src/components/choice/index.ts)
(`export * from './extensions/choice-decorations.js';`). No `package.json` or `tsconfig.base.json`
change is needed — the `./components/choice/*` wildcard export and the mirrored path map already
cover it.

## 2. Descriptor + composer + host extension

The new API, sized for the whole family rather than for choice alone.

**[interfaces/descriptor.ts](packages/prose-qti/src/interfaces/descriptor.ts)** — add to
`InteractionDescriptor`:

```ts
/**
 * Editor-only affordance decorations (hover boundary, add/remove buttons).
 * Kept apart from `pluginFactories`, which every host installs unconditionally:
 * these are an opinion about how authoring should feel, and a read-only or
 * player host must not get them. Hosts opt in via
 * `defineQtiDecorationsExtension()` / `listInteractionDecoratorPluginFactories()`.
 */
decoratorPluginFactories?: Array<() => Plugin>;
```

**[core/interactions/composer.ts](packages/prose-qti/src/core/interactions/composer.ts)** — add
`listInteractionDecoratorPluginFactories()` and `listSelectedInteractionDecoratorPluginFactories({ include })`,
mirroring the existing `listInteractionPluginFactories` / `listSelectedInteractionPluginFactories`
pair at lines 136–148 exactly.

**[components/choice/descriptor.ts](packages/prose-qti/src/components/choice/descriptor.ts)** — add
`decoratorPluginFactories: [createChoiceInteractionDecoratorPlugin]`.

**[integration/interactions/prosekit.ts](packages/prose-qti/src/integration/interactions/prosekit.ts)** —
add a standalone `defineQtiDecorationsExtension()` that maps the decorator factories through
`definePlugin` and `union`s them, following the existing line-80 pattern. Do **not** fold it into
`defineQtiExtension()`; hosts compose it themselves.

## 3. Styling and the token contract

**New:** `packages/prose-qti/src/core-css/decorations.css`, ported from
[choice-decorations.css](../../QTI-Editor-angular/src/app/editor/decorations/choice/choice-decorations.css).

Not `@import`ed from `core-css.css` — it is opt-in. Add one line to
[package.json](packages/prose-qti/package.json) `exports`, next to line 247:

```json
"./decorations.css": "./dist/core-css/decorations.css",
```

The build script's `cp src/core-css/*.css dist/core-css/` glob already picks the file up; **no build
script change**.

Split the file into two clearly commented halves, because that split is the reusable part:

**a. Generic token block + shared `.qti-decoration` base** — the contract every future decorator
inherits. Rename the Angular file's `.qti-choice-decoration*` classes to `.qti-decoration*` with the
per-affordance modifiers (`--remove`, `--add`, `--settings`) staying as they are, and update the
class strings in the plugin to match. Declare at `:root`, each aliased from `@qti-components/theme`
with a hard fallback — this is the "adjustable with a few CSS variables" surface:

| Token | Role | Default |
|---|---|---|
| `--qti-edit-decoration-fg` | idle icon colour | `var(--qti-border-color, #9b77a9)` |
| `--qti-edit-decoration-accent` | the `+` | `var(--qti-primary, #581d70)` |
| `--qti-edit-decoration-danger` | the `×` on hover | `var(--qti-error, #df0000)` |
| `--qti-edit-decoration-hover-bg` | button hover wash | `var(--qti-hover-bg, #f9fafb)` |
| `--qti-edit-decoration-settings-bg` | pill fill **and** the active ring | `var(--qti-info, #007ac3)` |
| `--qti-edit-decoration-settings-fg` | pill text | `var(--qti-primary-fg, #fff)` |
| `--qti-edit-decoration-radius` | button/pill rounding | `var(--qti-field-border-radius, 0.25rem)` |
| `--qti-edit-interaction-hover-bg` | boundary tint | `color-mix(in srgb, var(--qti-info, #007ac3) 8%, white)` |
| `--qti-edit-interaction-hover-radius` | boundary rounding | `0.5rem` |
| `--qti-edit-interaction-hover-inset` | boundary padding / ring offset | `0.5rem` |
| `--qti-edit-child-outline` | per-child outline on hover | `1px dashed color-mix(in srgb, var(--qti-info, #007ac3) 40%, transparent)` |

Keep the existing consumption of `--qti-motion-duration-fast`, `--qti-padding-vertical`,
`--qti-padding-horizontal`, `--qti-overlay-z-index`. Keep the file **unlayered** — the
kennisnet-edit.css convention is that app CSS wins, and the Angular header's argument for why
layering is the wrong tool here is sound and worth carrying over.

**b. Choice-specific block** — hover/active states on `qti-choice-interaction`, the
`:has(+ .qti-decoration--settings)` active ring (ProseMirror keeps DOM focus on the editable root,
so `:focus-within` never matches — this selector *is* the "clicked into" state, and it is
deliberately the same condition that governs the pill), the `qti-simple-choice { width: auto;
padding-right: 2rem }` sizing override, and the transparent-choice-background rule.

Two substantive changes here:

- **Declare the hover tint outright.** Add the real rule this file has been assuming:
  `qti-choice-interaction:hover { background-color: var(--qti-edit-interaction-hover-bg); box-shadow: 0 0 0 var(--qti-edit-interaction-hover-inset) var(--qti-edit-interaction-hover-bg); }`
  — a spread shadow rather than padding, so nothing reflows on hover.
- **Add the child outline** (the new requirement):
  `qti-choice-interaction:hover qti-simple-choice { outline: var(--qti-edit-child-outline); outline-offset: 2px; }`,
  suppressed while the interaction is active so the ring is the only strong signal.

Keep the `@position-try --qti-settings-below` fallback for the pill.

## 4. Hosts

- **[apps/qti-example-editor/src/prosemirror-qti.ts:115](apps/qti-example-editor/src/prosemirror-qti.ts#L115)** —
  append `...listInteractionDecoratorPluginFactories().map(f => f())` to `qtiPlugins`, and import
  the stylesheet. This app has
  [attributes-panel-plugin.ts](apps/qti-example-editor/src/components/attributes-panel-plugin.ts),
  so wire `QTI_OPEN_NODE_SETTINGS_EVENT` on the **editor container** (not `view.dom` — a widget
  decoration can sit outside the editable root) to `NodeSelection.create(doc, pos)` + the panel's
  scope meta, the way the Angular app does at `app.ts:302–329`.
- **[.storybook/preview.ts:21](.storybook/preview.ts#L21)** — import the source stylesheet so the
  affordances are visible in Storybook and to VRT.
- **[apps/qti-example-editor/vite.config.ts:24](apps/qti-example-editor/vite.config.ts#L24)** — add
  the source alias for `@citolab/prose-qti/decorations.css`, mirroring the `core-css.css` entry.

## 5. Follow-up note for the rest of the family

Record in the package — a short section in the plugin's header comment plus a line in the repo's
architecture docs — that the intended end state is a decorator per interaction, all emitting
`qti:node-settings:open`, all reusing the `.qti-decoration*` classes and the `--qti-edit-*` tokens
above, with only the add/remove semantics differing per interaction. Order, match, gap-match and
associate are the natural next ones; nothing in this plan implements them.

---

## Verification

1. `pnpm --filter @citolab/prose-qti build` — confirm `dist/core-css/decorations.css` is emitted by
   the existing glob and that the new `exports` subpath resolves.
2. `pnpm test` — the unit suites, for regressions in the choice commands.
3. **New test** `packages/prose-qti/src/components/choice/extensions/choice-decorations.browser.test.ts`,
   colocated per convention. Model the decoration-count assertions on
   [schema-recovery.browser.test.ts:308](packages/prose-qti/src/schema-recovery/schema-recovery.browser.test.ts#L308)
   and the mounted-view click assertions on
   [semantic-paste-plugin.browser.test.ts](packages/prose-extensions/src/prosemirror/paste-semantic-html/semantic-paste-plugin.browser.test.ts).
   Cover: one `×` per choice and none when only one choice remains; `+` appends a node structurally
   identical to Enter's; removing a choice strips its identifier from `correctResponse`; the pill is
   emitted only while the selection is inside; `qtiSimpleChoice` inside an **order** interaction gets
   no decorations.
4. **VRT.** `.regression-item` is the capture target and all three affordances render inside it, so
   they will be captured. Capture runs *after* `play`, so add stories to
   [apps/e2e/stories/item001-qti-choice-interaction.regression.stories.ts](apps/e2e/stories/item001-qti-choice-interaction.regression.stories.ts)
   whose `play` leaves the editor hovered and, separately, clicked-into. Baseline with
   `pnpm run test:vrt:update`, then confirm a clean `pnpm run test:vrt`.
5. **By hand** in `qti-example-editor`: hover a choice interaction and check the boundary tint plus
   the per-choice outlines; hover a row and check the `×` appears and stays up as the pointer
   travels to it; click in and check the ring and pill; `+` adds a choice with the caret landing in
   it; delete down to one choice and confirm the last `×` disappears; confirm the pill opens the
   attributes panel scoped to that interaction. Then set `--qti-edit-decoration-settings-bg` and
   `--qti-edit-interaction-hover-radius` in app CSS and confirm the whole affordance set retargets
   without touching a selector.
6. Export a round-tripped item and diff the XML — decorations are view-only and must leave it byte-identical.

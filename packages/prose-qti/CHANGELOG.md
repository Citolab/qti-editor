# @citolab/prose-qti

## 1.24.1

### Patch Changes

- Updated dependencies [[`919e693`](https://github.com/Citolab/qti-editor/commit/919e693e24fc17b5cae606c97354539d9d9d5e2f)]:
  - @citolab/prose-extensions@1.8.1

## 1.24.0

### Minor Changes

- [`523241c`](https://github.com/Citolab/qti-editor/commit/523241c7ce4d645a4c3cf03b31a7366b7ff806f4) Thanks [@denisebroekman](https://github.com/denisebroekman)! - Add an opt-in "opmaak wissen" (clear formatting) command and extension.
  
  `defineClearFormattingExtension()` registers a `clearFormatting` ProseKit command bound to `Mod-\`,
  built on `@citolab/prose-extensions`'s new `clearFormattingInRange`. Running it on a selection resets
  marks and block types back to plain paragraphs, splitting the selection around any interaction it
  spans so interaction subtrees are never touched — interaction nodes aren't reliably distinguishable
  from plain content by schema `group` alone.
  
  New API, all additive:
  
  - `clearFormatting()` — the underlying `Command`, exported from the new `@citolab/prose-qti/commands`
    entry point (cross-cutting editing commands that aren't per-interaction and aren't composition,
    which stays `core`'s scope).
  - `defineClearFormattingExtension()` from `@citolab/prose-qti/integration/interactions/prosekit` —
    deliberately not folded into `defineQtiExtension()`, same reasoning as the decorator extension:
    this is an authoring affordance, not something a read-only or player host needs.
  
  Existing hosts are unaffected unless they union the new extension in.

### Patch Changes

- Updated dependencies [[`523241c`](https://github.com/Citolab/qti-editor/commit/523241c7ce4d645a4c3cf03b31a7366b7ff806f4)]:
  - @citolab/prose-extensions@1.8.0

## 1.23.4

### Patch Changes

- Updated dependencies [[`dd4d078`](https://github.com/Citolab/qti-editor/commit/dd4d078350ef0b92b3720e367aad2fd24d725c37)]:
  - @citolab/prose-extensions@1.7.1

## 1.23.3

### Patch Changes

- [#73](https://github.com/Citolab/qti-editor/pull/73) [`3ebd0f5`](https://github.com/Citolab/qti-editor/commit/3ebd0f5ca9d11f980a0165a97a992add22fd7368) Thanks [@denisebroekman](https://github.com/denisebroekman)! - The `qti-inline-choice-interaction` dropdown could open positioned at the top-left corner of the
  viewport instead of below its trigger. The generic interaction decorator sets `anchor-name` as an
  inline style directly on an interaction's own element, for the floating action pill — and
  inline-choice needs that same property on that same element for its own dropdown popover. The
  decorator's inline style silently overwrote it, so the popover's `anchor()` references resolved to
  nothing.
  
  Every decorated interaction now gets a NodeView that wraps its own element in a bare `<div>`/`<span>`
  with no box of its own beyond the tag's default, and the decorator's `anchor-name` (and its
  "clicked into" wash class) land on that wrapper instead — the interaction's own use of the property,
  where it has one, is never touched.

## 1.23.2

### Patch Changes

- [#71](https://github.com/Citolab/qti-editor/pull/71) [`2d5a008`](https://github.com/Citolab/qti-editor/commit/2d5a0081b8f9b4131c28780d237791adfb7b8bee) Thanks [@denisebroekman](https://github.com/denisebroekman)! - Three editor-affordance fixes, bundled as one patch:
  
  **Gap-match selected/pending states.** Picking up a `qti-gap-text` choice and finding a gap to drop
  it in had no visual cue: the selected chip carried no styling at all, and the gaps it could go in
  only got a background so faint it read as decoration rather than an affordance. Both now use the
  accent color the theme already reserves for selection (`--qti-primary`): a solid outline on the
  picked chip, a dashed outline and tint on the gaps it can be dropped into. The same rule also covers
  the equivalent states on `qti-match-interaction` and `qti-associate-interaction`, which share the
  hook.
  
  **Choice interaction active margin.** The `+` that appends a new choice is anchored below the last
  one and sits outside document flow, so nothing reserved room for it — in a document with content
  right after a `qti-choice-interaction`, the `+` rendered on top of that content instead of below it.
  The interaction now gets extra bottom margin while the selection is inside it, sized to clear the
  `+`, and transitions in rather than shifting the layout abruptly.
  
  **Inline-choice menu uses a native popover.** `qti-inline-choice-interaction`'s dropdown was kept in
  normal document flow on purpose, so it could size the trigger to the widest option without
  measuring — but that meant it could still be clipped by a table, the editor's own card, or any other
  scrolling ancestor, not just the table case an earlier fix targeted. The menu now uses upstream's
  native popover, so it always renders above any clipping ancestor. Trigger width is measured via
  `MenuAutoSizeMixin` in its place, writing the result inside the element's own shadow root rather
  than onto the ProseMirror-managed host, which is what keeps this measurement from tripping the
  freeze the original in-flow layout was built to avoid.

## 1.23.1

### Patch Changes

- [#67](https://github.com/Citolab/qti-editor/pull/67) [`5596485`](https://github.com/Citolab/qti-editor/commit/55964853b6ced784933fbfa5e2a2707986b0de63) Thanks [@feyst](https://github.com/feyst)! - An image inside a `qti-simple-choice` or a `qti-prompt` survives the round trip. Both paragraph
  nodes were `text*`, so an authored `<img>` — a picture as the answer itself — was dropped on import
  and a pasted one was flattened to its `alt` text; `removeEmptyPrompts` then dropped a prompt whose
  only content was that picture, because it keyed emptiness on text alone. Content widened to
  `(text | image)*`, leaving the other inline nodes out.
  
  `qtiPromptParagraph` is shared, so select-point prompts can now hold an image too. Its two
  `querySelector('img')` lookups are scoped to `:scope > img`, as the live component already does, so
  a picture in the prompt is never mistaken for the select-point graphic.

- [`66c7d18`](https://github.com/Citolab/qti-editor/commit/66c7d18a1adac0f7a172ecf128801a31dd98d88c) Thanks [@denisebroekman](https://github.com/denisebroekman)! - An open `qti-inline-choice-interaction` menu inside a table cell was invisible, not just clipped
  at the edge — ProseMirror's table wrapper scrolls horizontally and the table itself clips for its
  own layout, and the menu is deliberately in-flow (it's what sizes the trigger), so both caught it
  in full.
  
  `InteractionPanel` now reflects its own open state as the transient `:state(open)` via
  `ElementInternals`, and a document-level rule lifts that table's overflow while the state is set.
  The interaction never learns a table is even possible, let alone which implementation — and any
  future panel-based interaction gets the same table safety for free, since the rule matches the
  state, not the tag.

## 1.23.0

### Minor Changes

- [`ad53f41`](https://github.com/Citolab/qti-editor/commit/ad53f41d5776cb73d8c5c6793f53f656d3841b3d) Thanks [@herrKlein](https://github.com/herrKlein)! - Choice interaction decorator: a click into the interaction paints a gray wash and shows the `+`
  and the action pill; typing or Escape hides them and only the next click brings them back. The
  hover tint, dashed per-choice outline and selection rings are removed, the `+` is anchored below
  the last choice instead of taking up space, icons use a neutral ink, and `editor-states.css` makes
  `qti-simple-choice` transparent in the editor. The exported assessment item now declares
  `xmlns:xsi` explicitly so Node-side serialization validates.

### Patch Changes

- [`d72becd`](https://github.com/Citolab/qti-editor/commit/d72becdfbdbed8c944182f2b1c49032ee14e80e7) Thanks [@herrKlein](https://github.com/herrKlein)! - Choice decorator: offer the remove (×) affordance on interactions without a `qti-prompt`. The
  decorator counted choices as `childCount - 1`, assuming a prompt that the schema makes optional, so
  promptless two-choice interactions showed no × at all.
- Updated dependencies [[`3fb7ccd`](https://github.com/Citolab/qti-editor/commit/3fb7ccd46432849f6a1c6a3e4bb99e7ea9a508c7)]:
  - @citolab/prose-extensions@1.7.0

## 1.22.0

### Minor Changes

- [#57](https://github.com/Citolab/qti-editor/pull/57) [`4a89995`](https://github.com/Citolab/qti-editor/commit/4a899954dd625b589fd70ecf1133ff8a89e46834) Thanks [@herrKlein](https://github.com/herrKlein)! - Add an opt-in choice interaction decorator providing editor affordances
  
  Choice interactions can now render editor-only decorations: a hover boundary
  around the interaction and its choices, plus add/remove buttons for choices.
  
  New API, all additive:
  
  - `decoratorPluginFactories` on `InteractionDescriptor` — an optional array of
    plugin factories held apart from `pluginFactories`, which every host installs
    unconditionally. Decorations are an opinion about how authoring should feel, so
    a read-only or player host must not receive them.
  - `listInteractionDecoratorPluginFactories()` and
    `listSelectedInteractionDecoratorPluginFactories()` to retrieve them.
  - `@citolab/prose-qti/decorations.css` — the decoration styling, exported as its
    own entry point and **not** included in `qti-prose.css`. A host that wants the
    affordances imports it explicitly.
  
  Existing hosts are unaffected: without importing the stylesheet and opting into
  the decorator factories, nothing changes.

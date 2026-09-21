# @citolab/prose-qti

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

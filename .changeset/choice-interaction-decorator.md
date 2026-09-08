---
"@citolab/prose-qti": minor
---

Add an opt-in choice interaction decorator providing editor affordances

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

---
'@citolab/prose-qti': minor
---

Add an opt-in "opmaak wissen" (clear formatting) command and extension.

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

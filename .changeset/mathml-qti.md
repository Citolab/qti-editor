---
'@citolab/prose-qti': minor
---

Keep MathML through import and export. A `<math>` formula used to be dropped on load, with only its
digits left as text. It now round-trips in running text and in interactions:

- `qti-simple-choice` and `qti-prompt` paragraphs accept `(text | image | mathml)*`.
- `qti-simple-associable-choice` is `inline*` and already accepted it.
- `qti-inline-choice`, `qti-hottext` and `qti-gap-text` accept `(text | mathml)*`.

The node reaches every host that uses the interactions:

- `listInteractionSchemaNodeSpecs()` includes `mathml` for any selection, and with it
  `defineQtiInteractionsExtension()` and `defineQtiExtension()`.
- `qtiBasicNodes`, and so `createQtiSchema()`, includes it.
- `listInteractionPluginFactories()` and `listSelectedInteractionPluginFactories()` include its
  editor-only node view.

A host that builds its schema from these functions needs no change. A host that lists the paragraph
or choice node specs by hand must now define `mathml`, as it already must define `image`; use
`qtiBasicNodes.mathml`.

The inline-choice trigger shows a formula that is the correct choice as MathML, not as its text.

---
'@citolab/prose-extensions': minor
---

Keep MathML. The new `@citolab/prose-extensions/mathml` export (`mathmlNodeSpec`) is an inline
atom that holds a `<math>` formula as its MathML source. It renders as real MathML and is written
back in the MathML namespace, with `xmlns` on `<math>`. `defineBasicExtension()` now includes it as
a `mathml` node. The formula is not editable in the text; you change its source.

`findUnrepresentableElements` no longer looks inside an element that the schema reads as a leaf
node, because ProseMirror's parser does not look there either. Before, it reported every `<mi>` and
`<mo>` in a formula as removed.

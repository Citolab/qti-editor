---
'@citolab/prose-extensions': minor
---

Keep MathML. The new `@citolab/prose-extensions/mathml` export has two parts:

- `mathmlNodeSpec`: an inline atom that holds a `<math>` formula as its MathML source.
  - It renders as real MathML and is written back in the MathML namespace, with `xmlns` on `<math>`.
  - The XHTML inside an `annotation-xml` and the case of `definitionURL` are kept.
  - A malformed source is written as `<math><merror>…</merror></math>`.
  - The formula is not editable in the text; you change its source.
- `createMathmlNodeViewPlugin()`: the editor-only node view. It wraps the formula in an uneditable,
  draggable `<span>`, because a MathML element has no `contentEditable` or `draggable` property.

`defineBasicExtension()` is unchanged. A QTI editor gets the node from `@citolab/prose-qti`.

`findUnrepresentableElements` changes in two ways:

- It no longer looks inside an element the schema reads as a leaf node, because ProseMirror's
  parser does not look there either. Before, it reported every `<mi>` and `<mo>` in a formula as
  removed.
- It now reports an inline leaf whose parent node cannot hold it, which the parser moves out of
  that parent (a formula in a `text*` node, say). The finding has the same `kind` and `code` as
  before; `data.movedOutOf` names the parent.

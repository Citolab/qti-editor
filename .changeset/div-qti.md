---
'@citolab/prose-qti': minor
---

`createQtiSchema()` (`qtiBasicNodes`) and the ProseKit schema keep a `<div>` of blocks that carries a
`class`, `id`, `lang` or `xml:lang`, and keep a `<div>` of text as a div, in the item body and in a
`qti-prompt`, `qti-simple-choice` or `qti-simple-associable-choice`. Before, the first was unwrapped
and the second came back as `<p>`. The corpus keeps ITEM011's and ITEM012's classed divs now.

New `QTI_INLINE_ELEMENTS` (`@citolab/prose-qti/schema`): the QTI elements that sit in a line of text,
for `inlineElements`. `defineQtiExtension()` and `qtiSemanticPasteOptions` pass it.

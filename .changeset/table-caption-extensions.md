---
'@citolab/prose-extensions': minor
---

Keep a table's `<caption>`. It used to be dropped on load, with its text turned into a stray first
row. The new `@citolab/prose-extensions/html-schema` subpath exports `tableCaptionSpec`, which stores
it as a `caption` attribute on the table node and writes it back as the table's first child.
`defineBasicExtension()` applies it to the ProseKit table. Only the caption's plain text is kept.
An editor that renders tables through `columnResizing`'s `TableView` (ProseKit's `defineTable()`
does) exports the caption but does not display it.

`findUnrepresentableElements` (`schema-gaps`) now also reports the elements inside an element that
an `ignore` parse rule skips, such as an `<em>` inside a caption.

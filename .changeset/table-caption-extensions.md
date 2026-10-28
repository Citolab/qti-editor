---
'@citolab/prose-extensions': minor
---

Keep a table's `<caption>`. It used to be dropped on load, with its text turned into a stray first
row. The new `@citolab/prose-extensions/table-caption` export (`tableCaptionSpec`) stores it as a
`caption` attribute on the table node and writes it back as the table's first child.
`defineBasicExtension()` applies it to the ProseKit table. Only the caption's plain text is kept.

---
'@citolab/prose-qti': minor
---

`createQtiSchema()` keeps a table's `<caption>` through import and export, so `qti3ToPm` → `pmToQti3`
no longer drops it or turns its text into an extra table row. Only the caption's plain text is
kept.

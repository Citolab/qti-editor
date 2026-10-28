---
'@citolab/prose-qti-node': minor
---

The Node conversion (`qti3ToPm` → `pmToQti3`) keeps a table's `<caption>` instead of dropping it and
turning its text into an extra table row. Only the caption's plain text is kept.

---
'@citolab/prose-qti': patch
---

`qti-rubric-block` keeps the author's `class` through a round trip, and no longer writes
`class="qti-rubric-block"` on every block. The node used to replace whatever class the author had
with that editor class, which also lost the qti-components placement tokens `qti-rubric-inline` and
`qti-rubric-discretionary-placement`. Nothing selects the editor class (the editor's CSS and the
qti-components theme both target the element), and it is dropped on import, so items saved by an
earlier version come back without it.

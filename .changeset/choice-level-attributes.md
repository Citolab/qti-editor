---
'@citolab/prose-qti': patch
---

Choices and gaps keep more of their QTI attributes through a load → save round trip: `fixed` on
`qti-inline-choice`, `match-group` on `qti-simple-associable-choice`, `qti-gap-text` and `qti-gap`,
`match-min` on `qti-gap-text` (written above 0, as on associable choices) and `required` on
`qti-gap`. A newly inserted node writes none of them. The attributes panel offers inline-choice
`fixed` as a checkbox, as it does for simple choices, and makes `match-group`, `match-min` and gap
`required` editable, since each can make the authored correct response unreachable. Gaps and gap
texts now have panel metadata, so their `identifier` is shown read-only like other choices'.

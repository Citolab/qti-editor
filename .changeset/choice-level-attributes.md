---
'@citolab/prose-qti': patch
---

Choices, gaps and hottexts keep their QTI attributes through a load → save round trip: `class` and `show-hide` on `qti-simple-choice`, `qti-inline-choice`, `qti-simple-associable-choice`, `qti-gap-text`, `qti-gap` and `qti-hottext`; `match-group` on associable choices, gap texts and gaps; `match-min` on gap texts; `required` on gaps; and `fixed` on inline choices, which the attributes panel now offers as a checkbox like it does for simple choices. A newly inserted node writes none of them.

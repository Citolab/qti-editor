---
'@citolab/prose-qti': patch
---

`qti-text-entry-interaction` keeps `expected-length`, `pattern-mask`, `data-patternmask-message`, `format` and `base` through a load → save round trip, and `qti-extended-text-interaction` keeps `data-patternmask-message`, `format` and `base`. The node specs had no slot for them, so the first export dropped them. A newly inserted interaction writes none of them.

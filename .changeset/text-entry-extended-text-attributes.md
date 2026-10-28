---
'@citolab/prose-qti': patch
---

`qti-text-entry-interaction` keeps `expected-length`, `pattern-mask`, `data-patternmask-message`,
`format` and `base` through a load → save round trip, and `qti-extended-text-interaction` keeps
`data-patternmask-message`, `format` and `base`. The node specs had no slot for them, so the first
export dropped them. A newly inserted interaction writes none of them. The attributes panel now
offers `expected-length`, `pattern-mask` and `data-patternmask-message` on a text entry, and the
message on an extended text, so a mask can be changed along with the message that explains it.

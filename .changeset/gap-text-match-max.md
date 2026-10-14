---
'@citolab/prose-qti': patch
---

`qti-gap-text` always writes `match-max`, also at its default of 1. The attribute is required by the QTI 3.0 schema; leaving it out made exported gap-match items schema-invalid and made a round trip drop `match-max="1"` from imported items.

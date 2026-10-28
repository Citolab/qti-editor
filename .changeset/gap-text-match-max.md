---
'@citolab/prose-qti': patch
---

`qti-gap-text` always writes `match-max`. It used to be written only above 1, so `match-max="0"`
(unlimited: the chip may fill any number of gaps) was dropped and came back as 1 after a round trip,
and a chip meant for several gaps could then be placed only once. At the default of 1 the attribute
was dropped too; it is required by the QTI 3.0 schema, so every exported gap-match item was
schema-invalid. This matches `qti-simple-associable-choice`, which always writes `match-max`.

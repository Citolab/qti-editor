---
'@citolab/prose-qti': patch
---

`qti-match-interaction` no longer deletes answer-key links when a source and a target choice share an identifier. QTI only requires identifiers to be unique within a `qti-simple-match-set`, but the correction pruning looked each identifier up in one map for both sets, so a shared identifier counted as missing from one of them and every link naming it was removed from `correct-response`. Labels and match-max limits for the published correction are now also taken from the source set only, so a target can no longer overwrite them.

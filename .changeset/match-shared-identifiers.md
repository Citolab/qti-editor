---
'@citolab/prose-qti': patch
---

`qti-match-interaction` no longer deletes answer-key links when a source and a target choice share
an identifier. Such items are not conformant (QTI wants a choice identifier unique within the item)
but the XSD cannot catch them and they do get imported, typically tables numbered `1 2 3` by `1 2`.
The correction pruning looked each identifier up in one map for both sets, so a shared identifier
counted as missing from one of them and every link naming it was removed from `correct-response`.
Labels and match-max limits for the published correction are now also taken from the source set
only, so a target can no longer overwrite them. In drag-drop mode such a source is still painted as
a drop zone (see docs/testing-findings.md).

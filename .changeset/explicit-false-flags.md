---
'@citolab/prose-qti': patch
---

An explicit `shuffle="false"` (choice, order, match in both modes, gap-match) or `fixed="false"` (simple choice, simple associable choice) now survives a load → save round trip. Absent and `false` mean the same to QTI, but tools that compare an item before and after a save saw a lost attribute. Each node remembers whether the source wrote the flag (`shuffleExplicit` / `fixedExplicit`) and keeps writing it, as `"false"` when off; a newly inserted node still writes the flag only when it is true. New helper `writeBooleanFlag` in `@citolab/prose-qti/components/shared`.

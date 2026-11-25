---
'@citolab/prose-qti': minor
---

New helpers in `@citolab/prose-qti/components/shared` for QTI attributes a node keeps as authored
through a round trip. `qtiAttributes` builds the NodeSpec fragment (`attrs`, `parse`, `domAttrs`):
each attribute defaults to `null` and is written only when set, and an integer that does not parse
is dropped instead of being written as `"NaN"` (`parseQtiInteger`). `reconcileKeptConstraint` is the
composer side: it moves a kept limit that the author's edits have made contradictory back into range
and reports it as a `ComposerWarning` with the new code `CONSTRAINT_RECONCILED`. The policy is in
`docs/roundtrip-format.md`.

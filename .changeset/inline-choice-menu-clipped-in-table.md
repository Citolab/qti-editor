---
'@citolab/prose-qti': patch
---

An open `qti-inline-choice-interaction` menu inside a table cell was invisible, not just clipped
at the edge — ProseMirror's table wrapper scrolls horizontally and the table itself clips for its
own layout, and the menu is deliberately in-flow (it's what sizes the trigger), so both caught it
in full.

`InteractionPanel` now reflects its own open state as the transient `:state(open)` via
`ElementInternals`, and a document-level rule lifts that table's overflow while the state is set.
The interaction never learns a table is even possible, let alone which implementation — and any
future panel-based interaction gets the same table safety for free, since the rule matches the
state, not the tag.

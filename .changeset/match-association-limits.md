---
'@citolab/prose-qti': patch
---

Match and gap-match interactions keep their authored association limits through a load → save
round trip: `max-associations` and `min-associations` on `qti-match-interaction` (both modes),
`min-associations` on `qti-gap-match-interaction`, and `data-min-selections-message` /
`data-max-selections-message` on both. A newly inserted interaction writes none of them, so the
editor still sets no association limit of its own. A kept limit that the authored correct response
contradicts is reconciled on export with a `CONSTRAINT_RECONCILED` warning: `max-associations` is
raised to the number of correct pairs, `min-associations` lowered to it.

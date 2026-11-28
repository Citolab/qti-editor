---
'@citolab/prose-qti': patch
---

Choice, order and inline-choice interactions keep their authored selection limits through a load →
save round trip: `min-choices` and `data-min-selections-message` on all three,
`data-max-selections-message` on choice and order, `max-choices` on order and `required` on inline
choice. A newly inserted interaction writes none of them. An imported limit that contradicts what
the author has since edited is reconciled on export with a `CONSTRAINT_RECONCILED` warning:
`min-choices` is lowered to what can be selected, and an order's `max-choices` is raised to the
length of the correct order. A choice interaction's `orientation` attribute is imported as the
`qti-orientation-*` class the class editor manages, unless the class already names one.

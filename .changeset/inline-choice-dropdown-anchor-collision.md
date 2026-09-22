---
'@citolab/prose-qti': patch
---

The `qti-inline-choice-interaction` dropdown could open positioned at the top-left corner of the
viewport instead of below its trigger. The generic interaction decorator sets `anchor-name` as an
inline style directly on an interaction's own element, for the floating action pill — and
inline-choice needs that same property on that same element for its own dropdown popover. The
decorator's inline style silently overwrote it, so the popover's `anchor()` references resolved to
nothing.

Every decorated interaction now gets a NodeView that wraps its own element in a bare `<div>`/`<span>`
with no box of its own beyond the tag's default, and the decorator's `anchor-name` (and its
"clicked into" wash class) land on that wrapper instead — the interaction's own use of the property,
where it has one, is never touched.

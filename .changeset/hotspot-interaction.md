---
'@citolab/prose-qti': minor
---

New `qti-hotspot-interaction`, at `@citolab/prose-qti/components/hotspot` and registered with every
other interaction. An image (`<img>` or `<object>`, kept as authored) with `qti-hotspot-choice`
areas: the author draws rectangles and circles on it, moves and resizes them, marks them as correct
and deletes them. Selecting an area selects its choice in ProseMirror, so the attributes panel and
Delete / Backspace act on it. It scores like choice: an `identifier` correct response,
`match_correct`, and `max-choices` 1 for one correct area, 0 for more. Export never writes more
correct values than `max-choices` allows; it cuts them, with the new composer warning
`CORRECT_RESPONSE_EXCEEDS_MAX_CHOICES`.

Kept through import and export: the QTI attributes of `qti-hotspot-choice` plus `class` and
`aria-label`, `class` on the interaction and the picture, and an `<object>`'s fallback text and
`<img>`. Dropped: `id` everywhere, `data-*` / `aria-*` on the interaction, `qti-mapping` scoring.

`roundtripInteractions` now takes each interaction's score from its own response condition or
mapping (`buildScoreIndex`) before falling back to the item-level score, so the interactions of a
multi-interaction item no longer all import with the first score found.

---
'@citolab/prose-qti': patch
---

Three editor-affordance fixes, bundled as one patch:

**Gap-match selected/pending states.** Picking up a `qti-gap-text` choice and finding a gap to drop
it in had no visual cue: the selected chip carried no styling at all, and the gaps it could go in
only got a background so faint it read as decoration rather than an affordance. Both now use the
accent color the theme already reserves for selection (`--qti-primary`): a solid outline on the
picked chip, a dashed outline and tint on the gaps it can be dropped into. The same rule also covers
the equivalent states on `qti-match-interaction` and `qti-associate-interaction`, which share the
hook.

**Choice interaction active margin.** The `+` that appends a new choice is anchored below the last
one and sits outside document flow, so nothing reserved room for it — in a document with content
right after a `qti-choice-interaction`, the `+` rendered on top of that content instead of below it.
The interaction now gets extra bottom margin while the selection is inside it, sized to clear the
`+`, and transitions in rather than shifting the layout abruptly.

**Inline-choice menu uses a native popover.** `qti-inline-choice-interaction`'s dropdown was kept in
normal document flow on purpose, so it could size the trigger to the widest option without
measuring — but that meant it could still be clipped by a table, the editor's own card, or any other
scrolling ancestor, not just the table case an earlier fix targeted. The menu now uses upstream's
native popover, so it always renders above any clipping ancestor. Trigger width is measured via
`MenuAutoSizeMixin` in its place, writing the result inside the element's own shadow root rather
than onto the ProseMirror-managed host, which is what keeps this measurement from tripping the
freeze the original in-flow layout was built to avoid.

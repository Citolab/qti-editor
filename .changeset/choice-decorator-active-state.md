---
'@citolab/prose-qti': minor
---

Choice interaction decorator: a click into the interaction paints a gray wash and shows the `+`
and the action pill; typing or Escape hides them and only the next click brings them back. The
hover tint, dashed per-choice outline and selection rings are removed, the `+` is anchored below
the last choice instead of taking up space, icons use a neutral ink, and `editor-states.css` makes
`qti-simple-choice` transparent in the editor. The exported assessment item now declares
`xmlns:xsi` explicitly so Node-side serialization validates.

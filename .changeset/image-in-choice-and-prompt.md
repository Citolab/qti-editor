---
'@citolab/prose-qti': patch
---

An image inside a `qti-simple-choice` or a `qti-prompt` survives the round trip. Both paragraph
nodes were `text*`, so an authored `<img>` — a picture as the answer itself — was dropped on import
and a pasted one was flattened to its `alt` text; `removeEmptyPrompts` then dropped a prompt whose
only content was that picture, because it keyed emptiness on text alone. Content widened to
`(text | image)*`, leaving the other inline nodes out.

---
'@citolab/prose-qti': patch
'@citolab/prose-qti-node': patch
---

A `qti-text-entry-interaction` without a correct response no longer exports scoring the author never
wrote. The composer added the `map_response` template regardless, with no `qti-mapping` for it to
map through, which is invalid QTI. Such a text entry now contributes no response processing, like
an extended text: its declaration stays bare, and `SCORE` and `MAXSCORE` (from `score`) are still
declared. In an item with other interactions, theirs is written out and the text entry adds nothing
to it. A text entry with accepted answers exports `map_response` and its mapping as before.

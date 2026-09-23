---
'@citolab/prose-extensions': patch
---

Inserting a table filled every cell with a question (interaction) instead of a blank paragraph.
ProseKit's table cell content expression is `block+`, and QTI interaction nodes are also
`group: 'block'`, so when a new cell is auto-filled, `ContentMatch.defaultType` picked whichever
`block`-group node sorts first — which was an interaction, not `paragraph`.

Cells now accept `(paragraph | block)+`: the same content is admitted (paragraph was already in
`block`, so interactions are still legal in a cell), but paragraph is named first and wins the
fill, matching the same fix already applied to the empty document in `defineQtiDoc`.

---
'@citolab/prose-extensions': minor
---

Backspace or Delete on a cell selection that covers the whole table now deletes the table.
prosemirror-tables only cleared the selected cells, so a fully selected table could be emptied but
not removed. A partial selection still clears its cells. `defineBasicExtension()` includes it;
hosts that compose their own base can add `defineTableDeletion()` (or bind
`deleteSelectedTable`), both exported from `@citolab/prose-extensions/prosekit`.

---
'@citolab/prose-extensions': minor
---

`defineBasicExtension()` keeps `class` and `id` on its nodes and marks through parse → serialise:
paragraph, heading, lists and list items, image, table, rows and cells, `strong` and `em`. Before,
both were dropped on load, so `<p class="qti-align-center">` — a class from QTI's shared CSS — came
back as a bare `<p>`. An element without them serialises exactly as before.

- The table's `toDOM` now has an explicit attrs object (`['table', {}, ['tbody', 0]]`). ProseKit's
  attr wrapper read prosemirror-tables' `['table', ['tbody', 0]]` as attrs once the table had an
  attribute, and wrote `<table 0="tbody" 1="0">` with the rows gone.
- `defineUniqueIds()` (included) clears an id an edit has copied — Enter in the middle of a
  paragraph, a pasted copy of a block — keeping it on the original.
- New `defineNodeClassAndId(type)` / `defineMarkClassAndId(type)` add the same attributes to a node
  or mark the host defines itself (`hardBreak`, say).
- The semantic paste plugin drops classes and ids from foreign HTML (Word's `MsoNormal`, a web page's
  own classes) except `qti-*` class tokens; HTML copied out of a ProseMirror editor is left as it is.

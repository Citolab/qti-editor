---
'@citolab/prose-qti': patch
---

`qtiLayoutDivNodeSpec` content is now `(paragraph | block)+` instead of `block+`, so ProseMirror fills an empty layout column with a paragraph. With `block+` the filler was whichever `block` node sorted first in the schema; in a ProseKit host that registers the layout div itself, that was the layout div, and deleting a column's only block (or `createAndFill` on a column) overflowed the stack. A column accepts the same content as before.

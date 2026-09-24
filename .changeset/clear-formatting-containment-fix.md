---
'@citolab/prose-extensions': patch
---

`clearFormattingInRange` (from the new `clear-formatting` entry point) could silently no-op on the
most ordinary selections: clicking into a heading, selecting its text, and clearing formatting left
it as a heading instead of resetting it to a paragraph — likewise for a blockquote or list selected
the normal way.

The containment checks compared the selection against a block's own outer delimiter positions
(`pos` / `pos + nodeSize`), but a real text selection — click + Shift+Home, triple-click, or the
toolbar flow itself — always sits one position inside those delimiters. Fixed to compare against
the block's actual reachable text boundary instead, recursing through any structural node (a
blockquote's paragraph, a list-item's paragraph) sitting between the wrapper and its real content.

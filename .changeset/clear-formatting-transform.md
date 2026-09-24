---
'@citolab/prose-extensions': minor
---

New `@citolab/prose-extensions/clear-formatting` entry point: `clearFormattingInRange` strips every
mark and flattens block structure (headings, blockquotes, lists — including nested ones) back to
plain paragraphs within a given document range. Generic ProseMirror transform with no QTI knowledge;
a wrapper only partially covered by the range is left in place rather than dissolved.

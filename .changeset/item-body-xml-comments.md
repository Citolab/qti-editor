---
'@citolab/prose-qti': patch
---

Importing an item no longer turns XML comments and processing instructions in `qti-item-body` into visible text. `roundtripXmlToPm` rebuilt every non-element node as a text node, so `<!-- author note -->` showed up as a paragraph and was written back as content on export. Only text and CDATA are imported as text now; comments and processing instructions are skipped.

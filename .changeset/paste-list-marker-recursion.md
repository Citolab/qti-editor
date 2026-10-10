---
'@citolab/prose-extensions': patch
---

Semantic paste: a Word line whose typed list marker sits in a span (`<p><span>– eerst …</span></p>`, `<p><span>1. …</span></p>`)
made `makeHtmlSemantic` recurse without end, so the paste threw and inserted nothing — in practice any Word document
with a dash or typed numbering. List detection now only looks at paragraph-like blocks (never at a list item it made),
and the typed marker is stripped from the first text node, also inside inline elements.

---
'@citolab/prose-extensions': patch
---

Semantic paste: a Word line whose typed list marker sits in a span (`<p><span>– eerst …</span></p>`,
`<p><span>1. …</span></p>`) made `makeHtmlSemantic` recurse without end, so the paste threw and
inserted nothing — in practice any Word document with a dash or typed numbering. The typed marker is
now stripped from the text also when it sits in, or is split over, inline elements.

List detection now only looks at a `p`, or a `div` without block children. That also stops other
elements that start with a marker from being turned into lists: a table cell (`<td>1. foo</td>` was
replaced by an `ol`, breaking the table), a heading (`<h2>1. Inleiding</h2>`, and Word's numbered
headings `<h1 style="mso-list:…">`, which stay headings without Word's number) and a quote
(`<blockquote>– …</blockquote>` became a `ul`). A wrapper `div` such as Word's `WordSection1` is no
longer folded into one list item together with all its paragraphs.

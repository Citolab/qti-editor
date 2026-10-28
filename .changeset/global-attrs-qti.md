---
'@citolab/prose-qti': minor
---

`createQtiSchema()` (and `qtiBasicNodes` / `qtiBasicMarks`) keeps `class`, `id`, `lang` and `xml:lang`
on item content, like the ProseKit schema: paragraphs, headings, lists, images, tables, the marks
and a new `span` mark. So do `qti-prompt`, the paragraphs in a prompt or a choice, and
`qti-simple-match-set`, in both schemas. The corpus keeps two classes it used to lose (ITEM008's and
ITEM015's image classes).

`lang` and `xml:lang` are kept apart: each is exported as the attribute it was imported as, and an
element may carry both. The import keeps `xml:lang` under that name instead of turning it into
`lang`. The item's own `xml:lang` still comes from the export context.

New `qtiSemanticPasteOptions` (`@citolab/prose-qti/schema`) for the semantic paste plugin: keeps the
`qti-*` class tokens of pasted HTML.

`core-css.css` shows `.qti-hidden` and `.qti-visually-hidden` content in the editor, outlined, so it
can be edited; the exported item keeps the class.

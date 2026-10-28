---
'@citolab/prose-extensions': minor
---

Keep `<div>`s. A div of blocks with a `class`, `id`, `lang` or `xml:lang` used to be unwrapped, and a
div of text came back as a `<p>`.

- `./html-schema`: `divNodeSpec`, a `div` node for a div of blocks with any of those attributes
  (matched on them, parse priority 20, in the `block` and `richtext` groups, `class` required so it
  is never the filler for empty content), and `withDivParagraph(spec, options)`, which gives a
  paragraph spec a `tag` attribute (`'p'` | `'div'`) and a rule for a div of inline content.
  `isInlineContentDiv(element, options)` tells the two apart; custom elements count as blocks unless
  listed in `inlineElements`.
- `defineBasicExtension()` registers the `div` node and the div-paragraph, and takes
  `inlineElements`. A host that composes it with the QTI interactions itself should pass prose-qti's
  `QTI_INLINE_ELEMENTS`; `defineQtiExtension()` does.
- A div-paragraph renders as a `<div>`, so it has no paragraph margins in the editor.
- The semantic paste plugin turns a bare text `<div>` from foreign HTML into a `<p>`, and takes
  `inlineElements` for that. A host without the plugin now gets div-paragraphs when it pastes a web
  page.

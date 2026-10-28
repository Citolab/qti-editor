---
'@citolab/prose-extensions': minor
---

Keep `class`, `id`, `lang` and `xml:lang` on item content. Before, all four were dropped on load, so
`<p class="qti-align-center">` came back as a bare `<p>`, and a language set with `xml:lang` or
`lang` was gone. An element without them serialises exactly as before.

- `./html-schema`: `withGlobalAttrs(spec)` / `withGlobalAttrsOn(specs)` add the four attributes to
  plain ProseMirror specs, applied to one list of node and mark types (`GLOBAL_ATTR_NODES`,
  `GLOBAL_ATTR_MARKS`). `lang` and `xml:lang` are separate attributes, and each is written back as
  the attribute it was read from; `xml:lang` is written in the XML namespace.
- `./html-schema`: a `span` mark for a `<span>` with any of the four, matched on those attributes,
  so a bare span is still unwrapped and still reported by `schema-gaps`. It is ranked outside every
  other content mark.
- `./html-schema`: `createUniqueIdsPlugin()` clears an id that an edit copied (Enter in the middle
  of a block, a pasted copy), keeping it on the original. It only looks at nodes the edit created,
  so a loaded document with duplicate ids is left as it is.
- `defineBasicExtension()` applies the same list (through `defineNodeGlobalAttrs` /
  `defineMarkGlobalAttrs`, which hosts can use for nodes of their own), the span mark and
  `defineUniqueIds()`. The phrasing marks carry the attributes too. `BasicExtension` includes them.
- The semantic paste plugin drops every id and every class token of HTML pasted from outside, except
  the tokens its new `keepClass` option accepts (default: none; prose-qti's
  `qtiSemanticPasteOptions` keeps `qti-*`). HTML copied out of any ProseMirror editor is left alone.
  A host without the plugin gets ProseMirror's default paste, which now imports classes and ids.

---
'@citolab/prose-extensions': minor
'@citolab/prose-qti': minor
'@citolab/prose-qti-node': minor
---

Keep the QTI 3 phrasing elements that had no mark: `<small>`, `<big>`, `<tt>`, `<abbr>`, `<acronym>`,
`<cite>`, `<dfn>`, `<kbd>`, `<samp>`, `<var>`, `<q>`, `<sub>`, `<sup>`, `<bdo>` and `<bdi>`, and in
the ProseKit base also `<code>`. The parser unwrapped them, so the text stayed and the markup was gone
on the first save. `<b>` and `<i>` are now kept as written; before, they came back as `<strong>` /
`<em>`. `<u>`, `<s>` and `<mark>` are not QTI 3 elements and are still not kept; `schema-gaps`
reports them.

- `@citolab/prose-extensions`: `phrasingMarkSpecs` in the `./html-schema` subpath (plain ProseMirror
  `MarkSpec`s, named for their tags, each parsing only its own tag), and `definePhrasingMarks()` in
  `./prosekit`, which `defineBasicExtension()` now includes, with no commands or keymaps. `q` keeps
  `cite`, `bdo` keeps `dir` and `title`, `bdi` keeps `dir`.
- The semantic paste plugin turns a `<b>` / `<i>` pasted from another application into `<strong>` /
  `<em>`. A host without the plugin gets `b` / `i` marks from such a paste.
- A host that also adds ProseKit's `defineSubscript()` / `defineSuperscript()` (QTI-Coco does) has
  two marks claiming `<sub>` / `<sup>`. The host's rank first, so they take the import, and they
  still exclude each other. Dropping them and adding only the commands avoids that. The same applies
  to ProseKit's `defineBold()` / `defineItalic()` for `<b>` / `<i>`, except that these marks win.
- `@citolab/prose-qti`: `qtiBasicMarks` (and so `createQtiSchema()` and the conversion functions)
  includes the same marks, in the same nesting order.
- `@citolab/prose-qti-node`: the Node conversion keeps them too.

---
'@citolab/prose-extensions': minor
'@citolab/prose-qti': minor
'@citolab/prose-qti-node': minor
---

Keep `<u>`, `<s>`, `<mark>`, `<q>`, `<code>`, `<sub>`, `<sup>` and `<span class="qti-underline">` on import. They had no mark, so the parser unwrapped them: the text stayed and the markup was gone on the first save.

- `@citolab/prose-extensions`: new `@citolab/prose-extensions/semantic-marks` subpath (plain ProseMirror `MarkSpec`s, `semanticMarkSpecs`) and `defineSemanticMarks()` in `@citolab/prose-extensions/prosekit`, which `defineBasicExtension()` now includes. Marks are named for the tags they emit (`u`, `s`, `mark`, `q`, `sub`, `sup`, plus `code` and `qtiUnderline`), each parses only its own tag, and no commands or keymaps are added.
- `@citolab/prose-qti`: `qtiBasicMarks` (and so `createQtiSchema()` and the conversion functions) includes the same marks.
- `@citolab/prose-qti-node`: the Node conversion keeps them too.

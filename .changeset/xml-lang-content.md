---
'@citolab/prose-extensions': minor
'@citolab/prose-qti': minor
'@citolab/prose-qti-node': minor
---

Keep `xml:lang` on item content. An authored `<span xml:lang="fr">`, `<p xml:lang="en">`, heading or list used to lose its language on import; it now round-trips.

- `@citolab/prose-extensions`: a `lang` mark (`<span lang>`) and a `lang` attribute on `paragraph`, `heading`, `bullet_list` and `ordered_list` — `langMarkSpec` / `withLangAttr` from the new `@citolab/prose-extensions/lang` subpath for plain-ProseMirror schemas, `defineLang()` for ProseKit, included in `defineBasicExtension()`.
- `@citolab/prose-qti`: `createQtiSchema()` / `qtiBasicNodes` / `qtiBasicMarks` carry the same, and `pmToRoundtripXml` (so every export) writes the editor's `lang` back as `xml:lang`.
- `@citolab/prose-qti-node`: the Node conversion functions get the same round trip.

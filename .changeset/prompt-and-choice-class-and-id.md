---
'@citolab/prose-qti': patch
---

`qti-prompt`, the paragraphs inside a prompt, a `qti-simple-choice` and a
`qti-simple-associable-choice`, and `qti-simple-match-set` keep their `class` and `id` through load →
save. Before, both were dropped. The specs are shared, so this holds in the ProseKit schema
(`defineQtiExtension()`) and in `createQtiSchema()` alike; nodes without them serialise as before.

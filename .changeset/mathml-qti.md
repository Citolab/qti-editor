---
'@citolab/prose-qti': minor
---

Keep MathML through import and export. `qtiBasicNodes` (and so `createQtiSchema()`) has a `mathml`
node, and choice and prompt paragraphs now accept `(text | image | mathml)*`. A `<math>` formula
used to be dropped on load, with only its digits left as text. It now round-trips in running text,
in a `qti-simple-choice` and in a `qti-prompt`.

If you build your own schema around the choice or prompt paragraph specs, it must now define a
`mathml` node, as it already must define `image`. Use `mathmlNodeSpec` from
`@citolab/prose-extensions/mathml` or `qtiBasicNodes.mathml`.

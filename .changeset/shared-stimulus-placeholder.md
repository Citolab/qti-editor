---
"@citolab/prose-qti": minor
---

Keep the shared-stimulus placeholder `<div class="qti-shared-stimulus" data-stimulus-idref="…"></div>`
through import and export. It was dropped on import, so an exported item lost the slot the
qti-components runtime loads the item's `qti-assessment-stimulus-ref` into.

- New `qtiSharedStimulus` atom node in `qtiBasicNodes`, so `createQtiSchema()` and the Node
  conversion functions have it. Only an empty `div[data-stimulus-idref]` matches; `class`, `id` and
  other `data-*` attributes are kept.
- New `defineQtiBaseNodesExtension()` (`integration/interactions/prosekit`): `qtiLayoutDiv` and
  `qtiSharedStimulus` as ProseKit nodes. `defineQtiExtension()` now includes it, so the ProseKit path
  also keeps `qti-layout-row` / `qti-layout-colN` wrappers, which it used to drop.
- `core-css.css` draws the empty slot in the editor as a dashed box labelled with its identifier
  (`--qti-edit-shared-stimulus-label`).

---
"@citolab/prose-qti": minor
---

Keep the shared-stimulus placeholder `<div class="qti-shared-stimulus" data-stimulus-idref="…">` through import and export. It was dropped on import, so an exported item lost the slot qti-components loads the item's `qti-assessment-stimulus-ref` into. New `qtiSharedStimulus` node in `qtiBasicNodes` (so `createQtiSchema()` and the Node conversion functions have it) and in `defineQtiExtension()`; hosts composing their own ProseKit base add `defineQtiSharedStimulusExtension()`.

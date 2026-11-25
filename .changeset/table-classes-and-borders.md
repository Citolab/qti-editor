---
'@citolab/prose-extensions': minor
---

Tables keep their classes, and get commands for lines (`qti-bordered`, QTI 3 shared vocabulary).

A `class` on a table, row or cell was dropped on load, so content an author marked `qti-bordered` lost its lines after any edit. `defineBasicExtension()` now keeps it (`defineTableClasses()`), and keeps a bordered table's new rows and columns bordered (`defineTableBorders()`). New commands, exported from `@citolab/prose-extensions/prosekit`: `setTableBorders(on)` and `toggleTableBorders` for the table the selection is in, and `insertBorderedTable(options)` for hosts that want new tables bordered by default. `insertTable` itself is unchanged. Hosts that compose their own base can add `defineTableClasses()` and `defineTableBorders()`.

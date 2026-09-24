# @citolab/prose-extensions

## 1.8.0

### Minor Changes

- [`523241c`](https://github.com/Citolab/qti-editor/commit/523241c7ce4d645a4c3cf03b31a7366b7ff806f4) Thanks [@denisebroekman](https://github.com/denisebroekman)! - New `@citolab/prose-extensions/clear-formatting` entry point: `clearFormattingInRange` strips every
  mark and flattens block structure (headings, blockquotes, lists — including nested ones) back to
  plain paragraphs within a given document range. Generic ProseMirror transform with no QTI knowledge;
  a wrapper only partially covered by the range is left in place rather than dissolved.

## 1.7.1

### Patch Changes

- [#75](https://github.com/Citolab/qti-editor/pull/75) [`dd4d078`](https://github.com/Citolab/qti-editor/commit/dd4d078350ef0b92b3720e367aad2fd24d725c37) Thanks [@denisebroekman](https://github.com/denisebroekman)! - Inserting a table filled every cell with a question (interaction) instead of a blank paragraph.
  ProseKit's table cell content expression is `block+`, and QTI interaction nodes are also
  `group: 'block'`, so when a new cell is auto-filled, `ContentMatch.defaultType` picked whichever
  `block`-group node sorts first — which was an interaction, not `paragraph`.
  
  Cells now accept `(paragraph | block)+`: the same content is admitted (paragraph was already in
  `block`, so interactions are still legal in a cell), but paragraph is named first and wins the
  fill, matching the same fix already applied to the empty document in `defineQtiDoc`.

## 1.7.0

### Minor Changes

- [`3fb7ccd`](https://github.com/Citolab/qti-editor/commit/3fb7ccd46432849f6a1c6a3e4bb99e7ea9a508c7) Thanks [@denisebroekman](https://github.com/denisebroekman)! - New `@citolab/prose-extensions/schema-gaps` entry point: `findUnrepresentableElements` reports what
  a schema will silently drop when parsing markup it cannot fully represent, since ProseMirror's
  `DOMParser` skips unmatched elements without any warning. Also exports `TRANSPARENT_WRAPPER_TAGS`,
  `withHostMessage`, and the `SchemaGap*` types. The package takes a `Schema` and an `Element` and
  reports the difference — rendering a notice from that data is left to the consumer.

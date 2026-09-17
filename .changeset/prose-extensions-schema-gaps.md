---
'@citolab/prose-extensions': minor
---

New `@citolab/prose-extensions/schema-gaps` entry point: `findUnrepresentableElements` reports what
a schema will silently drop when parsing markup it cannot fully represent, since ProseMirror's
`DOMParser` skips unmatched elements without any warning. Also exports `TRANSPARENT_WRAPPER_TAGS`,
`withHostMessage`, and the `SchemaGap*` types. The package takes a `Schema` and an `Element` and
reports the difference — rendering a notice from that data is left to the consumer.

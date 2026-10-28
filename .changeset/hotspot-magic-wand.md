---
'@citolab/prose-qti': minor
---

A magic wand for hotspot areas: a click outlines the coloured region under the pointer as a
polygon, with a hover preview, and Shift+click adds a neighbouring region to the area the wand made
last. A double-click makes one area, not two. Its code and the canvas read are loaded with
`import()` the first time the author picks it, and the pixels are let go when they pick another
tool. A picture that cannot be read (another origin without CORS, or behind cookie authentication)
gives a message, and the wand tries again the next time. New strings in en and nl, under
`graphic.*`.

New modules: `components/shared/graphic/magic-wand.js` (`MagicWand`, `wandRegion`,
`mergeRegions`, …, ported from qti-construction's `prose-qti-graphic`) and
`components/shared/graphic/image-pixels.js` (`readImagePixels`, `ImagePixels`). `area-geometry.js`
exports `distanceToSegment`.

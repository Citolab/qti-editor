---
'@citolab/prose-qti': patch
'@citolab/prose-qti-node': patch
---

`alt=""` on an image now survives `qti3ToPm` → `pmToQti3`. The `createQtiSchema()` image node
dropped an empty `alt` on export, and the select-point graphic dropped it on import, on export and
in the composer. `alt=""` marks an image as decorative and the QTI 3.0 XSD requires `alt` on `img`,
so those images were exported XSD-invalid. An image without `alt` is still exported without one;
`alt=""` is not invented for it.

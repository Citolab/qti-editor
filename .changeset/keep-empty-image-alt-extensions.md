---
'@citolab/prose-extensions': patch
---

The ProseKit image node now keeps `alt=""`. Its parse rule read the attribute with `|| null`, so an
empty `alt` became "no alt" and the image was exported without one. `alt=""` is how HTML and QTI
mark an image as decorative, and the QTI 3.0 XSD requires `alt` on `img`, so every decorative image
failed XSD validation after a round trip. An image without `alt` still has none: the editor does not
invent `alt=""`, because that would claim the image is decorative.

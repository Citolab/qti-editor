---
'@citolab/prose-qti': minor
---

The hotspot editor draws polygons and reshapes polygons and ellipses. Authors place a polygon's
points one by one (close it on its first point, with a double-click or with Enter; Escape cancels),
drag a selected polygon's points, and double-click an edge or a point to add or remove one. Imported
ellipses get two radius handles. A polygon that repeats its first point at the end is edited without
the repeat and written back closed. New strings in en and nl, under `graphic.*`.

`@citolab/prose-qti/components/shared/graphic/area-geometry.js` gains the polygon helpers behind
this (`polyPoints`, `nearestPolyEdge`, `insertPolyPoint`, `removePolyPoint`, `polygonFromDraft`,
`openPolygon`, `closePolygon`, `isNearPoint`), and `areaHandles` / `resizeAreaCoords` now cover
ellipses and polygons. Ported from qti-construction's `prose-qti-graphic`.

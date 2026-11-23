---
'@citolab/prose-qti': patch
---

Select-point's editor now parses, hit-tests, moves, draws and renders its areas with shared helpers
in `components/shared/graphic/` (`area-geometry`, `area-shape`, `image-source`), reachable through
the existing `@citolab/prose-qti/components/shared/*` deep path. Behaviour is unchanged for every
area select-point can hold; the one difference is that a `coords` value that is not a finite
number (`Infinity`) now makes the area invalid instead of hit-testable.

---
'@citolab/prose-qti': minor
---

Keyboard editing for hotspot areas, on ProseMirror's selection. Arrow keys select the areas one
after another (from the text above the picture, ↓ reaches the first). With an area selected, Alt +
arrow keys move it 1 px (Shift: 10 px), `+` / `−` resize it (Shift: 10 px), Delete removes it and
Escape selects the interaction. The keys are only taken while an area is selected and are never
stopped, so document listeners and host shortcuts still see them; Ctrl/Cmd + `+` / `−` stay the
browser's zoom. A status line for screen readers names the selected area and its position. New
strings in en and nl, under `graphic.*`.

`area-geometry.js` gains `growAreaCoords`; the key mapping is `hotspotAreaKeyCommand` in
`components/hotspot/extensions/hotspot-area-keys.js`.

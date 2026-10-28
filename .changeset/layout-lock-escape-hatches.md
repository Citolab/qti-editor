---
'@citolab/prose-qti': patch
---

`qtiLayoutDivLockPlugin` lets two kinds of transaction change the number of layout wrappers: one marked with the new `QTI_LAYOUT_DIV_UNLOCK_META` (for a host command that changes the layout on purpose), and prosemirror-history's undo/redo. Before this, the lock rejected both, so a host could not offer a layout switch without dropping the plugin, and could not undo one.

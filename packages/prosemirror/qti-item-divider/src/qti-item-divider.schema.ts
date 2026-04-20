import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/**
 * QTI Item Divider node specification.
 * 
 * This block element marks the end of a QTI assessment item when editing
 * multiple items in a single editor instance. It serves as a visual and
 * structural separator between items.
 */
export const qtiItemDividerNodeSpec: NodeSpec = {
  group: 'block',
  atom: true,
  selectable: true,
  parseDOM: [
    { 
      tag: 'qti-item-divider',
      // Preserve any data attributes
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return null;
      }
    }
  ],
  toDOM(): DOMOutputSpec {
    return ['qti-item-divider', { class: 'qti-item-divider' }];
  },
};

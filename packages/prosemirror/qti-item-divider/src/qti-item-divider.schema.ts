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
  attrs: {
    title: { default: '' },
    identifier: { default: '' },
  },
  parseDOM: [
    {
      tag: 'qti-item-divider',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return {
          title: dom.getAttribute('title') ?? '',
          identifier: dom.getAttribute('identifier') ?? '',
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { class: 'qti-item-divider' };
    if (node.attrs['title']) attrs['title'] = node.attrs['title'] as string;
    if (node.attrs['identifier']) attrs['identifier'] = node.attrs['identifier'] as string;
    return ['qti-item-divider', attrs];
  },
};

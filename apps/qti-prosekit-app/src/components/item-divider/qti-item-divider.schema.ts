import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/**
 * qtiItemDivider — block atom that separates assessment items in the editor.
 * Local to qti-prosekit-app (relocated from packages/prose-qti).
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
    if (node.attrs.title) attrs.title = node.attrs.title;
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    return ['qti-item-divider', attrs];
  },
};

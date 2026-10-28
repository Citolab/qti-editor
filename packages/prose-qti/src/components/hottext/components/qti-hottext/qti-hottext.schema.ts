import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiHottextNodeSpec: NodeSpec = {
  inline: true,
  group: 'inline',
  content: 'text*',
  marks: '_',
  attrs: {
    identifier: { default: null },
    // Kept as authored, so a round trip does not drop them; no editing UI. `null` = not written.
    class: { default: null },
    showHide: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-hottext',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier'),
          class: node.getAttribute('class') || null,
          showHide: node.getAttribute('show-hide'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.identifier) {
      attrs.identifier = node.attrs.identifier;
    }
    if (node.attrs.class) {
      attrs.class = node.attrs.class;
    }
    if (node.attrs.showHide) {
      attrs['show-hide'] = node.attrs.showHide;
    }
    return ['qti-hottext', attrs, 0];
  },
  selectable: true,
};

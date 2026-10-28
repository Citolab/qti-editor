import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiHottextNodeSpec: NodeSpec = {
  inline: true,
  group: 'inline',
  // A formula can be the selectable thing. With `text*` the parser lifted it out of the hottext.
  content: '(text | mathml)*',
  marks: '_',
  attrs: {
    identifier: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-hottext',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.identifier) {
      attrs.identifier = node.attrs.identifier;
    }
    return ['qti-hottext', attrs, 0];
  },
  selectable: true,
};

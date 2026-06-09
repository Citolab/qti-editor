import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiGapTextNodeSpec: NodeSpec = {
  group: 'block',
  content: 'text*',
  placeholder: 'Enter gap text…',
  attrs: {
    identifier: { default: null },
    matchMax: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-gap-text',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const matchMax = node.getAttribute('match-max');
        return {
          identifier: node.getAttribute('identifier'),
          matchMax: matchMax ? parseInt(matchMax, 10) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    if (node.attrs.matchMax > 1) attrs['match-max'] = String(node.attrs.matchMax);
    return ['qti-gap-text', attrs, 0];
  },
};

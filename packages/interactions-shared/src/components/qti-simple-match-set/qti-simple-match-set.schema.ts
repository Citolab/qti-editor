import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleMatchSetNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiSimpleAssociableChoice+',
  attrs: {
    id: { default: null }
  },
  parseDOM: [
    {
      tag: 'qti-simple-match-set',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          id: node.getAttribute('id') || null
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.id) {
      attrs['id'] = node.attrs.id;
    }
    return ['qti-simple-match-set', attrs, 0];
  }
};

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceNodeSpec: NodeSpec = {
  placeholder: 'Enter option…',
  attrs: {
    identifier: { default: 'A' }
  },
  content: 'text*',
  inline: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'qti-inline-choice',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return { identifier: node.getAttribute('identifier') || 'A' };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    return ['qti-inline-choice', { identifier: node.attrs.identifier }, 0];
  },
  selectable: true
};

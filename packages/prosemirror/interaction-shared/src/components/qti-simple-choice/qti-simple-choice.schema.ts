import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleChoiceNodeSpec: NodeSpec = {
  content: 'qtiSimpleChoiceParagraph',
  placeholder: 'Enter answer option…',
  attrs: {
    identifier: { default: 'A' }
  },
  parseDOM: [
    {
      tag: 'qti-simple-choice',
      context: 'qtiChoiceInteraction/',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return { identifier: node.getAttribute('identifier') || 'A' };
      }
    },
    {
      tag: 'qti-simple-choice',
      context: 'qtiOrderInteraction/',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return { identifier: node.getAttribute('identifier') || 'A' };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    return ['qti-simple-choice', { identifier: node.attrs.identifier }, 0];
  }
};

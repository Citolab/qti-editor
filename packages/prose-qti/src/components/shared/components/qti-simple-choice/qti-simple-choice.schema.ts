import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleChoiceNodeSpec: NodeSpec = {
  content: 'qtiSimpleChoiceParagraph',
  placeholder: 'Enter answer option…',
  attrs: {
    identifier: { default: 'A' },
    // Standard QTI `fixed` flag: when true the choice keeps its position and is
    // not shuffled. Boolean so the attributes panel renders it as a checkbox.
    fixed: { default: false }
  },
  parseDOM: [
    {
      tag: 'qti-simple-choice',
      context: 'qtiChoiceInteraction/',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier') || 'A',
          fixed: node.getAttribute('fixed') === 'true'
        };
      }
    },
    {
      tag: 'qti-simple-choice',
      context: 'qtiOrderInteraction/',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier') || 'A',
          fixed: node.getAttribute('fixed') === 'true'
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { identifier: node.attrs.identifier };
    // Only emit `fixed` when set, so unshuffled-by-default choices stay clean.
    if (node.attrs.fixed) attrs.fixed = 'true';
    return ['qti-simple-choice', attrs, 0];
  }
};

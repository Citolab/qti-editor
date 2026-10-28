import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceNodeSpec: NodeSpec = {
  placeholder: 'Enter option…',
  attrs: {
    identifier: { default: 'A' },
    // Standard QTI `fixed` flag, as on `qti-simple-choice`: the choice keeps its place when the
    // interaction shuffles.
    fixed: { default: false },
  },
  content: 'text*',
  inline: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'qti-inline-choice',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier') || 'A',
          fixed: node.getAttribute('fixed') === 'true',
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { identifier: node.attrs.identifier };
    if (node.attrs.fixed) attrs.fixed = 'true';
    return ['qti-inline-choice', attrs, 0];
  },
  selectable: true
};

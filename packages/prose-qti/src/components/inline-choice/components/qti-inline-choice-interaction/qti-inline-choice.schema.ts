import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceNodeSpec: NodeSpec = {
  placeholder: 'Enter option…',
  attrs: {
    identifier: { default: 'A' },
    // Standard QTI `fixed` flag, as on `qti-simple-choice`: the choice keeps its place when the
    // interaction shuffles.
    fixed: { default: false },
    // Kept as authored, so a round trip does not drop them; no editing UI. `null` = not written.
    class: { default: null },
    showHide: { default: null },
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
          class: node.getAttribute('class') || null,
          showHide: node.getAttribute('show-hide'),
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { identifier: node.attrs.identifier };
    if (node.attrs.fixed) attrs.fixed = 'true';
    if (node.attrs.class) attrs.class = node.attrs.class;
    if (node.attrs.showHide) attrs['show-hide'] = node.attrs.showHide;
    return ['qti-inline-choice', attrs, 0];
  },
  selectable: true
};

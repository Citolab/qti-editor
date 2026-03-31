import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiOrderInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleChoice+',
  attrs: {
    shuffle: { default: false },
    orientation: { default: 'vertical' },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-order-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          shuffle: node.getAttribute('shuffle') === 'true',
          orientation: node.getAttribute('orientation') || 'vertical',
          class: node.getAttribute('class') || null,
          correctResponse: node.getAttribute('correct-response') || null,
          responseIdentifier: node.getAttribute('response-identifier') || null,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    if (node.attrs.shuffle) attrs['shuffle'] = 'true';
    if (node.attrs.orientation && node.attrs.orientation !== 'vertical') attrs['orientation'] = node.attrs.orientation;
    if (node.attrs.class) attrs['class'] = node.attrs.class;
    if (node.attrs.correctResponse) attrs['correct-response'] = node.attrs.correctResponse;
    return ['qti-order-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};

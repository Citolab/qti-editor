import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiGapMatchInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiGapText{2,} paragraph+',
  attrs: {
    maxAssociations: { default: 1 },
    minAssociations: { default: 0 },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-gap-match-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxAssociations = node.getAttribute('max-associations');
        const minAssociations = node.getAttribute('min-associations');
        return {
          maxAssociations: maxAssociations ? parseInt(maxAssociations, 10) : 1,
          minAssociations: minAssociations ? parseInt(minAssociations, 10) : 0,
          shuffle: node.getAttribute('shuffle') === 'true',
          class: node.getAttribute('class'),
          correctResponse: node.getAttribute('correct-response'),
          responseIdentifier: node.getAttribute('response-identifier'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-associations': String(node.attrs.maxAssociations),
    };
    if (node.attrs.minAssociations > 0) {
      attrs['min-associations'] = String(node.attrs.minAssociations);
    }
    if (node.attrs.shuffle) {
      attrs.shuffle = 'true';
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    if (node.attrs.correctResponse) attrs['correct-response'] = node.attrs.correctResponse;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    return ['qti-gap-match-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};

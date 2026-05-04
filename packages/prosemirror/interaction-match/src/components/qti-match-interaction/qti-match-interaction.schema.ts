import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiMatchInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleMatchSet{2}',
  attrs: {
    maxAssociations: { default: 1 },
    minAssociations: { default: 0 },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-match-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxAssociations = node.getAttribute('max-associations');
        const minAssociations = node.getAttribute('min-associations');
        const className = node.getAttribute('class');
        const scoreAttr = node.getAttribute('score');
        return {
          maxAssociations: maxAssociations ? parseInt(maxAssociations, 10) : 1,
          minAssociations: minAssociations ? parseInt(minAssociations, 10) : 0,
          shuffle: node.getAttribute('shuffle') === 'true',
          class: className || null,
          correctResponse: node.getAttribute('correct-response'),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-associations': String(node.attrs.maxAssociations)
    };
    if (node.attrs.minAssociations > 0) {
      attrs['min-associations'] = String(node.attrs.minAssociations);
    }
    if (node.attrs.shuffle) {
      attrs['shuffle'] = 'true';
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    if (node.attrs.correctResponse) attrs['correct-response'] = node.attrs.correctResponse;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-match-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};

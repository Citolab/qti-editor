import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiHottextInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'paragraph+',
  attrs: {
    responseIdentifier: { default: null },
    maxChoices: { default: 1 },
    minChoices: { default: 0 },
    class: { default: null },
    correctResponse: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-hottext-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxChoices = node.getAttribute('max-choices');
        const minChoices = node.getAttribute('min-choices');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          maxChoices: maxChoices ? parseInt(maxChoices, 10) : 1,
          minChoices: minChoices ? parseInt(minChoices, 10) : 0,
          class: node.getAttribute('class'),
          correctResponse: node.getAttribute('correct-response'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-choices': String(node.attrs.maxChoices),
    };

    if (node.attrs.responseIdentifier) {
      attrs['response-identifier'] = node.attrs.responseIdentifier;
    }
    if (node.attrs.minChoices > 0) {
      attrs['min-choices'] = String(node.attrs.minChoices);
    }
    if (node.attrs.class) {
      attrs.class = node.attrs.class;
    }
    if (node.attrs.correctResponse) {
      attrs['correct-response'] = node.attrs.correctResponse;
    }

    return ['qti-hottext-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};

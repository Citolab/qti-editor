import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiExtendedTextInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt',
  attrs: {
    responseIdentifier: { default: null },
    expectedLength: { default: null },
    expectedLines: { default: null },
    placeholderText: { default: null },
    patternMask: { default: null },
    class: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-extended-text-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const expectedLength = node.getAttribute('expected-length');
        const expectedLines = node.getAttribute('expected-lines');
        const scoreAttr = node.getAttribute('score');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          expectedLength: expectedLength ? parseInt(expectedLength, 10) : null,
          expectedLines: expectedLines ? parseInt(expectedLines, 10) : null,
          placeholderText: node.getAttribute('placeholder-text'),
          patternMask: node.getAttribute('pattern-mask'),
          class: node.getAttribute('class') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.responseIdentifier) {
      attrs['response-identifier'] = node.attrs.responseIdentifier;
    }
    if (node.attrs.expectedLength != null) {
      attrs['expected-length'] = String(node.attrs.expectedLength);
    }
    if (node.attrs.expectedLines != null) {
      attrs['expected-lines'] = String(node.attrs.expectedLines);
    }
    if (node.attrs.placeholderText) {
      attrs['placeholder-text'] = node.attrs.placeholderText;
    }
    if (node.attrs.patternMask) {
      attrs['pattern-mask'] = node.attrs.patternMask;
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-extended-text-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};

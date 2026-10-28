import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiExtendedTextInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt?',
  attrs: {
    responseIdentifier: { default: null },
    expectedLength: { default: null },
    expectedLines: { default: null },
    placeholderText: { default: null },
    patternMask: { default: null },
    class: { default: null },
    score: { default: 1 },
    // QTI attributes the editor offers no control for. Modelled so a round trip keeps them: an
    // attribute the node has no slot for is gone on the first export. `data-patternmask-message`
    // is QTI 3 shared vocabulary — the message shown when the response fails `pattern-mask`.
    dataPatternmaskMessage: { default: null },
    format: { default: null },
    base: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-extended-text-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const expectedLength = node.getAttribute('expected-length');
        const expectedLines = node.getAttribute('expected-lines');
        const scoreAttr = node.getAttribute('score');
        const base = node.getAttribute('base');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          expectedLength: expectedLength ? parseInt(expectedLength, 10) : null,
          expectedLines: expectedLines ? parseInt(expectedLines, 10) : null,
          placeholderText: node.getAttribute('placeholder-text'),
          patternMask: node.getAttribute('pattern-mask'),
          class: node.getAttribute('class') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          dataPatternmaskMessage: node.getAttribute('data-patternmask-message'),
          format: node.getAttribute('format'),
          base: base ? parseInt(base, 10) : null,
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
    if (node.attrs.dataPatternmaskMessage) {
      attrs['data-patternmask-message'] = node.attrs.dataPatternmaskMessage;
    }
    if (node.attrs.format) {
      attrs.format = node.attrs.format;
    }
    if (node.attrs.base != null) {
      attrs.base = String(node.attrs.base);
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-extended-text-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};

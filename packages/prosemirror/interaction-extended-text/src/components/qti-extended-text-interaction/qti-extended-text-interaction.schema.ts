import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiExtendedTextInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt?',
  attrs: {
    responseIdentifier: { default: null },
    correctResponse: { default: null },
    expectedLength: { default: null },
    expectedLines: { default: null },
    placeholderText: { default: null },
    format: { default: 'plain' },
    patternMask: { default: null },
    base: { default: 10 },
    stringIdentifier: { default: null },
    maxStrings: { default: null },
    minStrings: { default: 0 },
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
        const base = node.getAttribute('base');
        const maxStrings = node.getAttribute('max-strings');
        const minStrings = node.getAttribute('min-strings');
        const className = node.getAttribute('class');
        const scoreAttr = node.getAttribute('score');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          correctResponse: node.getAttribute('correct-response'),
          expectedLength: expectedLength ? parseInt(expectedLength, 10) : null,
          expectedLines: expectedLines ? parseInt(expectedLines, 10) : null,
          placeholderText: node.getAttribute('placeholder-text'),
          format: node.getAttribute('format') || 'plain',
          patternMask: node.getAttribute('pattern-mask'),
          base: base ? parseInt(base, 10) : 10,
          stringIdentifier: node.getAttribute('string-identifier'),
          maxStrings: maxStrings ? parseInt(maxStrings, 10) : null,
          minStrings: minStrings ? parseInt(minStrings, 10) : 0,
          class: className || null,
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
    if (node.attrs.correctResponse) {
      attrs['correct-response'] = node.attrs.correctResponse;
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
    if (node.attrs.format && node.attrs.format !== 'plain') {
      attrs['format'] = node.attrs.format;
    }
    if (node.attrs.patternMask) {
      attrs['pattern-mask'] = node.attrs.patternMask;
    }
    if (node.attrs.base != null && node.attrs.base !== 10) {
      attrs['base'] = String(node.attrs.base);
    }
    if (node.attrs.stringIdentifier) {
      attrs['string-identifier'] = node.attrs.stringIdentifier;
    }
    if (node.attrs.maxStrings != null) {
      attrs['max-strings'] = String(node.attrs.maxStrings);
    }
    if (node.attrs.minStrings > 0) {
      attrs['min-strings'] = String(node.attrs.minStrings);
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-extended-text-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};

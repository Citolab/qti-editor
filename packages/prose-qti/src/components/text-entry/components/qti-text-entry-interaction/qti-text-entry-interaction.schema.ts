import { parseResponseAttribute, serializeResponseAttribute } from '@citolab/prose-qti/components/shared';

import {
  parseTextEntryCaseSensitiveAttribute,
  parseTextEntryClassState,
  serializeTextEntryClassState,
} from '../../attributes/text-entry-attributes-editor.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiTextEntryInteractionNodeSpec: NodeSpec = {
  attrs: {
    responseIdentifier: { default: null },
    correctResponse: { default: null },
    caseSensitive: { default: false },
    class: { default: null },
    placeholderText: { default: null },
    score: { default: 1 },
    // QTI attributes the editor offers no control for. Modelled so a round trip keeps them: an
    // attribute the node has no slot for is gone on the first export. `data-patternmask-message`
    // is QTI 3 shared vocabulary — the message shown when the response fails `pattern-mask`.
    expectedLength: { default: null },
    patternMask: { default: null },
    dataPatternmaskMessage: { default: null },
    format: { default: null },
    base: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-text-entry-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};

        const scoreAttr = node.getAttribute('score');
        const expectedLength = node.getAttribute('expected-length');
        const base = node.getAttribute('base');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          caseSensitive: parseTextEntryCaseSensitiveAttribute(node.getAttribute('case-sensitive')),
          class: serializeTextEntryClassState(
            parseTextEntryClassState(node.getAttribute('class')),
          ),
          placeholderText: node.getAttribute('placeholder-text') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          expectedLength: expectedLength ? parseInt(expectedLength, 10) : null,
          patternMask: node.getAttribute('pattern-mask'),
          dataPatternmaskMessage: node.getAttribute('data-patternmask-message'),
          format: node.getAttribute('format'),
          base: base ? parseInt(base, 10) : null,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};

    if (node.attrs.responseIdentifier) {
      attrs['response-identifier'] = node.attrs.responseIdentifier;
    }

    const serializedClass = serializeTextEntryClassState(parseTextEntryClassState(node.attrs.class));
    if (serializedClass) {
      attrs.class = serializedClass;
    }

    if (node.attrs.caseSensitive) {
      attrs['case-sensitive'] = 'true';
    }

    const cr = serializeResponseAttribute(node.attrs.correctResponse);
    if (cr) {
      attrs['correct-response'] = cr;
    }

    if (node.attrs.placeholderText) {
      attrs['placeholder-text'] = node.attrs.placeholderText;
    }
    attrs.score = String(node.attrs.score ?? 1);

    if (node.attrs.expectedLength != null) {
      attrs['expected-length'] = String(node.attrs.expectedLength);
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

    return ['qti-text-entry-interaction', attrs];
  },
  inline: true,
  group: 'inline',
  marks: '_',
  atom: true,
  selectable: true,
};

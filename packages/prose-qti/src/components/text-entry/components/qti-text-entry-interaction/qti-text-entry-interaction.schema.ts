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
  },
  parseDOM: [
    {
      tag: 'qti-text-entry-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};

        const scoreAttr = node.getAttribute('score');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          caseSensitive: parseTextEntryCaseSensitiveAttribute(node.getAttribute('case-sensitive')),
          class: serializeTextEntryClassState(
            parseTextEntryClassState(node.getAttribute('class')),
          ),
          placeholderText: node.getAttribute('placeholder-text') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
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

    return ['qti-text-entry-interaction', attrs];
  },
  inline: true,
  group: 'inline',
  marks: '_',
  atom: true,
  selectable: true,
};

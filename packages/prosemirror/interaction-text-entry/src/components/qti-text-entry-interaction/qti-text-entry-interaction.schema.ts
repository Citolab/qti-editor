import {
  getPrimaryTextEntryCorrectResponse,
  parseTextEntryCaseSensitiveAttribute,
  parseTextEntryClassState,
  parseTextEntryCorrectResponses,
  parseTextEntryLegacyCorrectResponse,
  serializeTextEntryClassState,
  serializeTextEntryCorrectResponsesAttribute,
} from '../../attributes/text-entry-attributes-editor.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiTextEntryInteractionNodeSpec: NodeSpec = {
  attrs: {
    responseIdentifier: { default: null },
    correctResponse: { default: null },
    correctResponses: { default: [] },
    caseSensitive: { default: false },
    class: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-text-entry-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};

        const legacyCorrectResponse = parseTextEntryLegacyCorrectResponse(
          node.getAttribute('correct-response'),
        );
        const parsedResponses = parseTextEntryCorrectResponses(node.getAttribute('correct-responses'));
        const correctResponses =
          parsedResponses.length > 0
            ? parsedResponses
            : legacyCorrectResponse
              ? [legacyCorrectResponse]
              : [];

        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          correctResponse: getPrimaryTextEntryCorrectResponse(correctResponses),
          correctResponses,
          caseSensitive: parseTextEntryCaseSensitiveAttribute(node.getAttribute('case-sensitive')),
          class: serializeTextEntryClassState(
            parseTextEntryClassState(node.getAttribute('class')),
          ),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    const correctResponses = parseTextEntryCorrectResponses(node.attrs.correctResponses);
    const primaryCorrectResponse =
      getPrimaryTextEntryCorrectResponse(correctResponses) ??
      parseTextEntryLegacyCorrectResponse(node.attrs.correctResponse);

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

    const serializedCorrectResponses = serializeTextEntryCorrectResponsesAttribute(correctResponses);
    if (serializedCorrectResponses) {
      attrs['correct-responses'] = serializedCorrectResponses;
    }

    if (primaryCorrectResponse) {
      attrs['correct-response'] = primaryCorrectResponse;
    }

    return ['qti-text-entry-interaction', attrs];
  },
  inline: true,
  group: 'inline',
  marks: '_',
  atom: true,
  selectable: true,
};

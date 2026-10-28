import { parseResponseAttribute, serializeResponseAttribute } from '@citolab/prose-qti/components/shared/response/codec.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

function isElementLike(node: Node | string): node is HTMLElement {
  return typeof node === 'object' && node !== null && 'getAttribute' in node && typeof node.getAttribute === 'function';
}

function parseCount(value: string | null, fallback: number): number {
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * `qti-hotspot-interaction`: an image with a set of `qti-hotspot-choice` regions; the candidate
 * selects one or more of them.
 *
 * Content is parsed as authored — prompt, picture, choices — rather than rebuilt in `getContent`
 * as select-point does, so a prompt keeps its formatting and pictures.
 *
 * `maxChoices` defaults to 1, QTI's own default for this interaction. `correctResponse` holds the
 * identifiers of the correct choices, comma-separated, exactly as choice does.
 */
export const qtiHotspotInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? imgHotspot qtiHotspotChoice*',
  selectable: true,
  defining: true,
  isolating: true,
  attrs: {
    responseIdentifier: { default: null },
    maxChoices: { default: 1 },
    minChoices: { default: 0 },
    class: { default: null },
    correctResponse: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-hotspot-interaction',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        const scoreAttr = node.getAttribute('score');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          maxChoices: parseCount(node.getAttribute('max-choices'), 1),
          minChoices: parseCount(node.getAttribute('min-choices'), 0),
          class: node.getAttribute('class') || null,
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { 'max-choices': String(node.attrs.maxChoices ?? 1) };
    if (node.attrs.minChoices) attrs['min-choices'] = String(node.attrs.minChoices);
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = String(node.attrs.responseIdentifier);
    if (node.attrs.class) attrs.class = String(node.attrs.class);
    const correctResponse = serializeResponseAttribute(node.attrs.correctResponse);
    if (correctResponse) attrs['correct-response'] = correctResponse;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-hotspot-interaction', attrs, 0];
  },
};

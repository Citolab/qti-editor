import { parseResponseAttribute, qtiAttributes, serializeResponseAttribute } from '@citolab/prose-qti/components/shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const keptAttributes = qtiAttributes({
  minChoices: { name: 'min-choices', type: 'integer' },
  dataMinSelectionsMessage: 'data-min-selections-message',
  dataMaxSelectionsMessage: 'data-max-selections-message',
});

/**
 * `orientation` on a choice interaction is superseded by the `qti-orientation-*` class, which the
 * class editor manages and the runtime gives precedence. An imported attribute becomes that class,
 * so the author sees and can change it; a class that already names an orientation wins, as it does
 * at runtime. Keeping the attribute as well would export two spellings that can disagree.
 */
function classWithOrientation(className: string | null, orientation: string | null): string | null {
  if (orientation !== 'horizontal' && orientation !== 'vertical') return className || null;
  if (/(^|\s)qti-orientation-/.test(className ?? '')) return className || null;
  return [className, `qti-orientation-${orientation}`].filter(Boolean).join(' ');
}

export const qtiChoiceInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleChoice+',
  attrs: {
    maxChoices: { default: 0 },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
    // Standard QTI `shuffle` flag: when true the choices are presented in a
    // randomized order at delivery time (choices with `fixed` keep their spot).
    shuffle: { default: false },
    ...keptAttributes.attrs,
  },
  parseDOM: [
    {
      tag: 'qti-choice-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxChoices = node.getAttribute('max-choices');
        const className = node.getAttribute('class');
        const scoreAttr = node.getAttribute('score');
        return {
          maxChoices: maxChoices ? parseInt(maxChoices, 10) : 0,
          class: classWithOrientation(className, node.getAttribute('orientation')),
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          shuffle: node.getAttribute('shuffle') === 'true',
          ...keptAttributes.parse(node),
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { 'max-choices': String(node.attrs.maxChoices) };
    if (node.attrs.class) attrs.class = node.attrs.class;
    const cr = serializeResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    // Only emit `shuffle` when set, so unshuffled-by-default interactions stay clean.
    if (node.attrs.shuffle) attrs.shuffle = 'true';
    return ['qti-choice-interaction', { ...attrs, ...keptAttributes.domAttrs(node.attrs) }, 0];
  },
  defining: true,
  isolating: true
};

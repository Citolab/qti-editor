import { classAndIdAttrSpecs, classAndIdDomAttrs, parseClassAndId } from '../../class-and-id.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiPromptNodeSpec: NodeSpec = {
  content: 'qtiPromptParagraph',
  placeholder: 'Enter the question or instruction…',
  attrs: classAndIdAttrSpecs,
  parseDOM: [
    { tag: 'qti-prompt', context: 'qtiChoiceInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiOrderInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiAssociateInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiMatchInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiMatchInteractionTabular//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiGapMatchInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiExtendedTextInteraction//', getAttrs: parseClassAndId },
    { tag: 'qti-prompt', context: 'qtiSelectPointInteraction//', getAttrs: parseClassAndId },
  ],
  toDOM(node): DOMOutputSpec {
    return ['qti-prompt', classAndIdDomAttrs(node.attrs), 0];
  }
};

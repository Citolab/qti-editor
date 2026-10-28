import { withGlobalAttrs } from '@citolab/prose-extensions/html-schema';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

// `class`, `id`, `lang` and `xml:lang`, in both schemas: see `global-attrs.ts` in prose-extensions.
export const qtiPromptNodeSpec: NodeSpec = withGlobalAttrs({
  content: 'qtiPromptParagraph',
  placeholder: 'Enter the question or instruction…',
  parseDOM: [
    { tag: 'qti-prompt', context: 'qtiChoiceInteraction//' },
    { tag: 'qti-prompt', context: 'qtiOrderInteraction//' },
    { tag: 'qti-prompt', context: 'qtiAssociateInteraction//' },
    { tag: 'qti-prompt', context: 'qtiMatchInteraction//' },
    { tag: 'qti-prompt', context: 'qtiMatchInteractionTabular//' },
    { tag: 'qti-prompt', context: 'qtiGapMatchInteraction//' },
    { tag: 'qti-prompt', context: 'qtiExtendedTextInteraction//' },
    { tag: 'qti-prompt', context: 'qtiSelectPointInteraction//' },
  ],
  toDOM(): DOMOutputSpec {
    return ['qti-prompt', 0];
  }
});

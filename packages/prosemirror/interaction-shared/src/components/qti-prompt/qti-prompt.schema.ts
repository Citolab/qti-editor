import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiPromptNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPromptParagraph',
  placeholder: 'Enter the question or instruction…',
  parseDOM: [{ tag: 'qti-prompt' }],
  toDOM(): DOMOutputSpec {
    return ['qti-prompt', 0];
  }
};

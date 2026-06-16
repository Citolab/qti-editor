import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiPromptParagraphNodeSpec: NodeSpec = {
  group: 'block',
  content: 'text*',
  parseDOM: [{ tag: 'p', context: 'qtiPrompt/', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
};

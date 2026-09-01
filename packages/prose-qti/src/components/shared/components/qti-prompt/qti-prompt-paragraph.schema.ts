import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: `qtiPrompt` names this directly, and the `parseDOM` rule below already says
 * `context: 'qtiPrompt/'` — the node was declaring that it only belongs there while the group said
 * otherwise. See "The block group" in schema/create-qti-schema.ts.
 */
export const qtiPromptParagraphNodeSpec: NodeSpec = {
  content: 'text*',
  parseDOM: [{ tag: 'p', context: 'qtiPrompt/', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
};

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: `qtiPrompt` names this directly, and the `parseDOM` rule below already says
 * `context: 'qtiPrompt//'` — the node was declaring that it only belongs there while the group said
 * otherwise. See "The block group" in schema/create-qti-schema.ts.
 *
 * The context is `//` (ancestor at any depth), not `/` (immediate parent), because a cursor sits
 * inside this paragraph rather than inside the prompt, so `/` never matched on paste. See the long
 * note in qti-simple-choice.schema.ts.
 *
 * Widening this one does NOT on its own improve pasting into a prompt, and measured in isolation it
 * makes the failure uglier: a stray paragraph now matches `qtiPromptParagraph` from anywhere, and
 * `findWrapping` builds a whole `qtiExtendedTextInteraction` around it to make that legal. The
 * paste rescue in `schema/paste-rescue.ts` is what stops such a paragraph reaching the fitter at
 * all; this rule is widened for consistency with the others, and is inert without it.
 */
export const qtiPromptParagraphNodeSpec: NodeSpec = {
  content: 'text*',
  parseDOM: [{ tag: 'p', context: 'qtiPrompt//', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
};

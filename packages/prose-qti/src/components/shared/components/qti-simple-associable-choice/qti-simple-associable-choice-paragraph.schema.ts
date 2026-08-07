import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleAssociableChoiceParagraphNodeSpec: NodeSpec = {
  content: 'inline*',
  /*
   * Scoped to its own parent, like `qtiSimpleChoiceParagraph` and `qtiPromptParagraph`.
   *
   * This rule used to be a bare `{ tag: 'p' }`. With no context it matched EVERY paragraph in the
   * document, and because ProseMirror synthesises whatever parent a matched node requires, an
   * ordinary `<p>` in `qti-item-body` came back as a stray `qtiSimpleAssociableChoice` — a
   * drag-and-drop answer chip wrapped around the author's prose.
   *
   * It went unnoticed because content that sits inside a `qti-layout-*` div parses into
   * `qtiLayoutDiv` first, whose context makes the more specific rules win. Items whose body is not
   * wrapped in one hit it immediately.
   */
  parseDOM: [{ tag: 'p', context: 'qtiSimpleAssociableChoice/', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  }
};

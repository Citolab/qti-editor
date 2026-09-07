import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleChoiceNodeSpec: NodeSpec = {
  content: 'qtiSimpleChoiceParagraph',
  placeholder: 'Enter answer option…',
  attrs: {
    identifier: { default: 'A' },
    // Standard QTI `fixed` flag: when true the choice keeps its position and is
    // not shuffled. Boolean so the attributes panel renders it as a checkbox.
    fixed: { default: false }
  },
  /*
   * ## Why `//` and not `/`
   *
   * `context: 'qtiChoiceInteraction/'` means "the immediate parent is a choice interaction". That
   * is true when parsing a whole item body, and false for every paste an author actually makes.
   *
   * `ParseContext.matchesContext` resolves depth 0 of the parsed fragment against
   * `$context.node($context.depth)` — the node the CURSOR is in. A cursor inside a choice sits in
   * the `qtiSimpleChoiceParagraph` at depth 3, not in the interaction at depth 1, so the rule was
   * tested against the paragraph and never matched. The consequence was silent: a pasted
   * `<qti-simple-choice>` — including one copied out of this very editor — fell through to the
   * plain `paragraph` rule, lost its identifier, and became a block that is legal in neither the
   * choice nor the interaction. ProseMirror's fitter then closed out of both and reopened the
   * interaction for the remainder, SPLITTING it in two, with both halves keeping the same
   * `responseIdentifier` until the composer's duplicate guard renamed one at save time.
   *
   * `//` matches the node as an ancestor at any depth, which is what a cursor position can
   * actually satisfy. Measured: whole-item-body parses are byte-identical, and the packages
   * browser suite is unchanged.
   *
   * This repairs the PARSE only. Multi-block pastes still need somewhere to go, and the fitter
   * still invents a `qtiSimpleChoice` with the default `identifier: 'A'` when it needs a slot — see
   * the paste rescue in `schema/paste-rescue.ts`, which is what makes the fit correct. Widening
   * here is what lets that rescue carry a real identifier across instead of minting a new one.
   */
  parseDOM: [
    {
      tag: 'qti-simple-choice',
      context: 'qtiChoiceInteraction//',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier') || 'A',
          fixed: node.getAttribute('fixed') === 'true'
        };
      }
    },
    {
      tag: 'qti-simple-choice',
      context: 'qtiOrderInteraction//',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        return {
          identifier: node.getAttribute('identifier') || 'A',
          fixed: node.getAttribute('fixed') === 'true'
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { identifier: node.attrs.identifier };
    // Only emit `fixed` when set, so unshuffled-by-default choices stay clean.
    if (node.attrs.fixed) attrs.fixed = 'true';
    return ['qti-simple-choice', attrs, 0];
  }
};

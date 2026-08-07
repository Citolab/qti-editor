import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const USE_VALUES = ['instructions', 'scoring', 'navigation'] as const;
const VIEW_VALUES = ['author', 'candidate', 'proctor', 'scorer', 'testConstructor', 'tutor'] as const;

export const QTI_RUBRIC_BLOCK_USE_VALUES = USE_VALUES;
export const QTI_RUBRIC_BLOCK_VIEW_VALUES = VIEW_VALUES;

/**
 * QTI Rubric Block node specification.
 *
 * Authors instructions / scoring / navigation rubrics inside qti-item-body.
 * Content is the `richtext` group — paragraphs, lists and tables, whichever of
 * them the host schema places in that group. No interactions.
 *
 * A group rather than named node types (`(paragraph | table | ...)+`) on
 * purpose: a group reference resolves as long as *some* node carries the group,
 * whereas a name reference makes every host schema define that exact node.
 * The pure-ProseMirror hosts — including the e2e story harnesses, built on
 * `prosemirror-schema-basic` — have no table or list nodes at all, and naming
 * them makes `Schema` construction throw before a single test runs.
 *
 * The ProseKit hosts get their `richtext` memberships from
 * `defineBasicExtension` in `@citolab/prose-extensions/prosekit`; see the note
 * there on why paragraph cannot be patched into the group after the fact.
 *
 * On the wire the body is wrapped in <qti-content-body>; that wrapper is
 * pure serialization framing — it has no PM node.
 */
export const qtiRubricBlockNodeSpec: NodeSpec = {
  group: 'block',
  /*
   * `paragraph` is named first so it is what an empty rubric block fills with.
   *
   * The accepted content is unchanged — paragraph is in `richtext`, so this matches exactly what
   * `richtext+` did. But ProseMirror resolves an empty node's filler via `ContentMatch.defaultType`,
   * the first edge of the expression, and for a bare group reference that is whichever node is first
   * in the group — `table`. An emptied rubric block therefore came back holding an empty table.
   */
  content: '(paragraph | richtext)+',
  defining: true,
  // Let the gap cursor settle directly before/after the rubric block so authors
  // can place a cursor between it and an adjacent interaction (or below it at the
  // end of the body) instead of being forced inside its paragraphs.
  createGapCursor: true,
  attrs: {
    use: { default: 'instructions' },
    view: { default: 'author' },
  },
  parseDOM: [
    {
      tag: 'qti-rubric-block',
      contentElement: (dom: HTMLElement): HTMLElement => {
        const inner = dom.querySelector('qti-content-body');
        return (inner instanceof HTMLElement) ? inner : dom;
      },
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return {
          use: dom.getAttribute('use') ?? 'instructions',
          view: dom.getAttribute('view') ?? 'author',
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'qti-rubric-block',
      {
        use: node.attrs.use,
        view: node.attrs.view,
        class: 'qti-rubric-block',
      },
      ['qti-content-body', {}, 0],
    ];
  },
};

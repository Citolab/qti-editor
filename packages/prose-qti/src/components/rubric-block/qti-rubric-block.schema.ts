import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const USE_VALUES = ['instructions', 'scoring', 'navigation'] as const;
const VIEW_VALUES = ['author', 'candidate', 'proctor', 'scorer', 'testConstructor', 'tutor'] as const;

export const QTI_RUBRIC_BLOCK_USE_VALUES = USE_VALUES;
export const QTI_RUBRIC_BLOCK_VIEW_VALUES = VIEW_VALUES;

/**
 * QTI Rubric Block node specification.
 *
 * Authors instructions / scoring / navigation rubrics inside qti-item-body.
 * Content is restricted to the `richtext` group (paragraphs, lists, and tables
 * - whichever the host schema places in that group). No interactions.
 *
 * On the wire the body is wrapped in <qti-content-body>; that wrapper is
 * pure serialization framing — it has no PM node.
 */
export const qtiRubricBlockNodeSpec: NodeSpec = {
  group: 'block',
  content: 'richtext+',
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

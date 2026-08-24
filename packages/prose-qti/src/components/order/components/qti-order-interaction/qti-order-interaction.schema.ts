import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiOrderInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleChoice+',
  attrs: {
    shuffle: { default: false },
    orientation: { default: 'vertical' },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-order-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const scoreAttr = node.getAttribute('score');
        return {
          shuffle: node.getAttribute('shuffle') === 'true',
          orientation: node.getAttribute('orientation') || 'vertical',
          class: node.getAttribute('class') || null,
          correctResponse: node.getAttribute('correct-response') || null,
          responseIdentifier: node.getAttribute('response-identifier') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    if (node.attrs.shuffle) attrs['shuffle'] = 'true';
    // Written even when it is the 'vertical' default — unless the class already spells the
    // orientation, in which case the class wins and this stays silent.
    //
    // `qti-order-interaction.styles.ts` upstream lays the whole interaction out from this attribute
    // and from the equivalent `qti-orientation-*` class, and has NO rule for the case where neither
    // is present: an element with no orientation falls into the *unspecified* platform default,
    // which upstream defines as the two-column `'drags drops'` grid. So a freshly inserted order
    // interaction — node spec default `'vertical'`, attribute suppressed as redundant — rendered
    // the opposite of what its own node says, with the drop slots ragged inside half-width `1fr`
    // tracks. Writing the default is what makes the model and the rendering agree.
    //
    // The class check is not cosmetic. `orientation` defaults to `'vertical'` for any element that
    // did not carry the attribute, including ITEM013, whose source says
    // `class="qti-orientation-horizontal"`. Writing both unconditionally would export two spellings
    // of one QTI concept that CONTRADICT each other.
    //
    // Reflecting the property on the custom element instead is not an option: the attribute-sync
    // plugin observes attribute mutations and writes them back into the node, so an element that
    // reflects its own default re-renders itself forever (verified — it hangs the editor).
    const orientationInClass = /(^|\s)qti-orientation-/.test(node.attrs.class ?? '');
    if (node.attrs.orientation && !orientationInClass) attrs['orientation'] = node.attrs.orientation;
    if (node.attrs.class) attrs['class'] = node.attrs.class;
    // correctResponse is a comma-separated identifier list (qti-components
    // convention) — pass through as-is.
    if (node.attrs.correctResponse) attrs['correct-response'] = node.attrs.correctResponse;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-order-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};

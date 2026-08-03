import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/**
 * The QTI layout wrappers — `<div class="qti-layout-row">` and `<div class="qti-layout-colN">`.
 *
 * ## Why this lives in the package and not in an app
 *
 * It looked app-private for a while, and was not. Three things say otherwise:
 *
 *   - The wrappers are **author-written in the source QTI**. They arrive in the XML; the editor did
 *     not invent them.
 *   - **qti-components styles them**, in its own theme, at
 *     `packages/qti-theme/src/styles/qti-native/qti3p0-override-layout.css` — the filename says what
 *     they are: a QTI 3.0 layout override.
 *   - The spec existed as **two byte-identical copies**, in QTI-Editor's ProseMirror app and in the
 *     Angular editor. Diffed and confirmed identical before this move.
 *
 * So it is item-format vocabulary. The document model belongs to the package; only the *editing
 * behaviour* around it (the lock plugin that stops the wrappers being edited away) belongs to an app.
 *
 * ## What omitting it costs
 *
 * Everything: a schema without this node silently DROPS every wrapper on import. That is not
 * theoretical — 8 of the 17 regression fixtures carry `qti-layout-*`, and with the node absent a
 * Node roundtrip of the corpus reproduces 9/17 of the committed snapshots. With it, 17/17.
 *
 * It has bitten before. `apps/e2e/stories/prosemirror-base.ts` records that only ITEM001/002 once
 * had it, so the other 15 stories dropped the wrappers and the theme's
 * `@media (width <= 767px)` rule appeared not to work in the editor — there was nothing left for it
 * to match.
 *
 * ## Shape
 *
 * One spec covers both row and column: both are block-level and hold block content, so the
 * distinction is carried entirely by the preserved `class` string.
 *
 * `isolating` keeps edits and Backspace/Delete joins from crossing the wrapper boundary;
 * `selectable: false` stops the wrapper being node-selected and deleted.
 */
const LAYOUT_CLASS_PREFIX = 'qti-layout-';

/** True when `className` marks a QTI layout wrapper (`qti-layout-row` / `-colN`). */
export function isQtiLayoutClass(className: string | null): boolean {
  return !!className && className.split(/\s+/).some(token => token.startsWith(LAYOUT_CLASS_PREFIX));
}

export const qtiLayoutDivNodeSpec: NodeSpec = {
  group: 'block',
  content: 'block+',
  attrs: {
    class: { default: null }
  },
  parseDOM: [
    {
      tag: 'div',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        const className = node.getAttribute('class');
        if (!isQtiLayoutClass(className)) return false;
        return { class: className };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.class) attrs.class = node.attrs.class as string;
    return ['div', attrs, 0];
  },
  defining: true,
  isolating: true,
  selectable: false
};

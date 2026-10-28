import { langMarkSpec, withLangAttr } from '@citolab/prose-extensions/lang';
import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic';

import { qtiLayoutDivNodeSpec } from './qti-layout-div.js';

import type { NodeSpec } from 'prosemirror-model';

function stripUnit(value: string): string {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?px$/i.test(trimmed)) {
    return trimmed.replace(/px$/i, '');
  }
  return trimmed;
}

function toDimensionAttr(value: string | null): string | null {
  if (!value) return null;
  const normalized = stripUnit(value);
  return normalized.length > 0 ? normalized : null;
}

function buildImageDomAttrs(attrs: Record<string, unknown>): Record<string, string> {
  const domAttrs: Record<string, string> = {};

  const src = attrs.src;
  if (typeof src === 'string' && src.length > 0) domAttrs.src = src;

  const alt = attrs.alt;
  if (typeof alt === 'string' && alt.length > 0) domAttrs.alt = alt;

  const title = attrs.title;
  if (typeof title === 'string' && title.length > 0) domAttrs.title = title;

  const width = attrs.width;
  if (typeof width === 'string' && width.length > 0) domAttrs.width = width;

  const height = attrs.height;
  if (typeof height === 'string' && height.length > 0) domAttrs.height = height;

  return domAttrs;
}

const qtiImageNodeSpec: NodeSpec = {
  ...basicNodes.image,
  attrs: {
    ...(basicNodes.image.attrs ?? {}),
    width: { default: null, validate: 'string|null' },
    height: { default: null, validate: 'string|null' }
  },
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs(dom) {
        if (!(dom instanceof HTMLElement)) return false;
        return {
          src: dom.getAttribute('src'),
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt'),
          width: toDimensionAttr(dom.getAttribute('width')),
          height: toDimensionAttr(dom.getAttribute('height'))
        };
      }
    }
  ],
  toDOM(node) {
    return ['img', buildImageDomAttrs(node.attrs as Record<string, unknown>)];
  }
};

/**
 * prosemirror-schema-basic, extended. Overrides and one addition — nothing is removed.
 *
 * ## Nothing is removed, deliberately
 *
 * There used to be a `createQtiBasicNodes({ omitBlockquote })` beside this, defaulting to dropping
 * `blockquote` on the stated grounds that "QTI item bodies do not model it". That is false: the QTI
 * 3 implementation guide's own worked examples put `<blockquote>` inside `<qti-item-body>` (§3.2.3
 * nests one in a `<div>`, §3.2.8 closes one directly before `</qti-item-body>`), and `<hr>`,
 * `<pre>` and `<code>` are permitted alongside it.
 *
 * It had no callers, so nothing was actually trimmed — but its default contradicted what
 * `createQtiSchema()` does, leaving two answers to one question. Removed rather than corrected,
 * because a knob for removing valid item content is a knob for silently losing an author's markup:
 * ProseMirror's parser does not reject what it has no node for, it drops it. Same reasoning that
 * put `qtiLayoutDiv` below into the base set rather than behind an opt-in.
 *
 * A host that genuinely wants a narrower document builds its own `nodes` object; it does not need
 * this module's permission.
 */
export const qtiBasicNodes = {
  ...basicNodes,
  /*
   * prosemirror-schema-basic's image models src/alt/title and drops width and
   * height outright, so an authored `<img width="120">` came back without its dimensions.
   */
  image: qtiImageNodeSpec,
  /*
   * `lang`, which `importXmlAsHtml` makes of an authored `xml:lang`. Without the attribute the
   * language of a paragraph or heading was dropped on import; `pmToRoundtripXml` writes it back as
   * `xml:lang`. The lists get it in `createQtiSchema`, where they are assembled.
   */
  paragraph: withLangAttr(basicNodes.paragraph),
  heading: withLangAttr(basicNodes.heading),
  /*
   * In the basic set rather than opt-in, because omitting it is not a smaller schema — it is a
   * lossy one. Without this node the author's `<div class="qti-layout-row">` wrappers are dropped
   * on import, and every consumer that forgot to add it was silently losing them. See
   * qti-layout-div.ts.
   */
  qtiLayoutDiv: qtiLayoutDivNodeSpec
};

/**
 * prosemirror-schema-basic's marks, plus `lang`. Re-exported so a host takes its nodes and marks
 * from one place. `code` — one of the four elements QTI permits that people expect to find in the
 * node set — lives here, as a mark, not a node.
 *
 * `lang` is `<span xml:lang="…">` (a phrase in another language), held as HTML `lang` — the import
 * turns `xml:lang` into `lang` — and written back as `xml:lang` by `pmToRoundtripXml`.
 */
export const qtiBasicMarks = { ...basicMarks, lang: langMarkSpec };

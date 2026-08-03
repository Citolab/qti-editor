import { nodes as basicNodes, marks as basicMarks } from 'prosemirror-schema-basic';

import { qtiLayoutDivNodeSpec } from './qti-layout-div.js';

import type { NodeSpec } from 'prosemirror-model';

interface QtiBasicNodeOptions {
  omitBlockquote?: boolean;
}

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

const qtiBasicNodesDefault = {
  ...basicNodes,
  image: qtiImageNodeSpec,
  /*
   * In the basic set rather than opt-in, because omitting it is not a smaller schema — it is a
   * lossy one. Without this node the author's `<div class="qti-layout-row">` wrappers are dropped
   * on import, and every consumer that forgot to add it was silently losing them. See
   * qti-layout-div.ts.
   */
  qtiLayoutDiv: qtiLayoutDivNodeSpec
};

export const qtiBasicMarks = basicMarks;

export const qtiBasicNodes = qtiBasicNodesDefault;

export function createQtiBasicNodes(options: QtiBasicNodeOptions = {}): Record<string, NodeSpec> {
  const { omitBlockquote = true } = options;
  const nextNodes = { ...qtiBasicNodesDefault };

  if (omitBlockquote) {
    const { blockquote: _blockquote, ...withoutBlockquote } = nextNodes;
    return withoutBlockquote;
  }

  return nextNodes;
}

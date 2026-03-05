import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

function parseNumberAttribute(value: string | null): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isElementLike(node: Node | string): node is HTMLElement {
  return typeof node === 'object' && node !== null && 'getAttribute' in node && typeof node.getAttribute === 'function';
}

export const imgSelectPointNodeSpec: NodeSpec = {
  group: 'block qtiMedia',
  atom: true,
  selectable: true,
  attrs: {
    imageSrc: { default: null },
    imageAlt: { default: null },
    imageWidth: { default: null },
    imageHeight: { default: null }
  },
  parseDOM: [
    {
      tag: 'img',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        return {
          imageSrc: node.getAttribute('src'),
          imageAlt: node.getAttribute('alt'),
          imageWidth: parseNumberAttribute(node.getAttribute('width')),
          imageHeight: parseNumberAttribute(node.getAttribute('height'))
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.imageSrc) attrs.src = String(node.attrs.imageSrc);
    if (node.attrs.imageAlt) attrs.alt = String(node.attrs.imageAlt);
    if (node.attrs.imageWidth != null) attrs.width = String(node.attrs.imageWidth);
    if (node.attrs.imageHeight != null) attrs.height = String(node.attrs.imageHeight);
    return ['img', attrs];
  }
};

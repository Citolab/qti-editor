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
  group: 'block',
  atom: true,
  selectable: true,
  attrs: {
    class: { default: null },
    correctResponse: { default: null },
    imageSrc: { default: null },
    imageAlt: { default: null },
    imageWidth: { default: null },
    imageHeight: { default: null },
    areaMappings: { default: '[]' }
  },
  parseDOM: [
    {
      tag: 'img-select-point',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        return {
          class: node.getAttribute('class'),
          correctResponse: node.getAttribute('correct-response'),
          imageSrc: node.getAttribute('image-src'),
          imageAlt: node.getAttribute('image-alt'),
          imageWidth: parseNumberAttribute(node.getAttribute('image-width')),
          imageHeight: parseNumberAttribute(node.getAttribute('image-height')),
          areaMappings: node.getAttribute('area-mappings') || '[]'
        };
      }
    },
    {
      tag: 'img',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        return {
          imageSrc: node.getAttribute('src'),
          imageAlt: node.getAttribute('alt'),
          imageWidth: parseNumberAttribute(node.getAttribute('width')),
          imageHeight: parseNumberAttribute(node.getAttribute('height')),
          areaMappings: '[]'
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'area-mappings': String(node.attrs.areaMappings ?? '[]')
    };

    if (node.attrs.class) attrs.class = String(node.attrs.class);
    if (node.attrs.correctResponse) attrs['correct-response'] = String(node.attrs.correctResponse);
    if (node.attrs.imageSrc) attrs['image-src'] = String(node.attrs.imageSrc);
    if (node.attrs.imageAlt) attrs['image-alt'] = String(node.attrs.imageAlt);
    if (node.attrs.imageWidth != null) attrs['image-width'] = String(node.attrs.imageWidth);
    if (node.attrs.imageHeight != null) attrs['image-height'] = String(node.attrs.imageHeight);

    return ['img-select-point', attrs];
  }
};

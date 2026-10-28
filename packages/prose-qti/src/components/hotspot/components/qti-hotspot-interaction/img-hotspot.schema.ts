import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

function isElementLike(node: Node | string): node is HTMLElement {
  return typeof node === 'object' && node !== null && 'getAttribute' in node && typeof node.getAttribute === 'function';
}

/**
 * What an `<object>` holds for a reader that cannot show it, in order: a run of text, or a fallback
 * `<img>` with all its attributes.
 */
export type ImageFallbackPart = string | { img: Record<string, string> };

/**
 * An `<object>`'s fallback content as {@link ImageFallbackPart}s. Text is trimmed and whitespace-only
 * text dropped; an `<img>` keeps every attribute; any other element is reduced to its text.
 */
export function readObjectFallback(object: Element): ImageFallbackPart[] {
  const parts: ImageFallbackPart[] = [];
  for (const child of Array.from(object.childNodes)) {
    if (child.nodeType === 1 && (child as Element).localName === 'img') {
      const img = child as Element;
      parts.push({ img: Object.fromEntries(Array.from(img.attributes).map(attr => [attr.name, attr.value])) });
      continue;
    }
    const text = child.textContent?.trim();
    if (text) parts.push(text);
  }
  return parts;
}

/**
 * The picture a hotspot interaction's choices are drawn on.
 *
 * QTI allows it as `<img>` or `<object>`, and the editor keeps whichever was authored: `imageTag`
 * records it and `imageSrc` holds `src` or `data`. An `<img>`'s `alt` is `imageAlt`; an `<object>`'s
 * fallback content — text, a fallback `<img>`, or both — is `imageFallback` (see
 * {@link ImageFallbackPart}). `imageWidth` / `imageHeight` are kept as written, since they define
 * the coordinate space every `coords` is measured in. `class` is kept; `id` is not.
 *
 * Not selectable: a press on the picture selects an area or the interaction (see
 * `hotspot-choice-editing.ts`), and with the picture itself selected, Delete would replace it with an
 * empty one, since the interaction cannot do without it.
 *
 * No `group` (unlike `imgSelectPoint`): only `qtiHotspotInteraction` names it. The parse rules use the
 * `/` context — immediate parent — and not `//`, because a hotspot prompt is parsed as authored and
 * may hold a picture of its own, which must stay an ordinary inline `image`.
 */
export const imgHotspotNodeSpec: NodeSpec = {
  atom: true,
  selectable: false,
  attrs: {
    imageTag: { default: 'img' },
    imageSrc: { default: null },
    imageAlt: { default: null },
    imageWidth: { default: null },
    imageHeight: { default: null },
    imageType: { default: null },
    imageClass: { default: null },
    imageFallback: { default: null },
  },
  parseDOM: [
    {
      tag: 'img',
      context: 'qtiHotspotInteraction/',
      priority: 60,
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        return {
          imageTag: 'img',
          imageSrc: node.getAttribute('src'),
          imageAlt: node.getAttribute('alt'),
          imageWidth: node.getAttribute('width'),
          imageHeight: node.getAttribute('height'),
          imageType: node.getAttribute('type'),
          imageClass: node.getAttribute('class') || null,
        };
      },
    },
    {
      tag: 'object',
      context: 'qtiHotspotInteraction/',
      priority: 60,
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        const fallback = readObjectFallback(node);
        return {
          imageTag: 'object',
          imageSrc: node.getAttribute('data'),
          imageWidth: node.getAttribute('width'),
          imageHeight: node.getAttribute('height'),
          imageType: node.getAttribute('type'),
          imageClass: node.getAttribute('class') || null,
          imageFallback: fallback.length > 0 ? fallback : null,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const { imageTag, imageSrc, imageAlt, imageWidth, imageHeight, imageType, imageClass } = node.attrs;
    const attrs: Record<string, string> = {};

    if (imageTag === 'object') {
      if (imageSrc) attrs.data = String(imageSrc);
      if (imageType) attrs.type = String(imageType);
      if (imageWidth != null) attrs.width = String(imageWidth);
      if (imageHeight != null) attrs.height = String(imageHeight);
      if (imageClass) attrs.class = String(imageClass);
      const fallback = (node.attrs.imageFallback ?? []) as ImageFallbackPart[];
      // Without fallback content of its own (a picture set in the editor), `imageAlt` is the text.
      const children: Array<string | [string, Record<string, string>]> =
        fallback.length > 0
          ? fallback.map(part => (typeof part === 'string' ? part : ['img', { ...part.img }]))
          : imageAlt
            ? [String(imageAlt)]
            : [];
      return ['object', attrs, ...children];
    }

    if (imageSrc) attrs.src = String(imageSrc);
    if (imageAlt) attrs.alt = String(imageAlt);
    if (imageWidth != null) attrs.width = String(imageWidth);
    if (imageHeight != null) attrs.height = String(imageHeight);
    if (imageType) attrs.type = String(imageType);
    if (imageClass) attrs.class = String(imageClass);
    return ['img', attrs];
  },
};

import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';

import type { Slice } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

type ListInfo = {
  type: 'ol' | 'ul';
  level: number;
  source: 'word' | 'text';
};

const semanticPastePluginKey = new PluginKey('semantic-paste');

type ClipboardImage = {
  src: string;
  alt: string;
};

function normalizeSpaces(text: string): string {
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function removeNbspFromTree(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    current.textContent = current.textContent?.replace(/\u00A0/g, ' ') ?? '';
    current = walker.nextNode();
  }
}

function isWordListParagraph(el: HTMLElement): boolean {
  const cls = el.className || '';
  const style = (el.getAttribute('style') || '').toLowerCase();

  return (
    /^MsoListParagraph/.test(cls) ||
    cls.includes('MsoListParagraphCxSp') ||
    style.includes('mso-list:')
  );
}

function getWordListLevel(el: HTMLElement): number {
  const style = el.getAttribute('style') || '';
  const match = style.match(/level(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return 1;
}

function getWordListMarkerText(el: HTMLElement): string | null {
  const markerEl = el.querySelector('[style*="mso-list:Ignore"], [style*="mso-list:ignore"]');
  if (!markerEl) return null;
  return normalizeSpaces(markerEl.textContent || '');
}

function detectListTypeFromMarker(marker: string | null): 'ol' | 'ul' | null {
  if (!marker) return null;

  const trimmed = normalizeSpaces(marker);

  if (/^(\d+|[a-zA-Z]+|[ivxlcdmIVXLCDM]+)[.)]?$/.test(trimmed)) {
    return 'ol';
  }

  if (/^(•|·|o|\*|-|–|—)$/.test(trimmed)) {
    return 'ul';
  }

  return null;
}

function detectTextListType(el: HTMLElement): 'ol' | 'ul' | null {
  const text = normalizeSpaces(el.textContent || '');

  if (/^(\d+|[a-zA-Z]+|[ivxlcdmIVXLCDM]+)[.)]\s+/.test(text)) {
    return 'ol';
  }

  if (/^(•|·|\*|-|–|—)\s+/.test(text)) {
    return 'ul';
  }

  return null;
}

function getListInfo(el: HTMLElement): ListInfo | null {
  if (isWordListParagraph(el)) {
    const marker = getWordListMarkerText(el);
    const detected = detectListTypeFromMarker(marker) ?? detectTextListType(el) ?? 'ul';

    return {
      type: detected,
      level: getWordListLevel(el),
      source: 'word',
    };
  }

  const fallback = detectTextListType(el);
  if (fallback) {
    return {
      type: fallback,
      level: 1,
      source: 'text',
    };
  }

  return null;
}

function isContinuationParagraph(el: HTMLElement): boolean {
  const cls = el.className || '';

  // Word often uses CxSpLast without mso-list style for the continuation line
  return /MsoListParagraphCxSpLast/.test(cls);
}

function removeWordListMarkerFromElement(el: HTMLElement) {
  el.querySelectorAll('[style*="mso-list:Ignore"], [style*="mso-list:ignore"]').forEach((node) => {
    node.remove();
  });
}

function isWordImageDataElement(el: Element): boolean {
  const tagName = el.tagName.toLowerCase();
  return tagName === 'imagedata' || tagName.endsWith(':imagedata');
}

function isWordShapeElement(el: Element): boolean {
  const tagName = el.tagName.toLowerCase();
  return tagName === 'shape' || tagName.endsWith(':shape');
}

function closestWordShapeElement(el: Element): Element | null {
  let current = el.parentElement;
  while (current) {
    if (isWordShapeElement(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function normalizeWordImageElements(root: ParentNode, doc: Document) {
  Array.from(root.querySelectorAll('*')).forEach((el) => {
    if (!isWordImageDataElement(el)) return;

    const src = el.getAttribute('src') || el.getAttribute('o:href') || el.getAttribute('href') || '';
    const alt = el.getAttribute('alt') || el.getAttribute('o:title') || el.getAttribute('title') || '';
    const img = doc.createElement('img');
    if (src) img.setAttribute('src', src);
    if (alt) img.setAttribute('alt', alt);

    const shape = closestWordShapeElement(el);
    const style = shape?.getAttribute('style') || '';
    const width = style.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1]?.trim();
    const height = style.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i)?.[1]?.trim();
    if (width) img.setAttribute('width', width);
    if (height) img.setAttribute('height', height);

    (shape ?? el).replaceWith(img);
  });
}

function hasOnlyImagesAndWhitespace(node: Node): boolean {
  let hasImage = false;

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (normalizeSpaces(child.textContent || '')) return false;
      continue;
    }

    if (!(child instanceof HTMLElement)) continue;

    const tagName = child.tagName.toLowerCase();
    if (tagName === 'img') {
      hasImage = true;
      continue;
    }

    if (tagName === 'br' || tagName === 'o:p') continue;

    if (tagName === 'span' || tagName === 'a' || isWordShapeElement(child)) {
      if (!hasOnlyImagesAndWhitespace(child)) return false;
      hasImage = hasImage || child.querySelector('img') != null;
      continue;
    }

    return false;
  }

  return hasImage;
}

function unwrapImageOnlyBlocks(root: ParentNode) {
  Array.from(root.querySelectorAll('p, div')).forEach((el) => {
    if (!hasOnlyImagesAndWhitespace(el)) return;

    const fragment = document.createDocumentFragment();
    el.querySelectorAll('img').forEach((img) => fragment.appendChild(img));
    el.replaceWith(fragment);
  });
}

function stripLeadingTextMarker(html: string): string {
  return html.replace(
    /^\s*(\d+|[a-zA-Z]+|[ivxlcdmIVXLCDM]+|•|·|\*|-|–|—)[.)]?\s+/i,
    '',
  );
}

function makeListItemContent(el: HTMLElement, source: 'word' | 'text'): string {
  const clone = el.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('o\\:p').forEach((node) => node.remove());
  removeWordListMarkerFromElement(clone);
  removeNbspFromTree(clone);

  let html = clone.innerHTML
    .replace(/<a name="[^"]*"><\/a>/gi, '')
    .replace(/<a name="[^"]*">/gi, '')
    .trim();

  if (source === 'text') {
    html = stripLeadingTextMarker(html);
  }

  html = html.replace(/(<o:p>\s*<\/o:p>)/gi, '').trim();

  return html;
}

function appendBlockContentToLi(li: HTMLLIElement, html: string, doc: Document) {
  const clean = html.trim();
  if (!clean) return;

  if (!li.innerHTML.trim()) {
    li.innerHTML = clean;
    return;
  }

  const wrapper = doc.createElement('div');
  wrapper.innerHTML = clean;

  while (wrapper.firstChild) {
    li.appendChild(wrapper.firstChild);
  }
}

function reconstructLists(root: HTMLElement, doc: Document) {
  const children = Array.from(root.children);

  let i = 0;

  while (i < children.length) {
    const start = children[i];
    if (!(start instanceof HTMLElement)) {
      i++;
      continue;
    }

    const startInfo = getListInfo(start);
    if (!startInfo) {
      i++;
      continue;
    }

    const stack: Array<{ level: number; list: HTMLOListElement | HTMLUListElement }> = [];
    let j = i;

    while (j < children.length) {
      const current = children[j];
      if (!(current instanceof HTMLElement)) break;

      const info = getListInfo(current);

      if (!info) {
        if (stack.length > 0 && isContinuationParagraph(current)) {
          const currentLi = stack[stack.length - 1].list.lastElementChild as HTMLLIElement | null;
          if (currentLi) {
            const continuationHtml = makeListItemContent(current, 'word');
            appendBlockContentToLi(currentLi, continuationHtml, doc);
            current.remove();
            j++;
            continue;
          }
        }
        break;
      }

      while (stack.length > 0 && stack[stack.length - 1].level > info.level) {
        stack.pop();
      }

      let list: HTMLOListElement | HTMLUListElement | null = null;

      if (stack.length > 0 && stack[stack.length - 1].level === info.level) {
        list = stack[stack.length - 1].list;
      } else {
        list = doc.createElement(info.type) as HTMLOListElement | HTMLUListElement;

        if (stack.length === 0) {
          current.replaceWith(list);
        } else {
          const parentLi = stack[stack.length - 1].list.lastElementChild as HTMLLIElement | null;
          if (parentLi) {
            parentLi.appendChild(list);
          } else {
            break;
          }
        }

        stack.push({ level: info.level, list });
      }

      const li = doc.createElement('li');
      li.innerHTML = makeListItemContent(current, info.source);
      list.appendChild(li);

      if (current !== start) {
        current.remove();
      }

      j++;
    }

    i = j;
  }

  for (const child of Array.from(root.children)) {
    if (child instanceof HTMLElement) {
      reconstructLists(child, doc);
    }
  }
}

function walk(node: Node) {
  if (!(node instanceof HTMLElement)) return;

  const el = node;

  if (el.tagName === 'B' && el.style.fontWeight === 'normal') {
    const span = document.createElement('span');
    span.append(...Array.from(el.childNodes));
    el.replaceWith(span);
    walk(span);
    return;
  }

  if (el.tagName === 'SPAN' && parseInt(el.style.fontWeight || '', 10) >= 700) {
    const strong = document.createElement('strong');
    strong.append(...Array.from(el.childNodes));
    el.replaceWith(strong);
    walk(strong);
    return;
  }

  if (el.className.startsWith('MsoTitle')) {
    const heading = document.createElement('h1');
    heading.append(...Array.from(el.childNodes));
    el.replaceWith(heading);
    walk(heading);
    return;
  }

  if (el.className.startsWith('MsoIntenseQuote') || el.className.startsWith('MsoQuote')) {
    const quote = document.createElement('blockquote');
    quote.append(...Array.from(el.childNodes));
    el.replaceWith(quote);
    walk(quote);
    return;
  }

  if (el.tagName.toLowerCase() === 'o:p') {
    el.remove();
    return;
  }

  for (const child of Array.from(el.childNodes)) {
    walk(child);
  }
}

/**
 * Strip out QTI web component internal DOM elements that get copied
 * when selecting nodes. These are the rendered light DOM parts from
 * custom elements (like choice/radio controls, labels, etc.)
 */
function stripQtiWebComponentInternals(root: ParentNode) {
  // Remove all elements with a `part` attribute (these are web component internals)
  // except for slot elements which we want to unwrap
  root.querySelectorAll('[part]').forEach((el) => {
    const part = el.getAttribute('part');
    if (part === 'slot') {
      // Unwrap slot elements - keep their children
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
    } else {
      // Remove other part elements entirely (ch, cha, input, textarea, etc.)
      el.remove();
    }
  });
  
  // Remove label divs with id="label" (choice markers)
  root.querySelectorAll('div#label').forEach((el) => el.remove());
  
  // Remove any stray input/radio elements that might have been rendered
  root.querySelectorAll('qti-simple-choice > input, qti-simple-choice > div:not([identifier])').forEach((el) => {
    // Only remove if it's not a semantic content element
    if (!el.querySelector('p') && !el.textContent?.trim()) {
      el.remove();
    }
  });
}

export function makeHtmlSemantic(html: string): string {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Strip QTI web component internals first
  stripQtiWebComponentInternals(doc.body);

  normalizeWordImageElements(doc.body, doc);
  walk(doc.body);
  removeNbspFromTree(doc.body);
  reconstructLists(doc.body, doc);
  unwrapImageOnlyBlocks(doc.body);

  // Clean leftover Word artifacts after list reconstruction
  doc.querySelectorAll('[style*="mso-list:Ignore"], [style*="mso-list:ignore"]').forEach((el) => el.remove());
  doc.querySelectorAll('o\\:p').forEach((el) => el.remove());

  return doc.body.innerHTML
    .replace(/\u00A0/g, ' ')
    .replace(/<a name="[^"]*"><\/a>/gi, '')
    .trim();
}

function getClipboardImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];

  const files: File[] = [];
  const seen = new Set<File>();

  for (const item of Array.from(dataTransfer.items || [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;

    const file = item.getAsFile();
    if (!file || seen.has(file)) continue;

    seen.add(file);
    files.push(file);
  }

  for (const file of Array.from(dataTransfer.files || [])) {
    if (!file.type.startsWith('image/') || seen.has(file)) continue;

    seen.add(file);
    files.push(file);
  }

  return files;
}

function readImageFile(file: File): Promise<ClipboardImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve({ src: reader.result, alt: file.name || 'Pasted image' });
      } else {
        reject(new Error('Failed to read pasted image file.'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read pasted image file.')));
    reader.readAsDataURL(file);
  });
}

function shouldHydrateImageSrc(src: string | null): boolean {
  if (!src) return true;
  if (/^(data:image\/|blob:|https?:\/\/)/i.test(src)) return false;
  return true;
}

export function hydrateSemanticPasteImages(html: string, images: ClipboardImage[]): string {
  if (images.length === 0) return html;

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let imageIndex = 0;

  normalizeWordImageElements(doc.body, doc);

  doc.body.querySelectorAll('img').forEach((img) => {
    if (imageIndex >= images.length) return;
    if (!shouldHydrateImageSrc(img.getAttribute('src'))) return;

    const image = images[imageIndex++];
    img.setAttribute('src', image.src);
    if (!img.getAttribute('alt')) img.setAttribute('alt', image.alt);
  });

  while (imageIndex < images.length) {
    const image = images[imageIndex++];
    const img = doc.createElement('img');
    img.setAttribute('src', image.src);
    img.setAttribute('alt', image.alt);
    doc.body.appendChild(img);
  }

  unwrapImageOnlyBlocks(doc.body);

  return doc.body.innerHTML.trim();
}

async function pasteHtmlWithClipboardImages(view: EditorView, html: string, files: File[]) {
  const images = await Promise.all(files.map(readImageFile));
  const semanticHtml = makeHtmlSemantic(html);
  const hydratedHtml = hydrateSemanticPasteImages(semanticHtml, images);
  const doc = new window.DOMParser().parseFromString(hydratedHtml, 'text/html');
  const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(doc.body);

  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
}

async function pasteClipboardImages(view: EditorView, files: File[]) {
  const imageType = view.state.schema.nodes.image;
  if (!imageType) return;

  const images = await Promise.all(files.map(readImageFile));
  for (const image of images) {
    const node = imageType.create({ src: image.src });
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
  }
}

export function createSemanticPastePlugin(): Plugin {
  return new Plugin({
    key: semanticPastePluginKey,
    props: {
      transformPastedHTML(html) {
        return makeHtmlSemantic(html);
      },
      handlePaste(view, event: ClipboardEvent, slice: Slice) {
        const files = getClipboardImageFiles(event.clipboardData);
        if (files.length === 0 || !view.state.schema.nodes.image) return false;

        const html = event.clipboardData?.getData('text/html') ?? '';
        if (html.trim()) {
          void pasteHtmlWithClipboardImages(view, html, files).catch((error) => {
            console.error('Failed to paste clipboard image HTML:', error);
          });
          return true;
        }

        if (slice.size > 0) {
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        }

        void pasteClipboardImages(view, files).catch((error) => {
          console.error('Failed to paste clipboard images:', error);
        });
        return true;
      },
    },
  });
}

import { Plugin, PluginKey } from 'prosemirror-state';
import { definePlugin } from 'prosekit/core';

type ListInfo = {
  type: 'ol' | 'ul';
  level: number;
  source: 'word' | 'text';
};

const semanticPastePluginKey = new PluginKey('semantic-paste');

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

export function makeHtmlSemantic(html: string): string {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  walk(doc.body);
  removeNbspFromTree(doc.body);
  reconstructLists(doc.body, doc);

  // Clean leftover Word artifacts after list reconstruction
  doc.querySelectorAll('[style*="mso-list:Ignore"], [style*="mso-list:ignore"]').forEach((el) => el.remove());
  doc.querySelectorAll('o\\:p').forEach((el) => el.remove());

  return doc.body.innerHTML
    .replace(/\u00A0/g, ' ')
    .replace(/<a name="[^"]*"><\/a>/gi, '')
    .trim();
}

export function defineSemanticPasteExtension() {
  return definePlugin(() =>
    new Plugin({
      key: semanticPastePluginKey,
      props: {
        transformPastedHTML(html) {
          return makeHtmlSemantic(html);
        },
      },
    }),
  );
}
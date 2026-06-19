import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const TABULAR_CLASS = 'qti-match-tabular';

function splitClasses(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

export function hasTabularMatchClass(element: HTMLElement): boolean {
  return splitClasses(element.getAttribute('class')).includes(TABULAR_CLASS);
}

function removeTabularMatchClass(value: string | null): string | null {
  const classes = splitClasses(value).filter(className => className !== TABULAR_CLASS);
  return classes.length > 0 ? classes.join(' ') : null;
}

function withTabularMatchClass(value: string | null): string {
  const classes = splitClasses(value).filter(className => className !== TABULAR_CLASS);
  return [TABULAR_CLASS, ...classes].join(' ');
}

export const qtiMatchInteractionTabularNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleMatchSet{2}',
  attrs: {
    maxAssociations: { default: 1 },
    minAssociations: { default: 0 },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
    dataFirstColumnHeader: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-match-interaction[class~="qti-match-tabular"]',
      priority: 80,
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        const maxAssociations = node.getAttribute('max-associations');
        const minAssociations = node.getAttribute('min-associations');
        const scoreAttr = node.getAttribute('score');
        return {
          maxAssociations: maxAssociations ? parseInt(maxAssociations, 10) : 1,
          minAssociations: minAssociations ? parseInt(minAssociations, 10) : 0,
          shuffle: node.getAttribute('shuffle') === 'true',
          class: removeTabularMatchClass(node.getAttribute('class')),
          correctResponse: node.getAttribute('correct-response') || null,
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          dataFirstColumnHeader: node.getAttribute('data-first-column-header'),
        };
      },
    },
    {
      tag: 'qti-match-interaction-tabular',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxAssociations = node.getAttribute('max-associations');
        const minAssociations = node.getAttribute('min-associations');
        const scoreAttr = node.getAttribute('score');
        return {
          maxAssociations: maxAssociations ? parseInt(maxAssociations, 10) : 1,
          minAssociations: minAssociations ? parseInt(minAssociations, 10) : 0,
          shuffle: node.getAttribute('shuffle') === 'true',
          class: removeTabularMatchClass(node.getAttribute('class')),
          correctResponse: node.getAttribute('correct-response') || null,
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          dataFirstColumnHeader: node.getAttribute('data-first-column-header'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-associations': String(node.attrs.maxAssociations),
    };
    if (node.attrs.minAssociations > 0) {
      attrs['min-associations'] = String(node.attrs.minAssociations);
    }
    if (node.attrs.shuffle) {
      attrs.shuffle = 'true';
    }
    if (node.attrs.class) attrs.class = removeTabularMatchClass(node.attrs.class) ?? '';
    if (node.attrs.correctResponse) attrs['correct-response'] = node.attrs.correctResponse;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    if (node.attrs.dataFirstColumnHeader) attrs['data-first-column-header'] = node.attrs.dataFirstColumnHeader;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-match-interaction-tabular', attrs, 0];
  },
  defining: true,
  isolating: true,
};

export function exportTabularClassList(value: string | null): string {
  return withTabularMatchClass(value);
}

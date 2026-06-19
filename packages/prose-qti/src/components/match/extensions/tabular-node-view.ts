import { Plugin, PluginKey } from 'prosemirror-state';

import type { Node as PmNode } from 'prosemirror-model';
import type { ViewMutationRecord } from 'prosemirror-view';

import type { QtiMatchInteractionTabularElement } from '../components/qti-match-interaction-tabular/qti-match-interaction-tabular.js';

const tabularNodeViewPluginKey = new PluginKey('qti-match-interaction-tabular.node-view');

function syncAttribute(dom: HTMLElement, name: string, nextValue: string | null): void {
  const currentValue = dom.getAttribute(name);
  if (nextValue == null) {
    if (currentValue !== null) dom.removeAttribute(name);
    return;
  }
  if (currentValue !== nextValue) dom.setAttribute(name, nextValue);
}

function ensureTabularClass(value: string | null): string {
  const classes = (value ?? '').split(/\s+/).filter(Boolean).filter(c => c !== 'qti-match-tabular');
  return ['qti-match-tabular', ...classes].join(' ');
}

function applyAttrs(dom: HTMLElement, attrs: PmNode['attrs']): void {
  syncAttribute(dom, 'max-associations', String(attrs.maxAssociations ?? 1));
  syncAttribute(
    dom,
    'min-associations',
    (attrs.minAssociations as number) > 0 ? String(attrs.minAssociations) : null,
  );
  syncAttribute(dom, 'shuffle', attrs.shuffle ? 'true' : null);
  syncAttribute(dom, 'class', ensureTabularClass(attrs.class as string | null));
  syncAttribute(dom, 'correct-response', (attrs.correctResponse as string | null) ?? null);
  syncAttribute(dom, 'response-identifier', (attrs.responseIdentifier as string | null) ?? null);
  syncAttribute(
    dom,
    'data-first-column-header',
    (attrs.dataFirstColumnHeader as string | null) ?? null,
  );
}

export function createQtiMatchTabularNodeViewPlugin(): Plugin {
  return new Plugin({
    key: tabularNodeViewPluginKey,
    props: {
      nodeViews: {
        qtiMatchInteractionTabular(node) {
          const dom = document.createElement(
            'qti-match-interaction-tabular',
          ) as QtiMatchInteractionTabularElement;
          applyAttrs(dom, node.attrs);

          return {
            dom,
            contentDOM: dom,
            update(newNode: PmNode): boolean {
              if (newNode.type.name !== 'qtiMatchInteractionTabular') return false;
              applyAttrs(dom, newNode.attrs);
              dom.rerender?.();
              return true;
            },
            ignoreMutation(record: ViewMutationRecord): boolean {
              return record.type === 'attributes';
            },
          };
        },
      },
    },
  });
}

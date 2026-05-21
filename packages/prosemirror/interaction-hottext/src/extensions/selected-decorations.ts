import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import type { Node as ProsemirrorNode } from 'prosemirror-model';

const hottextSelectedDecorationsPluginKey = new PluginKey('hottext-selected-decorations');

function parseCorrectResponse(value: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map(entry => String(entry).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function buildDecorations(doc: ProsemirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'qtiHottextInteraction') {
      return true;
    }

    const selectedIdentifiers = new Set(parseCorrectResponse(node.attrs.correctResponse as string | string[] | null));
    if (selectedIdentifiers.size === 0) {
      return true;
    }

    node.descendants((child, offset) => {
      if (child.type.name !== 'qtiHottext') {
        return true;
      }

      const identifier = child.attrs.identifier as string | null;
      if (!identifier || !selectedIdentifiers.has(identifier)) {
        return true;
      }

      const from = pos + 1 + offset;
      decorations.push(Decoration.node(from, from + child.nodeSize, {
        selected: '',
        'aria-pressed': 'true',
      }));
      return true;
    });

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

export function createHottextSelectedDecorationsPlugin(): Plugin {
  return new Plugin({
    key: hottextSelectedDecorationsPluginKey,
    state: {
      init: (_, state) => buildDecorations(state.doc),
      apply(tr, old) {
        if (!tr.docChanged) {
          return old.map(tr.mapping, tr.doc);
        }
        return buildDecorations(tr.doc);
      },
    },
    props: {
      decorations(state) {
        return hottextSelectedDecorationsPluginKey.getState(state);
      },
    },
  });
}

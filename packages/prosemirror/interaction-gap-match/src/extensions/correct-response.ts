import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

import type { GapAssociationChangeDetail } from '../components/qti-gap-match-interaction/qti-gap-match-interaction.js';

const gapMatchCorrectResponsePluginKey = new PluginKey('gap-match-correct-response');

export const GAP_ASSOCIATION_CHANGE_EVENT = 'gap-association-change';

function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;

    if (node.type.name === 'qtiGapMatchInteraction') {
      const domNode = view.nodeDOM(pos);
      if (domNode === interactionElement || (domNode && domNode.contains(interactionElement))) {
        foundPos = pos;
        return false;
      }
    }
    return true;
  });

  return foundPos;
}

export function createGapMatchCorrectResponsePlugin(): Plugin {
  return new Plugin({
    key: gapMatchCorrectResponsePluginKey,
    view(view) {
      const handleAssociationChange = (event: Event) => {
        const customEvent = event as CustomEvent<GapAssociationChangeDetail>;
        const interactionElement = customEvent.target as HTMLElement;

        if (!interactionElement.matches('qti-gap-match-interaction')) return;

        const correctResponse = customEvent.detail.associations.length > 0
          ? JSON.stringify(customEvent.detail.associations)
          : null;

        const pos = findInteractionNodePos(view, interactionElement);
        if (pos === null) return;

        const { state, dispatch } = view;
        const node = state.doc.nodeAt(pos);
        if (!node) return;

        dispatch(state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          correctResponse,
        }));
      };

      view.dom.addEventListener(GAP_ASSOCIATION_CHANGE_EVENT, handleAssociationChange);

      return {
        destroy() {
          view.dom.removeEventListener(GAP_ASSOCIATION_CHANGE_EVENT, handleAssociationChange);
        },
      };
    },
  });
}

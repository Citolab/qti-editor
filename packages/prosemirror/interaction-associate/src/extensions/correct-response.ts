import { Plugin, PluginKey } from 'prosemirror-state';

import type { EditorView } from 'prosemirror-view';
import type { AssociatePairChangeDetail } from '../components/qti-associate-interaction/qti-associate-interaction.js';

const associateCorrectResponsePluginKey = new PluginKey('associate-correct-response');

/**
 * Event name for associate pair changes.
 */
export const ASSOCIATE_PAIR_CHANGE_EVENT = 'associate-pair-change';

/**
 * Finds the ProseMirror node position for an associate interaction element.
 */
function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;

    if (node.type.name === 'qtiAssociateInteraction') {
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

/**
 * Creates a ProseMirror plugin that persists associate interaction correct responses.
 *
 * When pairs change, this plugin serializes them to JSON and updates the
 * interaction node's correctResponse attribute.
 */
export function createAssociateCorrectResponsePlugin(): Plugin {
  return new Plugin({
    key: associateCorrectResponsePluginKey,
    view(view) {
      const handlePairChange = (event: Event) => {
        const customEvent = event as CustomEvent<AssociatePairChangeDetail>;
        const interactionElement = customEvent.target as HTMLElement;

        if (!interactionElement.matches('qti-associate-interaction')) return;

        const { pairs } = customEvent.detail;
        const correctResponse = pairs.length > 0 ? JSON.stringify(pairs) : null;

        const pos = findInteractionNodePos(view, interactionElement);
        if (pos === null) return;

        const { state, dispatch } = view;
        const node = state.doc.nodeAt(pos);
        if (!node) return;

        dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, correctResponse }));
      };

      view.dom.addEventListener(ASSOCIATE_PAIR_CHANGE_EVENT, handlePairChange);

      return {
        destroy() {
          view.dom.removeEventListener(ASSOCIATE_PAIR_CHANGE_EVENT, handlePairChange);
        },
      };
    },
  });
}

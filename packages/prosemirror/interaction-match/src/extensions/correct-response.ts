import { Plugin, PluginKey } from 'prosemirror-state';

import type { EditorView } from 'prosemirror-view';
import type { MatchAssociationChangeDetail } from '../components/qti-match-interaction/qti-match-interaction.js';

const matchCorrectResponsePluginKey = new PluginKey('match-correct-response-dnd');

/**
 * Event name for match association changes.
 */
export const MATCH_ASSOCIATION_CHANGE_EVENT = 'match-association-change';

/**
 * Finds the ProseMirror node position for a match interaction element.
 */
function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;
  
  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    
    if (node.type.name === 'qtiMatchInteraction') {
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
 * Creates a ProseMirror plugin that handles drag-and-drop for match interaction correct responses.
 * 
 * When associations change via drag-and-drop, this plugin:
 * 1. Serializes the associations to JSON
 * 2. Updates the interaction node's correctResponse attribute
 */
export function createMatchCorrectResponsePlugin(): Plugin {
  return new Plugin({
    key: matchCorrectResponsePluginKey,
    view(view) {
      const handleAssociationChange = (event: Event) => {
        const customEvent = event as CustomEvent<MatchAssociationChangeDetail>;
        const interactionElement = customEvent.target as HTMLElement;
        
        if (!interactionElement.matches('qti-match-interaction')) return;
        
        const { associations } = customEvent.detail;
        const correctResponse = associations.length > 0
          ? JSON.stringify(associations)
          : null;
        
        const pos = findInteractionNodePos(view, interactionElement);
        if (pos === null) return;
        
        const { state, dispatch } = view;
        const node = state.doc.nodeAt(pos);
        if (!node) return;
        
        const nextAttrs = {
          ...node.attrs,
          correctResponse,
        };
        
        dispatch(state.tr.setNodeMarkup(pos, undefined, nextAttrs));
      };
      
      view.dom.addEventListener(MATCH_ASSOCIATION_CHANGE_EVENT, handleAssociationChange);
      
      return {
        destroy() {
          view.dom.removeEventListener(MATCH_ASSOCIATION_CHANGE_EVENT, handleAssociationChange);
        },
      };
    },
  });
}

import { definePlugin, type Extension } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosekit/pm/state';
import {
  QTI_CORRECT_RESPONSE_TOGGLE_EVENT,
  type QtiCorrectResponseToggleDetail,
} from '@qti-editor/interaction-shared';

import type { EditorView } from 'prosekit/pm/view';

const correctResponseClickPluginKey = new PluginKey('correct-response-click');

/**
 * Event name for correct response changes at the interaction level.
 * Dispatched when selections change to update the ProseMirror document.
 */
export const QTI_CORRECT_RESPONSE_CHANGE_EVENT = 'qti:correct-response:change';

/**
 * Detail payload for the change event.
 */
export interface QtiCorrectResponseChangeDetail {
  maxChoices: number;
  correctResponse: string | null;
  interactionElement: HTMLElement;
}

/**
 * Finds the parent qti-choice-interaction element from a choice element.
 */
function findParentInteraction(element: HTMLElement): HTMLElement | null {
  return element.closest('qti-choice-interaction');
}

/**
 * Gets all selected choice identifiers from an interaction element.
 */
function getSelectedIdentifiers(interactionElement: HTMLElement): string[] {
  const choices = interactionElement.querySelectorAll('qti-simple-choice');
  const selected: string[] = [];
  
  choices.forEach((choice) => {
    const choiceElement = choice as HTMLElement & { selected?: boolean };
    if (choiceElement.selected) {
      const identifier = choice.getAttribute('identifier');
      if (identifier) {
        selected.push(identifier);
      }
    }
  });
  
  return selected;
}

/**
 * Finds the ProseMirror node position for an interaction element.
 */
function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;
  
  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false; // Already found, stop searching
    
    if (node.type.name === 'qtiChoiceInteraction') {
      // Check if this node corresponds to the DOM element
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
 * Creates a ProseMirror extension that handles correct response clicks.
 * 
 * When a qti-simple-choice is clicked (on part="ch"), this extension:
 * 1. Aggregates all selected choices in the parent interaction
 * 2. Computes maxChoices (1 for single, 0 for multiple)
 * 3. Updates the interaction node's attributes
 */
export function defineCorrectResponseClickExtension(): Extension {
  return definePlugin(
    () =>
      new Plugin({
        key: correctResponseClickPluginKey,
        view(view) {
          const handleToggle = (event: Event) => {
            const choiceElement = (event as CustomEvent<QtiCorrectResponseToggleDetail>).target as HTMLElement;
            
            // Find the parent interaction
            const interactionElement = findParentInteraction(choiceElement);
            if (!interactionElement) return;
            
            // Get all selected identifiers
            const selectedIdentifiers = getSelectedIdentifiers(interactionElement);
            
            // Compute maxChoices and correctResponse
            const maxChoices = selectedIdentifiers.length <= 1 ? 1 : 0;
            const correctResponse = selectedIdentifiers.length > 0 
              ? selectedIdentifiers.join(',') 
              : null;
            
            // Find the node position
            const pos = findInteractionNodePos(view, interactionElement);
            if (pos === null) return;
            
            // Update the node attributes
            const { state, dispatch } = view;
            const node = state.doc.nodeAt(pos);
            if (!node) return;
            
            const nextAttrs = {
              ...node.attrs,
              maxChoices,
              correctResponse,
            };
            
            dispatch(state.tr.setNodeMarkup(pos, undefined, nextAttrs));
          };
          
          // Listen for toggle events on the editor DOM
          view.dom.addEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, handleToggle);
          
          return {
            destroy() {
              view.dom.removeEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, handleToggle);
            },
          };
        },
      })
  );
}

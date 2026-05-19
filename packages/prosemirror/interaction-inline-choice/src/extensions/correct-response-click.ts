import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import {
  QTI_CORRECT_RESPONSE_TOGGLE_EVENT,
  type QtiCorrectResponseToggleDetail,
} from '@qti-editor/interaction-shared';

import {
  QTI_INLINE_CHOICE_FOCUS_EVENT,
  type QtiInlineChoiceFocusDetail,
} from '../components/qti-inline-choice-interaction/qti-inline-choice.js';

import type { EditorView } from 'prosemirror-view';

const correctResponseClickPluginKey = new PluginKey('inline-choice-correct-response-click');

function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;

    if (node.type.name === 'qtiInlineChoiceInteraction') {
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

export function createInlineChoiceCorrectResponseClickPlugin(): Plugin {
  return new Plugin({
    key: correctResponseClickPluginKey,

    /**
     * Auto-delete empty qtiInlineChoice nodes after any transaction that
     * modifies the document. Empty choices can't hold a cursor (no DOM text
     * node inside an empty inline element), so they must not persist.
     * Cursor is moved to the end of the previous sibling, or the start of
     * the next if the deleted choice was the first.
     */
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some(tr => tr.docChanged)) return null;

      const choiceType = newState.schema.nodes.qtiInlineChoice;
      const interactionType = newState.schema.nodes.qtiInlineChoiceInteraction;
      if (!choiceType || !interactionType) return null;

      type EmptyEntry = { pos: number; size: number; index: number };
      const empties: EmptyEntry[] = [];

      newState.doc.descendants((node, pos, parent, index) => {
        if (node.type !== choiceType) return;
        if (node.content.size > 0) return;
        if (!parent || parent.type !== interactionType) return;
        if (parent.childCount <= 1) return; // never delete the last choice
        empties.push({ pos, size: node.nodeSize, index });
      });

      if (empties.length === 0) return null;

      console.log('[inline-choice appendTransaction] deleting', empties.length, 'empty choice(s) at positions', empties.map(e => e.pos));

      const tr = newState.tr;

      // Map original cursor through deletions to place it correctly afterward.
      const origCursorPos = newState.selection.from;

      // Delete back-to-front so earlier positions aren't invalidated.
      for (const entry of [...empties].reverse()) {
        const from = tr.mapping.map(entry.pos);
        const to = tr.mapping.map(entry.pos + entry.size);
        tr.delete(from, to);
      }

      // Reposition cursor near where it was.
      const mappedPos = tr.mapping.map(origCursorPos);
      try {
        const $mapped = tr.doc.resolve(mappedPos);
        if ($mapped.parent.type === interactionType) {
          // Cursor landed between choices; move into adjacent choice.
          const nodeBefore = $mapped.nodeBefore;
          const nodeAfter = $mapped.nodeAfter;
          if (nodeBefore && nodeBefore.type === choiceType) {
            tr.setSelection(TextSelection.create(tr.doc, mappedPos - 1));
          } else if (nodeAfter && nodeAfter.type === choiceType) {
            tr.setSelection(TextSelection.create(tr.doc, mappedPos + 1));
          }
        }
      } catch {
        // Leave selection as-is if resolution fails.
      }

      return tr;
    },

    view(view) {
      const handleChoiceFocus = (event: Event) => {
        const { identifier } = (event as CustomEvent<QtiInlineChoiceFocusDetail>).detail;
        const choiceElement = event.target as HTMLElement;
        const interactionElement = choiceElement.closest('qti-inline-choice-interaction') as HTMLElement | null;
        if (!interactionElement) return;

        const interactionPos = findInteractionNodePos(view, interactionElement);
        if (interactionPos === null) return;

        const { state, dispatch } = view;
        const interactionNode = state.doc.nodeAt(interactionPos);
        if (!interactionNode) return;

        let targetPos: number | null = null;
        interactionNode.forEach((child, offset) => {
          if (child.type.name === 'qtiInlineChoice' && child.attrs.identifier === identifier) {
            // End of this choice's text content (after last character, before closing tag).
            targetPos = interactionPos + 1 + offset + child.nodeSize - 1;
          }
        });

        if (targetPos === null) return;

        view.focus();
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, targetPos)).scrollIntoView());
      };

      const handleToggle = (event: Event) => {
        const detail = (event as CustomEvent<QtiCorrectResponseToggleDetail>).detail;
        const choiceElement = event.target as HTMLElement;

        const interactionElement = choiceElement.closest('qti-inline-choice-interaction') as HTMLElement | null;
        if (!interactionElement) return;

        const correctResponse = detail.selected ? detail.identifier : null;

        const pos = findInteractionNodePos(view, interactionElement);
        if (pos === null) return;

        const { state, dispatch } = view;
        const node = state.doc.nodeAt(pos);
        if (!node) return;

        dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, correctResponse }));
      };

      view.dom.addEventListener(QTI_INLINE_CHOICE_FOCUS_EVENT, handleChoiceFocus);
      view.dom.addEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, handleToggle);

      return {
        destroy() {
          view.dom.removeEventListener(QTI_INLINE_CHOICE_FOCUS_EVENT, handleChoiceFocus);
          view.dom.removeEventListener(QTI_CORRECT_RESPONSE_TOGGLE_EVENT, handleToggle);
        },
      };
    },
  });
}

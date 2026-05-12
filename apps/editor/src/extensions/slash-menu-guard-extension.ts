/**
 * Slash Menu Guard Extension
 *
 * Prevents the slash menu (autocomplete popover) from appearing when the
 * cursor is inside any QTI interaction element.
 *
 * Detection is based on the DOM element tag name: walks up from the cursor
 * position checking if any ancestor element's tag name ends with "-interaction".
 *
 * Intercepts the "/" key and inserts it as plain text when inside an interaction,
 * preventing autocomplete from triggering. New interactions are automatically
 * covered if they follow the tag naming convention (e.g. qti-choice-interaction).
 */

import { defineKeymap } from 'prosekit/core';

import type { EditorView } from 'prosekit/pm/view';

function isInsideInteraction(view: EditorView): boolean {
  const domAtPos = view.domAtPos(view.state.selection.anchor);
  let node: Node | null = domAtPos.node;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  while (node && node !== view.dom) {
    if (node instanceof HTMLElement && node.tagName.toLowerCase().endsWith('-interaction')) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

export function defineSlashMenuGuardExtension() {
  return defineKeymap({
    '/': (state, dispatch, view) => {
      if (!view || !isInsideInteraction(view)) {
        return false;
      }
      if (dispatch) {
        dispatch(state.tr.insertText('/'));
      }
      return true;
    },
  });
}

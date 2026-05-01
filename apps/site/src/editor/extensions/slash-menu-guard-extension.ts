/**
 * Slash Menu Guard Extension
 *
 * Prevents the slash menu (autocomplete popover) from appearing when the
 * cursor is inside any QTI interaction element.
 *
 * Detection is based on the DOM element tag name: walks up from the cursor
 * position checking if any ancestor element's tag name ends with "-interaction".
 *
 * How it works:
 * - Uses `handleKeyDown` to intercept the "/" key before autocomplete triggers.
 * - If inside an interaction, inserts "/" as plain text without triggering autocomplete.
 * - Also uses `defineUpdateHandler` to set the autocomplete regex to null when
 *   entering an interaction, as a fallback.
 *
 * This approach is future-proof: new interactions automatically work if they
 * follow the tag naming convention (e.g. qti-choice-interaction, qti-hottext-interaction).
 */

import { defineKeymap, defineUpdateHandler, canUseRegexLookbehind, union } from 'prosekit/core';

import type { EditorView } from 'prosekit/pm/view';

// Same regex as used in the slash menu
const slashRegex = canUseRegexLookbehind() ? /(?<!\S)\/(\S.*)?$/u : /\/(\S.*)?$/u;

function isInsideInteraction(view: EditorView): boolean {
  const domAtPos = view.domAtPos(view.state.selection.anchor);
  let node: Node | null = domAtPos.node;

  // If we got a text node, start from its parent element
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  // Walk up the DOM tree looking for an interaction element
  while (node && node !== view.dom) {
    if (node instanceof HTMLElement && node.tagName.toLowerCase().endsWith('-interaction')) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

export function defineSlashMenuGuardExtension() {
  let wasInside = false;

  // Keymap to intercept "/" and insert it as plain text when inside an interaction
  const keymap = defineKeymap({
    '/': (state, dispatch, view) => {
      if (!view || !isInsideInteraction(view)) {
        return false; // Let normal autocomplete handle it
      }
      // Insert "/" as plain text without triggering autocomplete
      if (dispatch) {
        dispatch(state.tr.insertText('/'));
      }
      return true; // Prevent default handling (autocomplete)
    },
  });

  // Update handler to manage regex state when cursor moves
  const updateHandler = defineUpdateHandler((view) => {
    const inside = isInsideInteraction(view);

    if (inside === wasInside) return;
    wasInside = inside;

    // Update the autocomplete-root's regex
    const autocompleteRoot = document.querySelector('prosekit-autocomplete-root') as (HTMLElement & { regex?: RegExp | null }) | null;
    if (autocompleteRoot) {
      autocompleteRoot.regex = inside ? null : slashRegex;
    }

    // Also update the slash-menu's disabled state for consistency
    const slashMenu = document.querySelector('qti-slash-menu') as (HTMLElement & { disabled?: boolean }) | null;
    if (slashMenu) {
      slashMenu.disabled = inside;
    }
  });

  return union(keymap, updateHandler);
}

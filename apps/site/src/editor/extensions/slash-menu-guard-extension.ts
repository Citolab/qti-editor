/**
 * Slash Menu Guard Extension
 *
 * Prevents the slash menu (autocomplete popover) from appearing when the
 * cursor is inside a QTI interaction content node (e.g. qti-prompt,
 * qti-simple-choice, qti-inline-choice, qti-simple-associable-choice).
 *
 * Detection is based on the `placeholder` property on the ProseMirror
 * NodeSpec. Any node whose spec defines a `placeholder` is considered an
 * interaction content node where the slash menu should be suppressed.
 *
 * How it works:
 * - A `defineUpdateHandler` runs on every editor state change.
 * - It walks the selection anchor's ancestors looking for a node with
 *   `type.spec.placeholder`.
 * - When the cursor enters such a node, the `<qti-slash-menu>` element's
 *   `disabled` property is set to true, which causes the popover to unregister
 *   its autocomplete rule (the menu cannot open).
 * - When the cursor leaves, disabled is set back to false so the slash menu
 *   works normally again.
 */

import { defineUpdateHandler } from 'prosekit/core';

export function defineSlashMenuGuardExtension() {
  let wasInside = false;

  return defineUpdateHandler((view) => {
    const $pos = view.state.selection.$anchor;
    let inside = false;
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d).type.spec.placeholder) {
        inside = true;
        break;
      }
    }

    if (inside === wasInside) return;
    wasInside = inside;

    const slashMenu = document.querySelector('qti-slash-menu') as (HTMLElement & { disabled?: boolean }) | null;
    if (slashMenu) {
      slashMenu.disabled = inside;
    }
  });
}

import { css, type CSSResult, type CSSResultGroup } from 'lit';

import { QtiSimpleAssociableChoice } from '@qti-components/interactions-core';

import { editorWhiteSpace } from '../../styles/white-space.js';

/**
 * The runtime qti-components associable-choice styles, so the editor host layout matches the live
 * interaction as closely as possible, plus the authoring-only additions.
 */
const styles: CSSResultGroup = [
  editorWhiteSpace,
  QtiSimpleAssociableChoice.styles as CSSResult,
  css`
    /*
     * No flex-direction here. Upstream's :host is a row (grip beside label) and it switches to a
     * column only for drop targets, via :host([qti-droppable]) / :host(:state(droppable)).
     * Forcing column on every choice stacked the grip icon above the label on the source chips.
     * The interaction opts targets in with the "droppable" state — see match-drag-drop.ts.
     */
    :host {
      /* Runtime sets user-select:none for dragging; the editor needs to keep
         the choice text selectable/editable. */
      user-select: auto;
      cursor: text !important;
    }

    ::slotted(p) {
      margin: 0;
      width: 100%;
      /* qti-components' runtime styles disable pointer-events on the choice
         content; the editor needs the text clickable so ProseMirror can map
         a click to the correct caret position (otherwise the caret jumps to
         the start of the paragraph). */
      pointer-events: auto !important;
    }

    ::slotted(.ProseMirror-trailingBreak) {
      display: inline;
    }

    /* No centring here either — upstream centres a target's drop region under
       :host([qti-droppable]) / :host(:state(droppable)). */
    [part='drop'] {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      width: auto;
    }

    /* Show empty dropslot only when this choice is a pending drop target. */
    [part='drop']:empty {
      display: none;
    }

    :host(:state(pending)) [part='drop']:empty {
      display: flex;
    }
  `,
];

export default styles;

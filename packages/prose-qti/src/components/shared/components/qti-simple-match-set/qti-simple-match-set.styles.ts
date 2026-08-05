import { css, type CSSResultGroup } from 'lit';

const styles: CSSResultGroup = css`
  /* Wrapper generates no box so it doesn't affect the slotted layout. */
  .slot-wrapper {
    display: contents;
  }

  /*
   * Drop-slot affordance: while the parent match interaction is waiting for a
   * target to be selected, it dispatches MATCH_SELECTING_TARGET_EVENT, which
   * toggles the internal "selecting" class. We keep this state in shadow DOM
   * (never a host attribute) so ProseMirror's mutation observer leaves the
   * element alone. Each slotted choice then reads as a clickable drop slot.
   */
  .slot-wrapper.selecting ::slotted(qti-simple-associable-choice) {
    cursor: pointer;
    /*
     * CSS custom properties inherit into the child's shadow DOM, so these
     * two variables are read by [part='dropslot'] inside qti-simple-associable-choice
     * to show the drop slot and start its pulse animation — without setting
     * any attributes (which would trigger ProseMirror's mutation observer).
     * --qti-dropslot-selecting carries the animation *name*: while selecting
     * it runs the pulse, and once it's unset the child's animation resolves
     * to none so the border snaps back to its resting color.
     */
    --qti-dropslot-selecting: dropslot-pulse;
    --qti-dropslot-empty-display: flex;
  }

  .slot-wrapper.selecting ::slotted(qti-simple-associable-choice:hover) {
    outline-color: var(--qti-border-active, #3b82f6);
  }
`;

export default styles;

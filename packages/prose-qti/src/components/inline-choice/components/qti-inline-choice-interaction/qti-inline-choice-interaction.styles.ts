import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/inline-choice-interaction/styles';

/**
 * Upstream uses CSS anchor positioning and a top-layer popover for the dropdown menu. The editor
 * deliberately does neither: the menu is an ordinary in-flow box, so it works without `anchor-name`
 * support — and, far more usefully, so it can SIZE the closed combobox.
 *
 * ── Why the menu is in flow, and what that buys ──────────────────────────────────────────────
 *
 * The trigger should be as wide as the longest option, so picking a long one does not reflow the
 * sentence around it. Upstream has to MEASURE for that (MenuAutoSizeMixin): its menu is a popover,
 * which is `display: none` while closed and in the top layer while open, so it is out of flow in
 * both states, is not a grid item, and contributes to no track. `anchor-size()` refuses the same
 * direction by design — the anchored box reads the anchor, never the reverse.
 *
 * Here the menu is a real grid item, so the widest option sizes a track the trigger also sits in and
 * the whole thing falls out of layout. No measurement, no ResizeObserver, no inline style write.
 *
 * That last point is the reason this exists. The editor's previous attempt at autosizing wrote
 * `this.style.setProperty(...)` on the HOST, which is a ProseMirror-managed node: PM reverts the
 * attribute, the revert re-renders the node, and the re-render re-fires the code that wrote it. It
 * froze the tab, and the method was commented out and left dead. CSS cannot enter that loop —
 * ProseMirror has no opinion about track sizing.
 *
 * ── The skeleton ────────────────────────────────────────────────────────────────────────────────
 *
 *   host          2 cols (value | chevron) x 2 rows (trigger | menu)
 *   ├ trigger     row 1, spans both, subgrid  → value and chevron land in the host's tracks
 *   └ menu        row 2, spans both, subgrid  → option rows land in the host's tracks
 *
 * Two things make it work, and both are load-bearing:
 *
 *   `grid-template-rows: auto 0` + `align-self: start` on the menu. The menu keeps its natural
 *   height — so its own background, border, max-height and overflow all behave normally — while the
 *   row it occupies is 0px, so it costs the host no height and the trigger stays on the text
 *   baseline. Measured: host 28px tall with the menu open, closed, or absent.
 *
 *   Option rows at `grid-column: 1`, NOT spanning. A spanning item's intrinsic contribution is
 *   distributed across the tracks it spans, so the chevron's track eats part of it: measured, a
 *   spanning row left the value track 20px short — exactly chevron + gap — and the longest option
 *   ellipsised the moment it was selected. Confining rows to the value track is what stops the
 *   chevron stealing from the option width, and is the reason this is a subgrid at all rather than
 *   one shared column.
 */
const styles: CSSResultGroup = [
  externalStyles,
  css`
    /* Keeps the closed combobox on one line where it sits inside a sentence. */
    :host {
      white-space: nowrap;

      /* Replaces upstream's inline-flex. See the skeleton above. */
      display: inline-grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto 0;
    }

    /*
     * The type selector is load-bearing: upstream styles the trigger through
     * button[part='trigger'] (0,2,1), which outranks a bare attribute selector (0,1,0). Written as
     * [part='trigger'], this rule silently loses grid-template-columns to upstream's
     * minmax(0, 1fr) auto — the trigger keeps private tracks, the host's chevron column collapses
     * to 1px, and the subgrid below never engages. Measured on a long option: selecting it still
     * grew the host by 39.8px, the exact reflow this file exists to prevent. Matching upstream's
     * specificity (and coming later in the cascade) brings that to 4.8px.
     */
    button[part='trigger'] {
      grid-column: 1 / -1;
      grid-row: 1;
      display: grid;
    }

    [part='menu'] {
      margin-left: calc(-1 * var(--qti-component-border-width, 1px)); /* Trigger border width, see upstream's :host([focused]) */
      margin-right: calc(-1 * var(--qti-component-border-width, 1px)); /* Trigger border width, see upstream's :host([focused]) */
      grid-column: 1 / -1;
      grid-row: 2;
      /* Natural height in a zero-height row: paints in full, costs the host nothing. */
      align-self: start;
      display: grid;
      white-space: normal;
    }

    /*
     * Closed, the menu still lays out — that is the whole point, it is what sizes the trigger — so
     * it must be hidden with visibility, never display:none, which would remove the box and take the
     * sizing with it. pointer-events:none keeps clicks from landing on rows nobody can see;
     * previously the closed list was display:none and unreachable by construction.
     */
    [part='menu']:not([data-open]) {
      visibility: hidden;
      pointer-events: none;
    }

    /* The value track, not the full width — see the note on spanning above. */
    [part='menu'] > *,
    ::slotted(qti-inline-choice) {
      grid-column: 1;
    }
  `,
];

export default styles;

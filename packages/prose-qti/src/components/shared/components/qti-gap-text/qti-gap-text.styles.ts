import { css, type CSSResultGroup } from 'lit';

import { QtiGapText } from '@qti-components/interactions-core';

/**
 * Upstream's stylesheet, plus the authoring-only additions — the same shape
 * `QtiSimpleChoiceEdit` uses. Imported through the package root, not a deep
 * `elements/qti-gap-text/...` path: the local-link aliases bind whole specifiers, so a deep path
 * silently resolves to the published dist even in source-link mode.
 *
 * Taking upstream's is what keeps a chip and the gap it drops into the same size. `@mixin drag`
 * gives a chip `min-width: var(--qti-dropzone-min-width)` and the gap reserves the same value, so
 * a private copy here could only drift from the box the interaction measured.
 *
 * Per-state visuals (selected / linked / disabled) stay in the host application's stylesheet via
 * `qti-gap-text:state(...)`. Transient UI state is expressed through
 * {@link ElementInternals.states}, never a DOM attribute, so it can't leak into serialized XML.
 */
const styles: CSSResultGroup = [
  QtiGapText.styles,
  css`
    /*
     * Upstream sets user-select: none — correct at runtime, where a chip is dragged and never
     * read as text. Here the label IS the text the author types, so it has to come back off.
     * QtiSimpleChoiceEdit carries the identical override for the identical reason.
     */
    :host {
      user-select: unset !important;
      cursor: unset !important;
    }

    /* ProseMirror edits the label in place: its own margins and the trailing break it parks at the
       end of an empty text block are authoring artefacts upstream never sees. */
    ::slotted(*) {
      margin: 0;
    }

    ::slotted(.ProseMirror-trailingBreak) {
      display: inline;
    }
  `
];

export default styles;

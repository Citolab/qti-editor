import { css, type CSSResultGroup } from 'lit';

import { QtiGap } from '@qti-components/interactions-core';

/**
 * Upstream's stylesheet, plus the few authoring-only additions — the same shape
 * `QtiSimpleChoiceEdit` uses. It is imported through the package root rather than a deep
 * `elements/qti-gap/qti-gap.styles.js` path on purpose: the local-link aliases bind whole
 * specifiers (`@qti-components/interactions-core`), so a deep path silently resolves to the
 * published dist even in source-link mode.
 *
 * What upstream brings that the editor's private copy did not have:
 * `min-height`/`min-width: var(--qti-dropzone-min-*)` on `[part~='drop']`, which is what makes a
 * gap take the size of the widest chip, and `vertical-align: middle` on the host, without which a
 * gap tall enough to hold a chip rides above its own line of prose.
 *
 * Per-state visuals (pending / filled) stay out of here: the host application owns the affordance
 * via lightdom selectors like `qti-gap:state(pending)` so authoring tools can theme it freely.
 * Transient UI state is expressed via {@link ElementInternals.states}, never a DOM attribute, so
 * it cannot leak into serialized XML.
 */
const styles: CSSResultGroup = [
  QtiGap.styles,
  css`
    :host {
      /* An empty gap still has to be a visible, clickable target while authoring. Upstream has no
         equivalent: at runtime a gap is only ever empty before the candidate fills it. */
      min-width: 5rem;
      gap: 4px;
      line-height: 1.4;
    }
  `
];

export default styles;

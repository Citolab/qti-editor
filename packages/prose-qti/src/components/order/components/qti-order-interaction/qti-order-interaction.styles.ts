import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/order-interaction/styles';

/**
 * Shadow-DOM styles. Layout only — drop-slot per-state visuals (idle,
 * pending pulse, filled) and chip styling are app-owned via host-state
 * selectors (`qti-order-interaction:state(pending) ::part(drop)`)
 * and qti-theme's `::part(drag)` rules.
 */
const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
      position: relative;
      overflow: visible;
    }

    slot[name='prompt'] {
      display: block;
      margin-bottom: 8px;
    }

    slot:not([name]) {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .interaction-preview {
      align-items: flex-start;
    }

    .preview-drags {
      min-width: 0;
    }

    .preview-drops {
      min-width: min(18rem, 100%);
      gap: 0.5rem;
      align-content: start;
    }

    .order-slot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px;
      min-height: 3rem;
    }

    /* Pending pulse — only empty slots react.
       qti-theme's outer qti-order-interaction::part(drop) rule wins
       the cascade over shadow rules for ::part() selectors. We can't
       beat it with a more-specific shadow rule, so instead we override the
       custom properties IT reads (--qti-border-color, --qti-bg). Those
       inherit through the shadow boundary, so setting them on the empty
       drop region redirects theme's own declarations. Animation lives in
       shadow because it doesn't conflict with the theme cascade. */
    :host(:state(pending)) [part='drop']:not(:has(qti-fake-drag)) {
      --qti-border-color: var(--qti-edit-drop-pending-border, var(--qti-border-active, #f86d70));
      --qti-bg: var(--qti-edit-drop-pending-bg, var(--qti-bg-active, #ffecec));
      animation: qti-edit-drop-pulse 1.2s ease-in-out infinite;
    }

    @keyframes qti-edit-drop-pulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb,
        var(--qti-edit-drop-pending-border, var(--qti-border-active, #f86d70)) 45%, transparent); }
      50%      { box-shadow: 0 0 0 4px color-mix(in srgb,
        var(--qti-edit-drop-pending-border, var(--qti-border-active, #f86d70)) 0%, transparent); }
    }
  `,
];

export default styles;

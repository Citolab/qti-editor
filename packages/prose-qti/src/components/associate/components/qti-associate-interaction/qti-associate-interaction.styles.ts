import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/associate-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
    }

    /* Pending pulse — only empty slots react.
       qti-theme's outer qti-associate-interaction::part(drop) rule
       wins the cascade over shadow rules for ::part() selectors. We
       redirect by overriding the custom properties IT reads (which inherit
       through the shadow boundary). Animation lives in shadow because it
       doesn't conflict with the theme cascade. */
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
  `
];

export default styles;

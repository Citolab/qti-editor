import { css, type CSSResultGroup } from 'lit';

import { associationPanelStyles } from '../../../shared';

const styles: CSSResultGroup = [
  css`
    :host {
      word-wrap: break-word;
      white-space: normal;
    }

    .choices {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.75rem 0;
      padding: 0.3rem;
      border: 2px solid transparent;
      border-radius: 0.3rem;
      background: var(--qti-bg-subtle, #f8fafc);
    }

    .body {
      display: block;
    }

    .pending-indicator,
    .no-associations {
      color: var(--qti-text-muted, #64748b);
    }
  `,
  associationPanelStyles,
];

export default styles;

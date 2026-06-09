import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/associate-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
    }

    .slot-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: auto;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
      font-size: 13px;
      line-height: 1;
      color: inherit;
      opacity: 0.6;
      flex-shrink: 0;
    }

    .slot-remove:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }

    .pending-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      background: var(--qti-bg-warning, #fef3c7);
      border: 1px dashed var(--qti-border-warning, #f59e0b);
      border-radius: 4px;
      font-size: 0.85em;
      color: var(--qti-text-warning, #92400e);
    }

    .pending-cancel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
      font-size: 14px;
      line-height: 1;
      color: inherit;
      opacity: 0.6;
    }

    .pending-cancel:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }
  `
];

export default styles;

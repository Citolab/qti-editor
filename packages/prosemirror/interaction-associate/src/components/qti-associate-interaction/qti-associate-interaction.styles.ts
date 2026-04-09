import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/associate-interaction/styles';

/** Light DOM styles injected as a <style> element (applies to slotted content) */
export const LIGHT_DOM_STYLES = `
  qti-simple-associable-choice {
    display: inline-block;
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 8px;
    margin-right: 8px;
    border: 1px solid var(--qti-border, #cbd5e1);
  }

  qti-simple-associable-choice:hover {
    background: var(--qti-bg-hover, #f1f5f9);
  }

  qti-simple-associable-choice p {
    margin: 0;
  }

  qti-simple-associable-choice::part(dropslot) {
    display: none;
  }
`;

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
    }

    .drop-container {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .associables-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .drop-slot {
      flex: 1;
      min-height: 2rem;
      padding: 4px 8px;
      border: 1px dashed var(--qti-border, #cbd5e1);
      border-radius: 4px;
      background: #f8fafc;
      font-size: 0.875em;
      color: var(--qti-text-muted, #94a3b8);
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }

    .drop-slot:hover {
      background: var(--qti-bg-hover, #f1f5f9);
      border-color: var(--qti-border-focus, #94a3b8);
    }

    .drop-slot.droppable {
      border-color: var(--qti-border-warning, #f59e0b);
      background: var(--qti-bg-warning, #fef3c7);
      color: var(--qti-text-warning, #92400e);
    }

    .drop-slot.filled {
      border-style: solid;
      border-color: var(--qti-border-success, #22c55e);
      background: var(--qti-bg-success, #dcfce7);
      color: var(--qti-text-success, #166534);
      cursor: default;
    }

    .drop-slot.filled:hover {
      background: #bbf7d0;
      border-color: #16a34a;
    }

    .slot-arrow {
      color: var(--qti-text-muted, #94a3b8);
      flex-shrink: 0;
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

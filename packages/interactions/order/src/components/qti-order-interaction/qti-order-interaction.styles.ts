import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/order-interaction/styles';

/** Light DOM styles injected as a <style> element (applies to slotted content) */
export const LIGHT_DOM_STYLES = `
  qti-simple-choice {
    border-radius: 4px;
    padding: 4px 8px;
    border: 1px solid var(--qti-border, #cbd5e1);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  qti-simple-choice:hover {
    background: var(--qti-bg-hover, #f1f5f9);
  }
`;

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

    /* Drop slot — clickable area that shows the assigned choice as a fake drag */
    .order-slot {
      min-height: 3rem;
      border: 2px dashed var(--qti-border, #cbd5e1);
      border-radius: 0.5rem;
      background: #fffbeb;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px;
    }

    .order-slot:hover {
      border-color: #d97706;
      background: #fef3c7;
    }

    .order-slot[data-filled] {
      border-style: solid;
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .order-slot[data-filled]:hover {
      border-color: #16a34a;
      background: #dcfce7;
    }

    /* While a simple-choice is pending, empty drop slots pulse to invite a click.
       Mirrors the dropslot-pulse used by qti-simple-associable-choice in match. */
    @keyframes order-dropslot-pulse {
      0%, 100% { border-color: var(--qti-border, #cbd5e1); }
      50%      { border-color: var(--qti-border-active, #3b82f6); }
    }

    .order-slot[data-pending-target]:not([data-filled]) {
      animation: order-dropslot-pulse 1.2s ease-in-out infinite;
      background: #eff6ff;
    }

    .order-slot[data-pending-target]:not([data-filled]):hover {
      background: #dbeafe;
    }

    /* Fake drag — non-interactive preview of the assigned choice inside a slot,
       mirroring the qti-simple-associable-choice fake drags in match. */
    .fake-drag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid var(--qti-correct, #22c55e);
      border-radius: 4px;
      background: var(--qti-bg-success, #dcfce7);
      font-size: 0.9em;
      line-height: 1.2;
      user-select: none;
      cursor: default;
    }

    .fake-drag-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      font-size: 1.1em;
      line-height: 1;
      cursor: pointer;
      opacity: 0.6;
    }

    .fake-drag-remove:hover {
      opacity: 1;
      background: rgb(0 0 0 / 0.1);
    }
  `,
];

export default styles;

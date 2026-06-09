import { css, type CSSResultGroup } from 'lit';
import { associationPanelStyles } from '@qti-editor/interaction-shared';

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

    /* Drop slot — simple clickable area, no inner content */
    .order-slot {
      min-height: 3rem;
      border: 2px dashed #f59e0b;
      border-radius: 0.5rem;
      background: #fffbeb;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
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

    .order-slot[data-pending-target]:not([data-filled]) {
      border-color: #3b82f6;
      border-style: dashed;
      background: #eff6ff;
    }

    .order-slot[data-pending-target]:not([data-filled]):hover {
      border-color: #2563eb;
      background: #dbeafe;
    }
  `,
  associationPanelStyles
];

export default styles;

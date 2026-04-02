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
      display: block;
    }

    .order-panel {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 50;
      min-width: 200px;
      margin-top: 4px;
      padding: 8px 12px;
      background: white;
      border: 1px solid var(--qti-border, #e2e8f0);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .order-panel-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--qti-text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .order-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .order-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: white;
      border: 1px solid var(--qti-border, #e2e8f0);
      border-radius: 4px;
      font-size: 0.85em;
    }

    .order-row-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--qti-primary, #3b82f6);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .order-row-label {
      flex: 1;
    }

    .order-row-buttons {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .order-arrow-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 18px;
      padding: 0;
      border: 1px solid var(--qti-border, #cbd5e1);
      background: white;
      cursor: pointer;
      border-radius: 3px;
      font-size: 10px;
      line-height: 1;
      color: var(--qti-text-muted, #64748b);
    }

    .order-arrow-btn:hover:not(:disabled) {
      background: var(--qti-bg-hover, #f1f5f9);
      color: var(--qti-text, #1e293b);
    }

    .order-arrow-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }
  `
];

export default styles;

import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/match-interaction/styles';

/** Light DOM styles injected as a <style> element (applies to slotted content) */
export const LIGHT_DOM_STYLES = `
  /* Source items (first match set) - clickable */
  qti-simple-match-set:first-of-type qti-simple-associable-choice {
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 8px;
  }

  qti-simple-match-set:first-of-type qti-simple-associable-choice:hover {
    background: var(--qti-bg-hover, #f1f5f9);
  }

  /* Target items (second match set) - styled as drop slots */
  qti-simple-match-set:last-of-type qti-simple-associable-choice {
    border: 1px dashed var(--qti-border, #cbd5e1);
    border-radius: 4px;
    padding: 4px 8px;
    background: white;
    cursor: pointer;
  }

  qti-simple-match-set:last-of-type qti-simple-associable-choice:hover {
    border-color: var(--qti-border-active, #3b82f6);
    background: var(--qti-bg-hover, #f8fafc);
  }
`;

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      white-space: nowrap;
    }

    /* Associations panel */
    .associations-panel {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--qti-bg, #f8fafc);
      border: 1px solid var(--qti-border, #e2e8f0);
      border-radius: 6px;
    }

    .associations-panel-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--qti-text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .association-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .association-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--qti-bg-success, #dcfce7);
      border: 1px solid var(--qti-border-success, #22c55e);
      border-radius: 4px;
      font-size: 0.85em;
    }

    .association-chip-arrow {
      color: var(--qti-text-success, #166534);
    }

    .association-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      margin-left: 4px;
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

    .association-chip-remove:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }

    .no-associations {
      color: var(--qti-text-muted, #64748b);
      font-size: 0.85em;
      font-style: italic;
    }

    .pending-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--qti-bg-warning, #fef3c7);
      border: 1px dashed var(--qti-border-warning, #f59e0b);
      border-radius: 4px;
      font-size: 0.85em;
      color: var(--qti-text-warning, #92400e);
    }
  `
];

export default styles;

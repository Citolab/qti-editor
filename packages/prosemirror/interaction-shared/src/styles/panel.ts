import { css } from 'lit';

/** Shared associations panel styles — used by match, gap-match, order, and associate interactions. */
export const associationPanelStyles = css`
  .associations-panel {
    margin-top: 8px;
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
`;

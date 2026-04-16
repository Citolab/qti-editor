import { css, type CSSResultGroup } from 'lit';

const styles: CSSResultGroup = css`
  :host {
    white-space: nowrap;
    position: relative;
    overflow: visible;
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.75rem 0;
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: var(--qti-bg-subtle, #f8fafc);
  }

  .body {
    display: block;
  }

  .associations-panel {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--qti-border, #e2e8f0);
  }

  .associations-panel-title {
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--qti-text-muted, #64748b);
  }

  .association-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .association-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--qti-border, #cbd5e1);
    border-radius: 999px;
    background: var(--qti-bg-subtle, #f8fafc);
  }

  .association-chip-remove {
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font-size: 0.95rem;
    line-height: 1;
    padding: 0;
  }

  .pending-indicator,
  .no-associations {
    color: var(--qti-text-muted, #64748b);
  }
`;

export default styles;

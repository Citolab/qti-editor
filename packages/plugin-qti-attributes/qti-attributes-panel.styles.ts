import { css } from 'lit';

export const qtiAttributesPanelStyles = css`
  :host {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 60;
    pointer-events: none;
    display: block;
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }

  .popover {
    pointer-events: auto;
    position: absolute;
    z-index: 2;
    width: min(360px, calc(100vw - 24px));
    max-height: min(420px, calc(100vh - 24px));
    overflow: visible;
    box-sizing: border-box;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 12px;
    padding: 14px;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
    animation: pop-in 120ms ease;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    margin-bottom: 10px;
    cursor: move;
    user-select: none;
  }

  .content {
    max-height: calc(min(420px, calc(100vh - 24px)) - 72px);
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 2px;
  }

  .title {
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .subtitle {
    font-size: 0.85rem;
    color: #64748b;
  }

  .node-select {
    border-radius: 10px;
    padding: 6px 10px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: #fff;
    font-size: 0.85rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .close-button {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: #fff;
    color: #0f172a;
    width: 28px;
    height: 28px;
    font-size: 18px;
    font-weight: 500;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .field span {
    font-weight: 600;
    font-size: 0.85rem;
    color: #1e293b;
  }

  .field input[type='text'],
  .field input[type='number'] {
    flex: 1;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    padding: 6px 10px;
    font-size: 0.85rem;
  }

  .field input[type='checkbox'] {
    width: 18px;
    height: 18px;
  }

  .empty {
    font-size: 0.9rem;
    color: #64748b;
  }

  @keyframes pop-in {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

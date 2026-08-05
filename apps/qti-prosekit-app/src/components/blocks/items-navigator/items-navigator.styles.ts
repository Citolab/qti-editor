import { css, type CSSResultGroup } from 'lit';

const styles: CSSResultGroup = css`
  :host {
    display: block;
  }

  .navigator-container {
    border-radius: 0.5rem;
    border: 1px solid hsl(var(--border, 220 13% 91%));
    background: white;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }

  .navigator-header {
    border-bottom: 1px solid hsl(var(--border, 220 13% 91%));
    padding: 0.75rem 1rem;
  }

  .navigator-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(var(--foreground, 220 9% 10%));
    margin: 0 0 0.25rem 0;
  }

  .navigator-subtitle {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground, 220 9% 46%));
    margin: 0;
  }

  .items-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .item-button {
    width: 100%;
    border: none;
    background: none;
    text-align: left;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: background-color 0.15s;
    border-left: 4px solid transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid hsl(var(--border, 220 13% 91%));
  }

  .item-button:last-child {
    border-bottom: none;
  }

  .item-button:hover {
    background-color: hsl(var(--muted, 220 13% 95%));
  }

  .item-button:focus {
    outline: 2px solid hsl(var(--ring, 221 83% 53%));
    outline-offset: -2px;
    background-color: hsl(var(--muted, 220 13% 95%));
  }

  .item-button.active {
    background-color: hsl(221 83% 95%);
    border-left-color: hsl(var(--primary, 221 83% 53%));
  }

  .item-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground, 220 9% 10%));
  }

  .item-button.active .item-label {
    color: hsl(221 83% 30%);
  }

  .active-indicator {
    width: 1rem;
    height: 1rem;
    color: hsl(var(--primary, 221 83% 53%));
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: hsl(var(--muted-foreground, 220 9% 46%));
    font-size: 0.875rem;
  }
`;

export default styles;

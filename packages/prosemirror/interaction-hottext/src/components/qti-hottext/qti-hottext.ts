import { css, html, LitElement } from 'lit';

export class QtiHottextEdit extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      position: relative;
      border-radius: 0.45rem;
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, #f59e0b 18%, transparent),
          color-mix(in srgb, #f59e0b 9%, transparent)
        );
      box-shadow: inset 0 0 0 1px color-mix(in srgb, #f59e0b 42%, transparent);
      box-decoration-break: clone;
      cursor: pointer;
      font-weight: 600;
      padding: 0.12em 0.38em;
      transition:
        background-color 120ms ease,
        box-shadow 120ms ease,
        transform 120ms ease;
    }

    :host(:hover) {
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, #f59e0b 24%, transparent),
          color-mix(in srgb, #f59e0b 13%, transparent)
        );
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, #d97706 55%, transparent),
        0 1px 2px color-mix(in srgb, black 10%, transparent);
      transform: translateY(-1px);
    }

    :host([selected]) {
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, #2563eb 30%, transparent),
          color-mix(in srgb, #2563eb 16%, transparent)
        );
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, #2563eb 70%, transparent),
        0 2px 6px color-mix(in srgb, #2563eb 16%, transparent);
      color: color-mix(in srgb, #1d4ed8 78%, currentColor);
    }

    :host([selected])::after {
      content: '';
      position: absolute;
      left: 0.38em;
      right: 0.38em;
      bottom: 0.14em;
      height: 2px;
      border-radius: 999px;
      background: color-mix(in srgb, #2563eb 78%, transparent);
    }

    :host(:focus-within) {
      outline: 2px solid color-mix(in srgb, #2563eb 45%, transparent);
      outline-offset: 2px;
    }
  `;

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('qti-hottext')) {
  customElements.define('qti-hottext', QtiHottextEdit);
}

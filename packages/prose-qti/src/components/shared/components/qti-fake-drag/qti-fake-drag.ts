import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Editor fake-drag chip rendered *inside* a drop slot for all four drag-drop
 * interactions (match, gap-match, order, associate). Mirrors the runtime
 * qti-components placement: in qti-components the dropped clone is appended
 * inside the drop target (light or shadow). Here the host interaction renders
 * a `<qti-fake-drag>` in the same nesting position so the structural shape
 * matches what students see at runtime.
 *
 * `:host` styles inline the resolved `.drag` declarations from qti-theme
 * (`packages/qti-theme/src/styles/qti-theme/qti-base.css:227`) so the editor
 * doesn't depend on the theme's `@apply drag` resolver — the same visual
 * applies regardless of where this element is placed (light DOM gap-match,
 * shadow drop-list in order/associate, shadow dropslot in match).
 *
 * The remove button is exposed via `part="chip-remove"` and hidden by CSS
 * until the parent drop target is hovered (see `qti.css`).
 */
export class QtiFakeDrag extends LitElement {
  static override styles = css`
    /* Shadow CSS is intentionally minimal — only what is structurally required
     * (host layout, label whitespace, button geometry/hover-reveal). The chip
     * visual (border, background, padding) is owned by qti-theme and reached
     * from outside via host::part(drag) selectors. See qti.css. */
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-sizing: border-box;
    }

    .label {
      white-space: nowrap;
    }

    button[part='chip-remove'] {
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
      opacity: 0;
      transition: opacity 100ms ease-out;
    }

    :host(:hover) button[part='chip-remove'],
    button[part='chip-remove']:focus {
      opacity: 0.7;
    }

    button[part='chip-remove']:hover {
      opacity: 1;
      background: rgb(0 0 0 / 0.1);
    }
  `;

  @property({ type: String })
  identifier: string = '';

  @property({ type: String })
  label: string = '';

  /**
   * Set by the host interaction. The editor doesn't dispatch a default remove
   * event because the action varies per interaction (clear a slot vs. delete
   * a pair). Hosts wire this directly in their lit template via `@click`.
   */
  override render() {
    return html`
      <span class="label" part="chip-label"><slot>${this.label}</slot></span>
      <button
        type="button"
        part="chip-remove"
        aria-label="Remove"
        @click=${this._onRemoveClick}
      >×</button>
    `;
  }

  private _onRemoveClick(event: Event) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('fake-drag-remove', {
        detail: { identifier: this.identifier },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-fake-drag': QtiFakeDrag;
  }
  interface HTMLElementEventMap {
    'fake-drag-remove': CustomEvent<{ identifier: string }>;
  }
}

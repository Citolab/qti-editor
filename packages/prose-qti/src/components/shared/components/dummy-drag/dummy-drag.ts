import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import styles from './dummy-drag.styles.js';

/**
 * Editor stand-in chip rendered *inside* a drop slot for all four drag-drop
 * interactions (match, gap-match, order, associate). Mirrors the runtime
 * qti-components placement: in qti-components the dropped clone is appended
 * inside the drop target (light or shadow). Here the host interaction renders
 * a `<dummy-drag>` in the same nesting position so the structural shape
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
 *
 * Editor-only, and deliberately NOT `qti-`-prefixed: this element has no QTI counterpart and
 * never reaches exported item XML. The prefix is what separates real QTI elements from the
 * editor's own — the generated custom-elements.json keeps only `qti-*` tags, so anything named
 * like this one stays out of the published element contract by construction.
 *
 * @customElement dummy-drag
 * @attr {string} identifier - Identifier of the choice this chip stands in for. The parent
 * interaction uses it to clear the right association when the chip's remove button is pressed.
 * @attr {string} label - Text rendered on the chip — the label of the choice it stands in for.
 */
export class DummyDrag extends LitElement {
  static override styles = styles;

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
      <span part="drag-control"></span>
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
      new CustomEvent('dummy-drag-remove', {
        detail: { identifier: this.identifier },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dummy-drag': DummyDrag;
  }
  interface HTMLElementEventMap {
    'dummy-drag-remove': CustomEvent<{ identifier: string }>;
  }
}

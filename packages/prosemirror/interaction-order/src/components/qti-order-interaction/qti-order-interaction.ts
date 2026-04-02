import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { QtiI18nController } from '@qti-editor/interaction-shared';

import styles, { LIGHT_DOM_STYLES } from './qti-order-interaction.styles.js';

/**
 * Editor component for qti-order-interaction.
 * All choices are shown in the correct-order panel; use up/down arrows to reorder.
 */
export class QtiOrderInteractionEdit extends Interaction {
  static override styles = styles;

  private readonly i18n = new QtiI18nController(this);

  @property({ type: Boolean })
  shuffle: boolean = false;

  @property({ type: String })
  orientation: 'horizontal' | 'vertical' = 'vertical';

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

  @property({ type: String, attribute: 'correct-response' })
  correctResponse: string | null = null;

  @state()
  private _renderTrigger = 0;

  @state()
  private _cursorInside = false;

  private _order: string[] = [];
  private _labelCache = new Map<string, string>();
  private _setupDone = false;
  private _lightDomStyle: HTMLStyleElement | null = null;
  private _observer: MutationObserver | null = null;

  private _onSelectionChange = () => {
    const sel = document.getSelection();
    const inside = sel ? this.contains(sel.anchorNode) : false;
    if (inside !== this._cursorInside) {
      this._cursorInside = inside;
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    this._injectLightDomStyles();
    this._parseCorrectResponse();
    requestAnimationFrame(() => this._trySetup());
    document.addEventListener('selectionchange', this._onSelectionChange);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this._onSelectionChange);
    this._observer?.disconnect();
    this._observer = null;
    this._lightDomStyle?.remove();
    this._lightDomStyle = null;
    this._setupDone = false;
  }

  private _injectLightDomStyles() {
    if (this._lightDomStyle) return;
    this._lightDomStyle = document.createElement('style');
    this._lightDomStyle.textContent = LIGHT_DOM_STYLES;
    this.prepend(this._lightDomStyle);
  }

  override firstUpdated() {
    this._trySetup();
  }

  private _onSlotChange = () => {
    this._trySetup();
    if (this._setupDone) {
      this._buildLabelCache();
      this._syncOrderWithChoices();
      this._triggerRender();
    }
  };

  private _trySetup() {
    if (this._setupDone) return;
    const choices = this.querySelectorAll('qti-simple-choice');
    if (choices.length === 0) return;

    this._setupDone = true;
    this._buildLabelCache();
    this._syncOrderWithChoices();
    this._setupMutationObserver();
    this._triggerRender();
  }

  private _setupMutationObserver() {
    this._observer = new MutationObserver(() => {
      this._buildLabelCache();
      this._triggerRender();
    });
    this._observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      this._parseCorrectResponse();
      if (this._setupDone) this._syncOrderWithChoices();
      this._triggerRender();
    }
  }

  private _parseCorrectResponse() {
    if (!this.correctResponse) {
      this._order = [];
      return;
    }
    try {
      const parsed = JSON.parse(this.correctResponse);
      if (Array.isArray(parsed)) {
        this._order = parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      this._order = [];
    }
  }

  /** Ensure _order contains exactly the current choices, preserving existing order. */
  private _syncOrderWithChoices() {
    const allIds = this._getChoices()
      .map(c => c.getAttribute('identifier'))
      .filter((id): id is string => !!id);

    // Remove stale ids
    this._order = this._order.filter(id => allIds.includes(id));

    // Append any new ids not yet in _order
    const existing = new Set(this._order);
    for (const id of allIds) {
      if (!existing.has(id)) this._order.push(id);
    }
  }

  private _buildLabelCache() {
    this._labelCache.clear();
    for (const choice of this._getChoices()) {
      const id = choice.getAttribute('identifier');
      if (id) {
        const clone = choice.cloneNode(true) as HTMLElement;
        this._labelCache.set(id, clone.textContent?.trim() || id);
      }
    }
  }

  private _getChoices(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-simple-choice'));
  }

  private _getLabel(id: string): string {
    return this._labelCache.get(id) || id;
  }

  private _triggerRender() {
    this._renderTrigger++;
  }

  private _emitChange() {
    this.dispatchEvent(new CustomEvent('order-response-change', {
      detail: { order: [...this._order] },
      bubbles: true,
      composed: true,
    }));
  }

  // ─── Reorder ─────────────────────────────────────────────────────────────

  private _moveUp(i: number) {
    if (i === 0) return;
    [this._order[i - 1], this._order[i]] = [this._order[i], this._order[i - 1]];
    this._emitChange();
    this._triggerRender();
  }

  private _moveDown(i: number) {
    if (i === this._order.length - 1) return;
    [this._order[i + 1], this._order[i]] = [this._order[i], this._order[i + 1]];
    this._emitChange();
    this._triggerRender();
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  private _renderOrderPanel() {
    return html`
      <div class="order-panel">
        <div class="order-panel-title">${this.i18n.t('order.correctResponse')}</div>
        <div class="order-list">
          ${this._order.map((id, i) => html`
            <div class="order-row">
              <span class="order-row-number">${i + 1}</span>
              <span class="order-row-label">${this._getLabel(id)}</span>
              <div class="order-row-buttons">
                <button
                  type="button"
                  class="order-arrow-btn"
                  aria-label=${this.i18n.t('order.moveUp')}
                  ?disabled=${i === 0}
                  @click=${(e: Event) => { e.stopPropagation(); this._moveUp(i); }}
                >▲</button>
                <button
                  type="button"
                  class="order-arrow-btn"
                  aria-label=${this.i18n.t('order.moveDown')}
                  ?disabled=${i === this._order.length - 1}
                  @click=${(e: Event) => { e.stopPropagation(); this._moveDown(i); }}
                >▼</button>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  override render() {
    void this._renderTrigger;
    return html`
      <slot name="prompt"></slot>
      <slot @slotchange=${this._onSlotChange}></slot>
      ${this._setupDone && this._cursorInside ? this._renderOrderPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'order-response-change': CustomEvent<{ order: string[] }>;
  }
}

if (!customElements.get('qti-order-interaction')) {
  customElements.define('qti-order-interaction', QtiOrderInteractionEdit);
}

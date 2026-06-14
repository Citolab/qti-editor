import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { InteractionPanel, QtiI18nController } from '@qti-editor/interaction-shared';

import styles, { LIGHT_DOM_STYLES } from './qti-order-interaction.styles.js';

export class QtiOrderInteractionEdit extends InteractionPanel {
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

  private _order: string[] = [];
  private _labelCache = new Map<string, string>();
  private _setupDone = false;
  private _lightDomStyle: HTMLStyleElement | null = null;
  private _observer: MutationObserver | null = null;
  private _pendingChoiceId: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._injectLightDomStyles();
    this._parseCorrectResponse();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
    requestAnimationFrame(() => this._trySetup());
  }

  override disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
    this._observer?.disconnect();
    this._observer = null;
    this._lightDomStyle?.remove();
    this._lightDomStyle = null;
    this._setupDone = false;
    super.disconnectedCallback();
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
      this._syncOrderWithChoices();
      this._triggerRender();
    });
    this._observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      this._parseCorrectResponse();
      if (this._setupDone) {
        this._syncOrderWithChoices();
      }
      this._triggerRender();
    }
  }

  private _parseCorrectResponse() {
    if (!this.correctResponse) {
      this._order = [];
      this._pendingChoiceId = null;
      return;
    }

    // correctResponse is a comma-separated list of identifiers (qti-components
    // convention): "id1,id2,id3". Order is significant (ordered cardinality).
    this._order = this.correctResponse
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  private _syncOrderWithChoices() {
    const choiceIds = this._getChoiceIds();
    const validIds = new Set(choiceIds);
    const seen = new Set<string>();

    this._order = this._order.filter(id => {
      if (!validIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (this._pendingChoiceId && !validIds.has(this._pendingChoiceId)) {
      this._pendingChoiceId = null;
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

  private _getChoiceIds(): string[] {
    return this._getChoices()
      .map(choice => choice.getAttribute('identifier'))
      .filter((id): id is string => Boolean(id));
  }

  private _getLabel(id: string): string {
    return this._labelCache.get(id) || id;
  }

  private _getSlots(): Array<string | null> {
    const slotCount = this._getChoiceIds().length;
    return Array.from({ length: slotCount }, (_, index) => this._order[index] ?? null);
  }

  private _triggerRender() {
    this._renderTrigger++;
  }

  private _emitChange() {
    // Serialize as qti-components does: a comma-separated identifier list.
    const correctResponse = this._order.length > 0 ? this._order.join(',') : null;

    this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
      detail: {
        nodeType: 'qtiOrderInteraction',
        tagName: 'qti-order-interaction',
        attrs: { correctResponse },
      },
      bubbles: true,
      composed: true,
    }));

    this.dispatchEvent(new CustomEvent('order-response-change', {
      detail: { order: this._order, correctResponse },
      bubbles: true,
      composed: true,
    }));
  }

  private _toggleChoiceSelection(choiceId: string) {
    this._pendingChoiceId = this._pendingChoiceId === choiceId ? null : choiceId;
    this._triggerRender();
  }

  private _cancelPending() {
    this._pendingChoiceId = null;
    this._triggerRender();
  }

  private _handleSlotClick(slotIndex: number) {
    if (this._pendingChoiceId) {
      this._placeSelectedChoice(slotIndex);
    }
  }

  private _placeSelectedChoice(slotIndex: number) {
    if (!this._pendingChoiceId) return;

    const choiceId = this._pendingChoiceId;
    const nextOrder = this._order.filter(id => id !== choiceId);
    const insertAt = Math.max(0, Math.min(slotIndex, nextOrder.length));
    nextOrder.splice(insertAt, 0, choiceId);

    this._order = nextOrder;
    this._pendingChoiceId = null;
    this._emitChange();
    this._triggerRender();
  }

  private _clearSlot(slotIndex: number) {
    if (slotIndex >= this._order.length) return;
    this._order = this._order.filter((_, index) => index !== slotIndex);
    this._emitChange();
    this._triggerRender();
  }

  private _onClick = (event: MouseEvent) => {
    const choice = event.composedPath().find(item =>
      item instanceof HTMLElement && item.tagName === 'QTI-SIMPLE-CHOICE',
    ) as HTMLElement | undefined;

    if (!choice || !this.contains(choice)) return;

    const identifier = choice.getAttribute('identifier');
    if (!identifier) return;

    event.stopPropagation();
    this._toggleChoiceSelection(identifier);
  };

  private _onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this._pendingChoiceId) {
      event.preventDefault();
      this._cancelPending();
    }
  };

  private _renderSlots() {
    const pendingTarget = this._pendingChoiceId !== null;
    return html`
      ${this._getSlots().map((choiceId, index) => {
        return html`
          <div
            class="order-slot"
            part="drop-list"
            ?data-filled=${choiceId !== null}
            ?data-pending-target=${pendingTarget}
            @click=${(e: Event) => { e.stopPropagation(); this._handleSlotClick(index); }}
          >
            ${choiceId !== null ? html`
              <span class="fake-drag" data-identifier=${choiceId}>
                ${this._getLabel(choiceId)}
                <button
                  type="button"
                  class="fake-drag-remove"
                  aria-label=${this.i18n.t('order.remove')}
                  @click=${(e: Event) => { e.stopPropagation(); this._clearSlot(index); }}
                >×</button>
              </span>
            ` : nothing}
          </div>
        `;
      })}
    `;
  }

  private _renderOrderPanel() {
    const filled = this._getSlots()
      .map((choiceId, index) => ({ position: index + 1, choiceId }))
      .filter((s): s is { position: number; choiceId: string } => s.choiceId !== null);

    return html`
      <div class="associations-panel">
        <div class="associations-panel-title">${this.i18n.t('order.correctResponse')}</div>
        <div class="association-list">
          ${this._pendingChoiceId ? html`
            <span class="pending-indicator">
              ${this.i18n.t('order.selectPositionFor', { label: this._getLabel(this._pendingChoiceId) })}
              <button
                type="button"
                class="association-chip-remove"
                aria-label=${this.i18n.t('order.cancel')}
                @click=${(e: Event) => { e.stopPropagation(); this._cancelPending(); }}
              >×</button>
            </span>
          ` : nothing}
          ${filled.length === 0 && !this._pendingChoiceId ? html`
            <span class="no-associations">${this.i18n.t('order.noAssignments')}</span>
          ` : nothing}
          ${filled.map(({ position, choiceId }) => html`
            <span class="association-chip">
              <span>${position}</span>
              <span class="association-chip-arrow">→</span>
              <span>${this._getLabel(choiceId)}</span>
              <button
                type="button"
                class="association-chip-remove"
                aria-label=${this.i18n.t('order.remove')}
                @click=${(e: Event) => { e.stopPropagation(); this._clearSlot(position - 1); }}
              >×</button>
            </span>
          `)}
        </div>
      </div>
    `;
  }

  override render() {
    void this._renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <div part="container" class="interaction-preview">
        <div part="drags" class="preview-drags">
          <slot @slotchange=${this._onSlotChange}></slot>
        </div>
        <div part="drops" class="preview-drops">
          ${this._renderSlots()}
        </div>
      </div>
      ${this._setupDone && this._panelOpen ? this._renderOrderPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'order-response-change': CustomEvent<{ order: string[]; correctResponse: string | null }>;
  }
}

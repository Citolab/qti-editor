import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { Interaction, PendingSelectionController, renderEditChip } from '../../../shared';
import styles from './qti-order-interaction.styles.js';

export class QtiOrderInteractionEdit extends Interaction {
  static override styles = styles;

  public internals: ElementInternals;

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

  /** Positional, sparse: index = slot, value = choice id or null. */
  private _order: (string | null)[] = [];
  private _labelCache = new Map<string, string>();
  private _setupDone = false;
  private _observer: MutationObserver | null = null;

  private readonly _selection = new PendingSelectionController(this, {
    resolveSource: el => {
      if (el.tagName !== 'QTI-SIMPLE-CHOICE') return null;
      const identifier = el.getAttribute('identifier');
      return identifier ? { element: el, identifier } : null;
    },
    resolveTarget: el => {
      const raw = el.dataset?.slotIndex;
      if (raw == null) return null;
      return { element: el, identifier: raw };
    },
    onCommit: (sourceId, target) => {
      const slotIndex = Number(target.identifier);
      if (Number.isFinite(slotIndex)) this._placeSelectedChoice(sourceId, slotIndex);
    },
    // Mirror the pending state onto the interaction host so CSS can pulse
    // empty drop slots via `:state(pending) ::part(drop):not(:has(qti-fake-drag))`.
    onPendingChanged: pending => {
      if (pending != null) this.internals.states.add('pending');
      else this.internals.states.delete('pending');
    },
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  private get _pendingChoiceId(): string | null {
    return this._selection.pendingSourceId;
  }

  override connectedCallback() {
    super.connectedCallback();
    this._parseCorrectResponse();
    requestAnimationFrame(() => this._trySetup());
    void this._selection;
  }

  override disconnectedCallback() {
    this._observer?.disconnect();
    this._observer = null;
    this._setupDone = false;
    super.disconnectedCallback();
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
    this._selection.cancel();
    if (!this.correctResponse) {
      this._order = [];
      return;
    }

    // correctResponse is a comma-separated list of identifiers (qti-components
    // convention): "id1,id2,id3". The list is dense — ordered cardinality has
    // no gaps — so we hydrate positions 0..n in order.
    this._order = this.correctResponse
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  private _syncOrderWithChoices() {
    const choiceIds = this._getChoiceIds();
    const slotCount = choiceIds.length;
    const validIds = new Set(choiceIds);
    const seen = new Set<string>();

    const next: (string | null)[] = Array.from({ length: slotCount }, (_, i) => {
      const id = this._order[i] ?? null;
      if (id && validIds.has(id) && !seen.has(id)) {
        seen.add(id);
        return id;
      }
      return null;
    });
    this._order = next;

    if (this._pendingChoiceId && !validIds.has(this._pendingChoiceId)) {
      this._selection.cancel();
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
    // Serialize as qti-components does: a dense, comma-separated identifier list
    // (ordered cardinality forbids gaps — we drop empty slots on emit).
    const dense = this._order.filter((id): id is string => id !== null);
    const correctResponse = dense.length > 0 ? dense.join(',') : null;

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
      detail: { order: dense, correctResponse },
      bubbles: true,
      composed: true,
    }));
  }

  private _placeSelectedChoice(choiceId: string, slotIndex: number) {
    const slotCount = this._getChoiceIds().length;
    if (slotIndex < 0 || slotIndex >= slotCount) return;

    // Positional placement: put the choice in the exact slot the user clicked.
    // Clear it from any previous slot so each choice appears at most once.
    const next: (string | null)[] = Array.from({ length: slotCount }, (_, i) => this._order[i] ?? null);
    for (let i = 0; i < next.length; i++) {
      if (next[i] === choiceId) next[i] = null;
    }
    next[slotIndex] = choiceId;

    this._order = next;
    this._emitChange();
    this._triggerRender();
  }

  private _clearSlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= this._order.length) return;
    if (this._order[slotIndex] == null) return;
    const next = [...this._order];
    next[slotIndex] = null;
    this._order = next;
    this._emitChange();
    this._triggerRender();
  }

  private _renderSlots() {
    // Plain `<drop-list role="region" part="drop">` mirrors the runtime
    // qti-components shape (runtime renders `<div role="region" part="drop">`
    // inside `part="drops"`). The `<drop-list>` tag is NOT a registered custom
    // element — just a styling/role hook; the theme reaches it via ::part(drop).
    // Pending and filled visuals are driven by:
    //   - `:state(pending)` on the interaction host (set by PendingSelectionController)
    //   - `:has(qti-fake-drag)` to detect filled slots in CSS
    return html`
      ${this._getSlots().map((choiceId, index) => html`
        <drop-list
          role="region"
          class="order-slot"
          part="drop"
          data-slot-index=${index}
        >
          ${choiceId !== null
            ? renderEditChip(this._getLabel(choiceId), choiceId, () => this._clearSlot(index))
            : nothing}
        </drop-list>
      `)}
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
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'order-response-change': CustomEvent<{ order: string[]; correctResponse: string | null }>;
  }
}

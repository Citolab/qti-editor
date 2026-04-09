import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { QtiI18nController } from '@qti-editor/interaction-shared';

import styles, { LIGHT_DOM_STYLES } from './qti-associate-interaction.styles.js';

/** Association pair: [firstIdentifier, secondIdentifier] */
export type AssociatePair = [string, string];

/**
 * Event detail for associate pair changes.
 */
export interface AssociatePairChangeDetail {
  pairs: AssociatePair[];
}

interface SlotContainer {
  left: string | null;
  right: string | null;
}

/**
 * Module-level state to persist across component recreation.
 * Key is response-identifier.
 */
interface AssociateState {
  pendingId: string | null;
  containers: SlotContainer[];
}

const associateStates = new Map<string, AssociateState>();

function getState(key: string): AssociateState {
  if (!associateStates.has(key)) {
    associateStates.set(key, { pendingId: null, containers: [{ left: null, right: null }] });
  }
  return associateStates.get(key)!;
}

function stateToPairs(containers: SlotContainer[]): AssociatePair[] {
  return containers
    .filter(c => c.left !== null && c.right !== null)
    .map(c => [c.left!, c.right!]);
}

/**
 * Editor component for qti-associate-interaction.
 * Choices are shown in a pool; click a choice then click a drop slot to form a pair.
 */
export class QtiAssociateInteractionEdit extends Interaction {
  static override styles = styles;

  private readonly i18n = new QtiI18nController(this);

  @property({ type: Number, attribute: 'max-associations' })
  maxAssociations: number = 1;

  @property({ type: Number, attribute: 'min-associations' })
  minAssociations: number = 0;

  @property({ type: Boolean })
  shuffle: boolean = false;

  @property({ type: String, attribute: 'correct-response' })
  correctResponse: string | null = null;

  @state()
  private _renderTrigger = 0;

  private _setupDone = false;
  private _labelCache = new Map<string, string>();
  private _observer: MutationObserver | null = null;
  private _lightDomStyle: HTMLStyleElement | null = null;
  private _lastEmittedResponse: string | null = null;

  private get _state(): AssociateState {
    return getState(this._getInteractionKey());
  }

  override connectedCallback() {
    super.connectedCallback();
    this._injectLightDomStyles();
    this._syncStateFromCorrectResponse();
    document.addEventListener('keydown', this._onKeyDown);
    requestAnimationFrame(() => this._trySetup());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onChoiceClick);
    document.removeEventListener('keydown', this._onKeyDown);
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
  };

  private _trySetup() {
    if (this._setupDone) return;
    const choices = this.querySelectorAll('qti-simple-associable-choice');
    if (choices.length < 2) return;

    this._setupDone = true;
    this._buildLabelCache();
    this.addEventListener('click', this._onChoiceClick);
    this._setupMutationObserver();
    this._triggerRender();
  }

  private _setupMutationObserver() {
    this._observer = new MutationObserver(() => {
      this._buildLabelCache();
      this.requestUpdate();
    });
    this._observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  private _parseCorrectResponse() {
    const state = this._state;
    if (!this.correctResponse) {
      state.containers = [{ left: null, right: null }];
      return;
    }
    try {
      const parsed: AssociatePair[] = JSON.parse(this.correctResponse);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(p => Array.isArray(p) && p.length === 2 && p[0] && p[1]);
        state.containers = [
          ...valid.map(([l, r]) => ({ left: l, right: r })),
          { left: null, right: null },
        ];
        return;
      }
    } catch {
      // Invalid JSON, ignore
    }
    state.containers = [{ left: null, right: null }];
  }

  private _serializeCurrentPairs(): string | null {
    const pairs = stateToPairs(this._state.containers);
    return pairs.length > 0 ? JSON.stringify(pairs) : null;
  }

  private _syncStateFromCorrectResponse() {
    if (this.correctResponse === this._serializeCurrentPairs()) {
      return;
    }
    this._parseCorrectResponse();
  }

  private _emitChange() {
    const pairs = stateToPairs(this._state.containers);
    this._lastEmittedResponse = pairs.length > 0 ? JSON.stringify(pairs) : null;
    this.dispatchEvent(new CustomEvent<AssociatePairChangeDetail>('associate-pair-change', {
      detail: { pairs },
      bubbles: true,
      composed: true
    }));
  }

  private _triggerRender() {
    this._renderTrigger++;
  }

  private _getInteractionKey(): string {
    return this.responseIdentifier || this.getAttribute('response-identifier') || 'default';
  }

  private _getChoices(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-simple-associable-choice'));
  }

  private _buildLabelCache() {
    this._labelCache.clear();
    for (const choice of this._getChoices()) {
      const id = choice.getAttribute('identifier');
      if (id) {
        const clone = choice.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('qti-simple-associable-choice').forEach(el => el.remove());
        this._labelCache.set(id, clone.textContent?.trim() || id);
      }
    }
  }

  private _getLabel(id: string): string {
    return this._labelCache.get(id) || id;
  }

  // ─── Event Handling ─────────────────────────────────────────────────────

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this._state.pendingId) {
      this._cancelPending();
    }
  };

  private _onChoiceClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const choiceIndex = path.findIndex(el =>
      el instanceof HTMLElement && el.tagName === 'QTI-SIMPLE-ASSOCIABLE-CHOICE'
    );
    if (choiceIndex < 0) return;
    const choice = path[choiceIndex] as HTMLElement;
    const identifier = choice.getAttribute('identifier');
    if (!identifier) return;

    e.stopPropagation();

    const state = this._state;
    if (state.pendingId === identifier) {
      state.pendingId = null;
    } else {
      state.pendingId = identifier;
    }
    this._triggerRender();
  };

  private _clearSlot(containerIndex: number, side: 'left' | 'right', e: Event) {
    e.stopPropagation();
    const state = this._state;
    const container = state.containers[containerIndex];
    if (!container) return;
    container[side] = null;
    this._normalizeContainers();
    this._emitChange();
    this._triggerRender();
  }

  private _placeInSlot(containerIndex: number, side: 'left' | 'right', e: Event) {
    e.stopPropagation();
    const state = this._state;
    const container = state.containers[containerIndex];
    if (!container) return;
    if (container[side] !== null) return; // slot is filled — do nothing
    if (state.pendingId === null) return;

    // Remove pendingId from any existing slot
    for (const c of state.containers) {
      if (c.left === state.pendingId) c.left = null;
      if (c.right === state.pendingId) c.right = null;
    }

    container[side] = state.pendingId;
    state.pendingId = null;

    this._normalizeContainers();
    this._emitChange();
    this._triggerRender();
  }

  /**
   * Ensure there is always exactly one empty container at the end,
   * and no completely empty containers in the middle.
   */
  private _normalizeContainers() {
    const state = this._state;
    // Remove fully empty containers except the last one
    state.containers = state.containers.filter(c => c.left !== null || c.right !== null);
    state.containers.push({ left: null, right: null });
  }

  private _cancelPending() {
    this._state.pendingId = null;
    this._triggerRender();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private _renderDropContainer() {
    const state = this._state;
    const hasPending = state.pendingId !== null;

    return html`
      <div class="drop-container">
        ${hasPending ? html`
          <div class="pending-banner">
            <span>${this.i18n.t('associate.selectSlot', { label: this._getLabel(state.pendingId!) })}</span>
            <button
              type="button"
              class="pending-cancel"
              aria-label=${this.i18n.t('associate.cancel')}
              @click=${(e: Event) => { e.stopPropagation(); this._cancelPending(); }}
            >×</button>
          </div>
        ` : nothing}
        ${state.containers.map((container, i) => html`
          <div class="associables-container">
            <div
              class="drop-slot ${container.left !== null ? 'filled' : hasPending ? 'droppable' : ''}"
              @click=${container.left === null ? (e: Event) => this._placeInSlot(i, 'left', e) : nothing}
            >
              ${container.left !== null
                ? html`<span>${this._getLabel(container.left)}</span><button type="button" class="slot-remove" @click=${(e: Event) => this._clearSlot(i, 'left', e)}>×</button>`
                : html`<span>${this.i18n.t('associate.dropHere')}</span>`
              }
            </div>
            <span class="slot-arrow">↔</span>
            <div
              class="drop-slot ${container.right !== null ? 'filled' : hasPending ? 'droppable' : ''}"
              @click=${container.right === null ? (e: Event) => this._placeInSlot(i, 'right', e) : nothing}
            >
              ${container.right !== null
                ? html`<span>${this._getLabel(container.right)}</span><button type="button" class="slot-remove" @click=${(e: Event) => this._clearSlot(i, 'right', e)}>×</button>`
                : html`<span>${this.i18n.t('associate.dropHere')}</span>`
              }
            </div>
          </div>
        `)}
      </div>
    `;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      // Skip re-parsing when the attribute change was triggered by our own _emitChange
      if (this.correctResponse !== this._lastEmittedResponse) {
        this._syncStateFromCorrectResponse();
        this._triggerRender();
      }
    }
  }

  override render() {
    void this._renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <slot @slotchange=${this._onSlotChange}></slot>
      ${this._setupDone ? this._renderDropContainer() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'associate-pair-change': CustomEvent<AssociatePairChangeDetail>;
  }
}

if (!customElements.get('qti-associate-interaction')) {
  customElements.define('qti-associate-interaction', QtiAssociateInteractionEdit);
}

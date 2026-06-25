import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import nativeStyle from '@qti-components/associate-interaction/styles';

import { PendingSelectionController, renderEditChip } from '../../../shared';
import { Interaction } from '../../../shared/components/interaction.js';
import styles from './qti-associate-interaction.styles.js';

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
  containers: SlotContainer[];
}

const associateStates = new Map<string, AssociateState>();

function getState(key: string): AssociateState {
  if (!associateStates.has(key)) {
    associateStates.set(key, { containers: [{ left: null, right: null }] });
  }
  return associateStates.get(key)!;
}

function stateToPairs(containers: SlotContainer[]): AssociatePair[] {
  return containers.filter(c => c.left !== null && c.right !== null).map(c => [c.left!, c.right!]);
}

/**
 * Editor component for qti-associate-interaction.
 * Choices are shown in a pool; click a choice then click a drop slot to form a pair.
 */
export class QtiAssociateInteractionEdit extends Interaction {
  static override styles = [nativeStyle, styles];

  public internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

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
  private _lastEmittedResponse: string | null = null;

  private readonly _selection = new PendingSelectionController(this, {
    resolveSource: el => {
      if (el.tagName !== 'QTI-SIMPLE-ASSOCIABLE-CHOICE') return null;
      const identifier = el.getAttribute('identifier');
      return identifier ? { element: el, identifier } : null;
    },
    resolveTarget: el => {
      const slot = el.dataset?.dropSlot;
      if (!slot) return null;
      return { element: el, identifier: slot };
    },
    onCommit: (sourceId, target) => {
      const slot = target.identifier;
      if (!slot) return;
      const [indexRaw, side] = slot.split(':');
      const containerIndex = Number(indexRaw);
      if (!Number.isFinite(containerIndex) || (side !== 'left' && side !== 'right')) return;
      this._placeIntoSlot(containerIndex, side, sourceId);
    },
    // Mirror pending state onto the interaction host so CSS can pulse empty
    // drop slots via `:state(pending) ::part(drop-list):not(:has(qti-fake-drag))`.
    onPendingChanged: pending => {
      if (pending != null) this.internals.states.add('pending');
      else this.internals.states.delete('pending');
    },
  });

  private get _state(): AssociateState {
    return getState(this._getInteractionKey());
  }

  override connectedCallback() {
    super.connectedCallback();
    this._syncStateFromCorrectResponse();
    requestAnimationFrame(() => this._trySetup());
    void this._selection;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
    this._setupDone = false;
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
    this._setupMutationObserver();
    this._triggerRender();
  }

  private _setupMutationObserver() {
    this._observer = new MutationObserver(() => {
      this._buildLabelCache();
      this.requestUpdate();
    });
    this._observeMutations();
  }

  private _observeMutations() {
    this._observer?.observe(this, { childList: true, subtree: true, characterData: true });
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
        state.containers = [...valid.map(([l, r]) => ({ left: l, right: r })), { left: null, right: null }];
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

    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        detail: {
          nodeType: 'qtiAssociateInteraction',
          tagName: 'qti-associate-interaction',
          attrs: { correctResponse: this._lastEmittedResponse }
        },
        bubbles: true,
        composed: true
      })
    );

    this.dispatchEvent(
      new CustomEvent<AssociatePairChangeDetail>('associate-pair-change', {
        detail: { pairs },
        bubbles: true,
        composed: true
      })
    );
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

  private _placeIntoSlot(containerIndex: number, side: 'left' | 'right', sourceId: string) {
    const state = this._state;
    const container = state.containers[containerIndex];
    if (!container) return;
    if (container[side] !== null) return;

    // Remove sourceId from any existing slot so each choice appears at most once
    for (const c of state.containers) {
      if (c.left === sourceId) c.left = null;
      if (c.right === sourceId) c.right = null;
    }

    container[side] = sourceId;
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

  // ─── Render ─────────────────────────────────────────────────────────────

  private _renderDropContainer() {
    const state = this._state;

    return html`
      <div class="drop-container">
        ${state.containers.map(
          (container, i) => html`
            <div part="associables-container">
              <div
                part="drop-list"
                class="dl"
                data-drop-slot=${container.left === null ? `${i}:left` : nothing}
              >
                ${container.left !== null
                  ? renderEditChip(this._getLabel(container.left), container.left, e => this._clearSlot(i, 'left', e))
                  : nothing}
              </div>
              <div
                part="drop-list"
                class="dl"
                data-drop-slot=${container.right === null ? `${i}:right` : nothing}
              >
                ${container.right !== null
                  ? renderEditChip(this._getLabel(container.right), container.right, e => this._clearSlot(i, 'right', e))
                  : nothing}
              </div>
            </div>
          `
        )}
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
      <slot part="associable-choices" @slotchange=${this._onSlotChange}></slot>
      ${this._setupDone ? this._renderDropContainer() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'associate-pair-change': CustomEvent<AssociatePairChangeDetail>;
  }
}

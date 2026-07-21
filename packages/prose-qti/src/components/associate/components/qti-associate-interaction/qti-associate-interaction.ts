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
 * Serialize the editor's pair state to the canonical `correct-response`
 * attribute value used across editor interactions: a comma-separated list of
 * space-separated identifier pairs, e.g. `"A P, C M, D L"`. Returns `null`
 * when no complete pairs exist so the schema can drop the attribute.
 */
function serializePairsToCorrectResponse(containers: SlotContainer[]): string | null {
  const pairs = stateToPairs(containers);
  if (pairs.length === 0) return null;
  return pairs.map(([l, r]) => `${l} ${r}`).join(', ');
}

/**
 * Parse the canonical `correct-response` attribute value (or the array form
 * the shared codec hands back when there are multiple entries) into the
 * editor's container shape. Falls back to JSON for backwards compatibility
 * with items authored before the comma format was canonicalised.
 */
function parsePairsFromCorrectResponse(raw: string | string[] | null | undefined): SlotContainer[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(splitPair).filter((c): c is SlotContainer => c !== null);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.startsWith('[')) {
    // Legacy JSON form: `[["A","P"], ...]` or `["A P", ...]`.
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map(entry => {
            if (Array.isArray(entry) && entry.length === 2 && entry[0] && entry[1]) {
              return { left: String(entry[0]), right: String(entry[1]) } satisfies SlotContainer;
            }
            if (typeof entry === 'string') return splitPair(entry);
            return null;
          })
          .filter((c): c is SlotContainer => c !== null);
      }
    } catch {
      /* fall through to plain comma split */
    }
  }
  return trimmed
    .split(',')
    .map(splitPair)
    .filter((c): c is SlotContainer => c !== null);
}

function splitPair(raw: string): SlotContainer | null {
  const [left, right] = raw.trim().split(/\s+/);
  if (!left || !right) return null;
  return { left, right };
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
    // drop slots via `:state(pending) ::part(drop):not(:has(qti-fake-drag))`.
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
    state.containers = parsePairsFromCorrectResponse(this.correctResponse);
    this._resizeContainersToMax();
  }

  /** Clamp `maxAssociations` to a minimum of 1 — the editor must always show
   *  at least one association slot. Authors can edit this via the attribute
   *  panel; we floor it at read time so a value < 1 in the XML still works. */
  private _effectiveMaxAssociations(): number {
    const raw = Number(this.maxAssociations);
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }

  /** Grow / shrink the containers array to exactly the maxAssociations count.
   *  Pre-filled pairs at the head are preserved; the tail is padded with empty
   *  slots. When shrinking, trailing empty slots go first, then any pairs that
   *  spill over the cap are dropped (the response is normalized in _emitChange). */
  private _resizeContainersToMax() {
    const state = this._state;
    const max = this._effectiveMaxAssociations();
    const current = state.containers;
    if (current.length > max) {
      // Prefer dropping empty containers when shrinking.
      const filled = current.filter(c => c.left !== null || c.right !== null);
      state.containers = filled.slice(0, max);
    }
    while (state.containers.length < max) {
      state.containers.push({ left: null, right: null });
    }
  }

  private _serializeCurrentPairs(): string | null {
    return serializePairsToCorrectResponse(this._state.containers);
  }

  private _syncStateFromCorrectResponse() {
    if (this.correctResponse === this._serializeCurrentPairs()) {
      return;
    }
    this._parseCorrectResponse();
  }

  private _emitChange() {
    const pairs = stateToPairs(this._state.containers);
    this._lastEmittedResponse = serializePairsToCorrectResponse(this._state.containers);

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
   * Resize containers to exactly the maxAssociations count: drop fully-empty
   * middle slots (so filled pairs collapse to the head), then re-pad with
   * empty trailing slots up to the cap.
   */
  private _normalizeContainers() {
    const state = this._state;
    state.containers = state.containers.filter(c => c.left !== null || c.right !== null);
    this._resizeContainersToMax();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private _renderDropContainer() {
    const state = this._state;

    return html`
      <div class="drop-container" part="drops">
        ${state.containers.map(
          (container, i) => html`
            <div part="drop-row">
              <div
                part="drop"
                class="dl"
                data-drop-slot=${container.left === null ? `${i}:left` : nothing}
              >
                ${container.left !== null
                  ? renderEditChip(this._getLabel(container.left), container.left, e => this._clearSlot(i, 'left', e))
                  : nothing}
              </div>
              <div
                part="drop"
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
    if (changedProperties.has('maxAssociations')) {
      const effective = this._effectiveMaxAssociations();
      // If the author wrote a value < 1, snap the attr back to 1 so the model
      // and the panel agree. emitChange runs after the resize so the persisted
      // correctResponse reflects any pairs we trimmed.
      if (this.maxAssociations !== effective) {
        this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
          detail: {
            nodeType: 'qtiAssociateInteraction',
            tagName: 'qti-associate-interaction',
            attrs: { maxAssociations: effective },
          },
          bubbles: true,
          composed: true,
        }));
      }
      this._resizeContainersToMax();
      this._emitChange();
      this._triggerRender();
    }
  }

  override render() {
    void this._renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <slot part="drags" @slotchange=${this._onSlotChange}></slot>
      ${this._setupDone ? this._renderDropContainer() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'associate-pair-change': CustomEvent<AssociatePairChangeDetail>;
  }
}

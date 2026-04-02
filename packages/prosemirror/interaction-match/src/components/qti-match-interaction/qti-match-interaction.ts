import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { QtiI18nController } from '@qti-editor/interaction-shared';

import styles, { LIGHT_DOM_STYLES } from './qti-match-interaction.styles.js';

/** Association pair: [sourceIdentifier, targetIdentifier] */
export type MatchAssociation = [string, string];

/**
 * Event detail for match association changes.
 */
export interface MatchAssociationChangeDetail {
  associations: MatchAssociation[];
}

/**
 * Module-level state to persist across component recreation.
 * Key is response-identifier.
 */
interface MatchState {
  pendingSourceId: string | null;
  associations: Map<string, string>; // sourceId → targetId
}

function randomHex(): string {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}

const matchStates = new Map<string, MatchState>();

function getState(key: string): MatchState {
  if (!matchStates.has(key)) {
    matchStates.set(key, { pendingSourceId: null, associations: new Map() });
  }
  return matchStates.get(key)!;
}

/**
 * Editor component for qti-match-interaction.
 * Renders two match sets side by side for creating associations.
 * Click source → click target to create a link.
 */
export class QtiMatchInteractionEdit extends Interaction {
  static override styles = styles;

  private readonly i18n = new QtiI18nController(this);

  @property({ type: Number, attribute: 'max-associations' })
  maxAssociations: number = 1;

  @property({ type: Number, attribute: 'min-associations' })
  minAssociations: number = 0;

  @property({ type: Boolean })
  shuffle: boolean = false;

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

  @property({ type: String, attribute: 'correct-response' })
  correctResponse: string | null = null;

  /** Trigger re-render when state changes */
  @state()
  private _renderTrigger = 0;

  @state()
  private _cursorInside = false;

  /** Track if setup is done */
  private _setupDone = false;

  /** Cache of choice labels */
  private _labelCache = new Map<string, string>();

  /** Per-association border colors (sourceId → hex color) */
  private _associationColors = new Map<string, string>();

  /** Observer for DOM changes (new items added) */
  private _observer: MutationObserver | null = null;

  /** Light DOM style element */
  private _lightDomStyle: HTMLStyleElement | null = null;

  private get _state(): MatchState {
    return getState(this._getInteractionKey());
  }

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
    document.addEventListener('selectionchange', this._onSelectionChange);
    requestAnimationFrame(() => {
      this._trySetup();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this._onSelectionChange);
    this.removeEventListener('click', this._onClick);
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
    // Also rebuild cache on slot changes
    if (this._setupDone) {
      this._buildLabelCache();
      this._triggerRender();
    }
  };

  private _trySetup() {
    if (this._setupDone) return;
    
    const matchSets = this.querySelectorAll('qti-simple-match-set');
    if (matchSets.length < 2) return;
    
    this._setupDone = true;
    this._buildLabelCache();
    this.addEventListener('click', this._onClick);
    document.addEventListener('keydown', this._onKeyDown);
    this._setupMutationObserver();
    this._triggerRender();
  }

  private _setupMutationObserver() {
    this._observer = new MutationObserver(() => {
      // Rebuild label cache when DOM changes (new items added/removed)
      this._buildLabelCache();
      this._triggerRender();
    });
    
    // Watch for changes to children (subtree to catch nested changes)
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private _parseCorrectResponse() {
    const state = this._state;
    state.associations.clear();
    if (!this.correctResponse) return;
    
    try {
      const pairs: MatchAssociation[] = JSON.parse(this.correctResponse);
      if (Array.isArray(pairs)) {
        for (const [sourceId, targetId] of pairs) {
          if (sourceId && targetId) {
            state.associations.set(sourceId, targetId);
          }
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  private _emitChange() {
    const associations = Array.from(this._state.associations.entries()) as MatchAssociation[];
    this.dispatchEvent(new CustomEvent<MatchAssociationChangeDetail>('match-association-change', {
      detail: { associations },
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

  private _getMatchSets(): [HTMLElement | null, HTMLElement | null] {
    const sets = this.querySelectorAll('qti-simple-match-set');
    return [sets[0] as HTMLElement | null, sets[1] as HTMLElement | null];
  }

  private _getSourceChoices(): HTMLElement[] {
    const [sourceSet] = this._getMatchSets();
    if (!sourceSet) return [];
    return Array.from(sourceSet.querySelectorAll('qti-simple-associable-choice'));
  }

  private _getTargetChoices(): HTMLElement[] {
    const [, targetSet] = this._getMatchSets();
    if (!targetSet) return [];
    return Array.from(targetSet.querySelectorAll('qti-simple-associable-choice'));
  }

  private _isInSourceSet(element: HTMLElement): boolean {
    const [sourceSet] = this._getMatchSets();
    return sourceSet?.contains(element) ?? false;
  }

  private _isInTargetSet(element: HTMLElement): boolean {
    const [, targetSet] = this._getMatchSets();
    return targetSet?.contains(element) ?? false;
  }

  private _buildLabelCache() {
    this._labelCache.clear();
    for (const choice of [...this._getSourceChoices(), ...this._getTargetChoices()]) {
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
    if (e.key === 'Escape' && this._state.pendingSourceId) {
      this._cancelPending();
    }
  };

  private _onClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const choiceIndex = path.findIndex(el =>
      el instanceof HTMLElement && el.tagName === 'QTI-SIMPLE-ASSOCIABLE-CHOICE'
    );
    if (choiceIndex < 0) return;
    const choice = path[choiceIndex] as HTMLElement;

    const identifier = choice.getAttribute('identifier');
    if (!identifier) return;

    e.stopPropagation();

    if (this._isInSourceSet(choice)) {
      this._handleSourceClick(identifier);
    } else if (this._isInTargetSet(choice)) {
      this._handleTargetClick(identifier);
    }
  };

  private _handleSourceClick(sourceId: string) {
    const state = this._state;
    if (state.pendingSourceId === sourceId) {
      state.pendingSourceId = null;
    } else {
      state.pendingSourceId = sourceId;
    }
    this._triggerRender();
  }

  private _handleTargetClick(targetId: string) {
    const state = this._state;
    if (!state.pendingSourceId) return;

    const sourceId = state.pendingSourceId;
    this._associationColors.set(sourceId, randomHex());
    state.associations.set(sourceId, targetId);
    state.pendingSourceId = null;
    this._emitChange();
    this._triggerRender();
    requestAnimationFrame(() => this._applyAssociationColors());
  }

  private _removeAssociation(sourceId: string) {
    this._associationColors.delete(sourceId);
    this._state.associations.delete(sourceId);
    this._emitChange();
    this._triggerRender();
    requestAnimationFrame(() => this._applyAssociationColors());
  }

  private _cancelPending() {
    this._state.pendingSourceId = null;
    this._triggerRender();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private _renderAssociationsPanel() {
    const state = this._state;
    const associations = Array.from(state.associations.entries());
    
    return html`
      <div class="associations-panel">
        <div class="associations-panel-title">${this.i18n.t('match.correctResponse')}</div>
        <div class="association-list">
          ${state.pendingSourceId ? html`
            <span class="pending-indicator">
              ${this.i18n.t('match.selectTargetFor', { label: this._getLabel(state.pendingSourceId) })}
              <button 
                type="button" 
                class="association-chip-remove" 
                aria-label=${this.i18n.t('match.cancel')}
                @click=${(e: Event) => { e.stopPropagation(); this._cancelPending(); }}
              >×</button>
            </span>
          ` : nothing}
          ${associations.length === 0 && !state.pendingSourceId ? html`
            <span class="no-associations">${this.i18n.t('match.noAssociations')}</span>
          ` : nothing}
          ${associations.map(([sourceId, targetId]) => {
            const color = this._associationColors.get(sourceId) ?? '';
            return html`
              <span class="association-chip" style=${color ? `border-color: ${color}` : ''}>
                <span>${this._getLabel(sourceId)}</span>
                <span class="association-chip-arrow">→</span>
                <span>${this._getLabel(targetId)}</span>
                <button
                  type="button"
                  class="association-chip-remove"
                  aria-label=${this.i18n.t('match.remove')}
                  @click=${(e: Event) => { e.stopPropagation(); this._removeAssociation(sourceId); }}
                >×</button>
              </span>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _applyAssociationColors() {
    const state = this._state;
    for (const choice of [...this._getSourceChoices(), ...this._getTargetChoices()]) {
      const id = choice.getAttribute('identifier');
      if (!id) continue;
      // Source choices are keyed by sourceId; targets by the sourceId that points to them
      const sourceColor = this._associationColors.get(id);
      const targetColor = (() => {
        for (const [srcId, tgtId] of state.associations) {
          if (tgtId === id) return this._associationColors.get(srcId);
        }
        return undefined;
      })();
      const color = sourceColor ?? targetColor ?? '';
      choice.style.setProperty('border', color ? `2px solid ${color}` : '');
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      this._parseCorrectResponse();
      this._triggerRender();
    }
  }

  override render() {
    // Force use of _renderTrigger to ensure re-render
    void this._renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <slot @slotchange=${this._onSlotChange}></slot>
      ${this._setupDone && this._cursorInside ? this._renderAssociationsPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'match-association-change': CustomEvent<MatchAssociationChangeDetail>;
  }
}

if (!customElements.get('qti-match-interaction')) {
  customElements.define('qti-match-interaction', QtiMatchInteractionEdit);
}

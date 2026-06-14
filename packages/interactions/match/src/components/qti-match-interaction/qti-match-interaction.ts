import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { InteractionPanel, QtiI18nController } from '@qti-editor/interaction-shared';

import styles, { LIGHT_DOM_STYLES } from './qti-match-interaction.styles.js';

import type { FakeDrag } from '@qti-editor/interaction-shared';

/** Association pair: [sourceIdentifier, targetIdentifier] */
export type MatchAssociation = [string, string];

/**
 * Event detail for match association changes.
 */
export interface MatchAssociationChangeDetail {
  associations: MatchAssociation[];
}

/**
 * Editor component for qti-match-interaction.
 * Renders two match sets side by side for creating associations.
 * Click source → click target to create a link.
 */
export class QtiMatchInteractionEdit extends InteractionPanel {
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

  /** Track if setup is done */
  private _setupDone = false;

  /** Cache of choice labels */
  private _labelCache = new Map<string, string>();

  /** Observer for DOM changes (new items added) */
  private _observer: MutationObserver | null = null;

  /** Light DOM style element */
  private _lightDomStyle: HTMLStyleElement | null = null;
  private _pendingSourceId: string | null = null;
  private _associations = new Map<string, string>();

  override connectedCallback() {
    super.connectedCallback();
    this._injectLightDomStyles();
    this._parseCorrectResponse();
    requestAnimationFrame(() => {
      this._trySetup();
    });
  }

  override disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('fake-drag-remove', this._onFakeDragRemove as EventListener);
    document.removeEventListener('keydown', this._onKeyDown);
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
    this.addEventListener('fake-drag-remove', this._onFakeDragRemove as EventListener);
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
    this._associations.clear();
    this._pendingSourceId = null;
    if (!this.correctResponse) return;

    try {
      // Same shape as qti-components: a JSON array of `"source target"` strings.
      const pairs: unknown = JSON.parse(this.correctResponse);
      if (Array.isArray(pairs)) {
        for (const pair of pairs) {
          if (typeof pair !== 'string') continue;
          const [sourceId, targetId] = pair.split(' ');
          if (sourceId && targetId) {
            this._associations.set(sourceId, targetId);
          }
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  private _emitChange() {
    const associations = Array.from(this._associations.entries()) as MatchAssociation[];
    // Serialize as qti-components does: `["source target", ...]`.
    const correctResponse =
      associations.length > 0
        ? JSON.stringify(associations.map(([source, target]) => `${source} ${target}`))
        : null;

    this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
      detail: {
        nodeType: 'qtiMatchInteraction',
        tagName: 'qti-match-interaction',
        attrs: { correctResponse },
      },
      bubbles: true,
      composed: true,
    }));

    this.dispatchEvent(new CustomEvent<MatchAssociationChangeDetail>('match-association-change', {
      detail: { associations },
      bubbles: true,
      composed: true
    }));
  }

  private _triggerRender() {
    this._renderTrigger++;
    this._syncFakeDrags();
  }

  /**
   * Push the assigned source choices into each target choice's drop slot as
   * non-interactive "fake drags", so the correct response resembles the live
   * student view. No DOM is moved — only the target's `fakeDrags` property.
   */
  private _syncFakeDrags() {
    if (!this._setupDone) return;
    for (const target of this._getTargetChoices()) {
      const targetId = target.getAttribute('identifier');
      const drags: FakeDrag[] = [];
      if (targetId) {
        for (const [sourceId, assignedTargetId] of this._associations) {
          if (assignedTargetId === targetId) {
            drags.push({ identifier: sourceId, label: this._getLabel(sourceId) });
          }
        }
      }
      (target as HTMLElement & { fakeDrags: FakeDrag[] }).fakeDrags = drags;
    }
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
    if (e.key === 'Escape' && this._pendingSourceId) {
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
    if (this._pendingSourceId === sourceId) {
      this._pendingSourceId = null;
    } else {
      this._pendingSourceId = sourceId;
    }
    this._triggerRender();
  }

  private _handleTargetClick(targetId: string) {
    if (!this._pendingSourceId) return;

    const sourceId = this._pendingSourceId;
    this._associations.set(sourceId, targetId);
    this._pendingSourceId = null;
    this._emitChange();
    this._triggerRender();
  }

  private _removeAssociation(sourceId: string) {
    this._associations.delete(sourceId);
    this._emitChange();
    this._triggerRender();
  }

  private _onFakeDragRemove = (e: CustomEvent<{ identifier: string }>) => {
    e.stopPropagation();
    const sourceId = e.detail?.identifier;
    if (sourceId) {
      this._removeAssociation(sourceId);
    }
  };

  private _cancelPending() {
    this._pendingSourceId = null;
    this._triggerRender();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private _renderAssociationsPanel() {
    const associations = Array.from(this._associations.entries());
    
    return html`
      <div class="associations-panel">
        <div class="associations-panel-title">${this.i18n.t('match.correctResponse')}</div>
        <div class="association-list">
          ${this._pendingSourceId ? html`
            <span class="pending-indicator">
              ${this.i18n.t('match.selectTargetFor', { label: this._getLabel(this._pendingSourceId) })}
              <button 
                type="button" 
                class="association-chip-remove" 
                aria-label=${this.i18n.t('match.cancel')}
                @click=${(e: Event) => { e.stopPropagation(); this._cancelPending(); }}
              >×</button>
            </span>
          ` : nothing}
          ${associations.length === 0 && !this._pendingSourceId ? html`
            <span class="no-associations">${this.i18n.t('match.noAssociations')}</span>
          ` : nothing}
          ${associations.map(([sourceId, targetId]) => html`
            <span class="association-chip">
              <span>${this._getLabel(sourceId)}</span>
              <span class="association-chip-arrow">→</span>
              <span><strong>${this._getLabel(targetId)}</strong></span>
              <button
                type="button"
                class="association-chip-remove"
                aria-label=${this.i18n.t('match.remove')}
                @click=${(e: Event) => { e.stopPropagation(); this._removeAssociation(sourceId); }}
              >×</button>
            </span>
          `)}
        </div>
      </div>
    `;
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
      ${this._setupDone && this._panelOpen ? this._renderAssociationsPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'match-association-change': CustomEvent<MatchAssociationChangeDetail>;
  }
}

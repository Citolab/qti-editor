import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { Interaction } from '@qti-editor/interaction-shared/components/interaction.js';
import { QtiI18nController } from '@qti-editor/interaction-shared';

import styles from './qti-gap-match-interaction.styles.js';

export type GapAssociation = [string, string];

export interface GapAssociationChangeDetail {
  associations: GapAssociation[];
}

interface GapMatchState {
  pendingTextId: string | null;
  associations: Map<string, string>;
}

const gapMatchStates = new Map<string, GapMatchState>();

function getState(key: string): GapMatchState {
  if (!gapMatchStates.has(key)) {
    gapMatchStates.set(key, { pendingTextId: null, associations: new Map() });
  }
  return gapMatchStates.get(key)!;
}

export class QtiGapMatchInteractionEdit extends Interaction {
  static override styles = styles;

  private readonly i18n = new QtiI18nController(this);

  @property({ type: Number, attribute: 'max-associations' })
  maxAssociations = 1;

  @property({ type: Number, attribute: 'min-associations' })
  minAssociations = 0;

  @property({ type: Boolean })
  shuffle = false;

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

  @property({ type: String, attribute: 'correct-response' })
  override correctResponse: string | null = null;

  @state()
  private renderTrigger = 0;

  @state()
  private cursorInside = false;

  private labelCache = new Map<string, string>();
  private observer: MutationObserver | null = null;
  private lastEmittedResponse: string | null = null;

  private get interactionKey(): string {
    return this.responseIdentifier || this.getAttribute('response-identifier') || 'default';
  }

  private get interactionState(): GapMatchState {
    return getState(this.interactionKey);
  }

  private onSelectionChange = () => {
    const sel = document.getSelection();
    const inside = sel ? this.contains(sel.anchorNode) : false;
    if (inside !== this.cursorInside) {
      this.cursorInside = inside;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.parseCorrectResponse();
    this.buildLabelCache();
    this.applyVisualState();
    this.addEventListener('click', this.onClick);
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.observer = new MutationObserver(() => {
      this.buildLabelCache();
      this.applyVisualState();
      this.forceRender();
    });
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    document.removeEventListener('selectionchange', this.onSelectionChange);
    this.observer?.disconnect();
    this.observer = null;
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      if (this.correctResponse !== this.lastEmittedResponse) {
        this.parseCorrectResponse();
        this.applyVisualState();
        this.forceRender();
      }
    }
  }

  private getGapTexts(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-gap-text'));
  }

  private getGaps(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-gap'));
  }

  private buildLabelCache() {
    this.labelCache.clear();
    for (const gapText of this.getGapTexts()) {
      const id = gapText.getAttribute('identifier');
      if (!id) continue;
      this.labelCache.set(id, gapText.textContent?.trim() || id);
    }
  }

  private getLabel(identifier: string): string {
    return this.labelCache.get(identifier) ?? identifier;
  }

  private parseCorrectResponse() {
    const state = this.interactionState;
    state.associations.clear();
    if (!this.correctResponse) return;

    try {
      const parsed = JSON.parse(this.correctResponse) as GapAssociation[];
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [textId, gapId] = entry;
        if (textId && gapId) state.associations.set(gapId, textId);
      }
    } catch {
      // Ignore invalid persisted values and keep the editor interactive.
    }
  }

  private emitChange() {
    const associations = Array.from(this.interactionState.associations.entries()).map(
      ([gapId, textId]) => [textId, gapId] as GapAssociation,
    );
    this.lastEmittedResponse = associations.length > 0 ? JSON.stringify(associations) : null;
    this.dispatchEvent(new CustomEvent<GapAssociationChangeDetail>('gap-association-change', {
      detail: { associations },
      bubbles: true,
      composed: true,
    }));
  }

  private forceRender() {
    this.renderTrigger++;
  }

  private getTextMatchMax(textId: string): number {
    const element = this.getGapTexts().find(node => node.getAttribute('identifier') === textId);
    const raw = element?.getAttribute('match-max');
    const value = raw ? Number(raw) : 1;
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private countTextUsage(textId: string): number {
    let count = 0;
    for (const assignedTextId of this.interactionState.associations.values()) {
      if (assignedTextId === textId) count++;
    }
    return count;
  }

  private clearTextAssignments(textId: string) {
    for (const [gapId, assignedTextId] of Array.from(this.interactionState.associations.entries())) {
      if (assignedTextId === textId) {
        this.interactionState.associations.delete(gapId);
      }
    }
  }

  private onClick = (event: MouseEvent) => {
    const path = event.composedPath();
    const gapText = path.find(node => node instanceof HTMLElement && node.tagName === 'QTI-GAP-TEXT') as HTMLElement | undefined;
    if (gapText) {
      const textId = gapText.getAttribute('identifier');
      if (!textId) return;
      event.stopPropagation();
      this.handleGapTextClick(textId);
      return;
    }

    const gap = path.find(node => node instanceof HTMLElement && node.tagName === 'QTI-GAP') as HTMLElement | undefined;
    if (gap) {
      const gapId = gap.getAttribute('identifier');
      if (!gapId) return;
      event.stopPropagation();
      this.handleGapClick(gapId);
    }
  };

  private handleGapTextClick(textId: string) {
    const state = this.interactionState;
    state.pendingTextId = state.pendingTextId === textId ? null : textId;
    this.applyVisualState();
    this.forceRender();
  }

  private handleGapClick(gapId: string) {
    const state = this.interactionState;
    if (!state.pendingTextId) {
      if (state.associations.has(gapId)) {
        state.associations.delete(gapId);
        this.emitChange();
        this.applyVisualState();
        this.forceRender();
      }
      return;
    }

    const textId = state.pendingTextId;
    const limit = this.getTextMatchMax(textId);
    if (limit <= 1) {
      this.clearTextAssignments(textId);
    } else if (this.countTextUsage(textId) >= limit && state.associations.get(gapId) !== textId) {
      state.pendingTextId = null;
      this.applyVisualState();
      this.forceRender();
      return;
    }

    state.associations.set(gapId, textId);
    state.pendingTextId = null;
    this.emitChange();
    this.applyVisualState();
    this.forceRender();
  }

  private applyVisualState() {
    const state = this.interactionState;
    for (const gapText of this.getGapTexts()) {
      const textId = gapText.getAttribute('identifier');
      if (!textId) continue;
      const usage = this.countTextUsage(textId);
      const limit = this.getTextMatchMax(textId);
      gapText.toggleAttribute('data-selected', state.pendingTextId === textId);
      gapText.toggleAttribute('data-linked', usage > 0);
      gapText.toggleAttribute('data-disabled', usage >= limit && state.pendingTextId !== textId);
    }

    for (const gap of this.getGaps()) {
      const gapId = gap.getAttribute('identifier');
      if (!gapId) continue;
      const assignedTextId = state.associations.get(gapId);
      if (assignedTextId) {
        gap.setAttribute('data-assigned-label', this.getLabel(assignedTextId));
      } else {
        gap.removeAttribute('data-assigned-label');
      }
      gap.toggleAttribute('data-filled', assignedTextId != null);
      gap.toggleAttribute('data-pending', state.pendingTextId != null && assignedTextId == null);
    }
  }

  private removeAssociation(gapId: string) {
    this.interactionState.associations.delete(gapId);
    this.emitChange();
    this.applyVisualState();
    this.forceRender();
  }

  private cancelPending() {
    this.interactionState.pendingTextId = null;
    this.applyVisualState();
    this.forceRender();
  }

  private renderAssociationsPanel() {
    const associations = Array.from(this.interactionState.associations.entries());

    return html`
      <div class="associations-panel">
        <div class="associations-panel-title">${this.i18n.t('gapMatch.correctResponse')}</div>
        <div class="association-list">
          ${this.interactionState.pendingTextId ? html`
            <span class="pending-indicator">
              ${this.i18n.t('gapMatch.selectGapFor', { label: this.getLabel(this.interactionState.pendingTextId) })}
              <button
                type="button"
                class="association-chip-remove"
                aria-label=${this.i18n.t('gapMatch.cancel')}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.cancelPending();
                }}
              >×</button>
            </span>
          ` : nothing}
          ${associations.length === 0 && !this.interactionState.pendingTextId ? html`
            <span class="no-associations">${this.i18n.t('gapMatch.noAssociations')}</span>
          ` : nothing}
          ${associations.map(([gapId, textId]) => html`
            <span class="association-chip">
              <span>${this.getLabel(textId)}</span>
              <span>→</span>
              <span>${gapId}</span>
              <button
                type="button"
                class="association-chip-remove"
                aria-label=${this.i18n.t('gapMatch.remove')}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.removeAssociation(gapId);
                }}
              >×</button>
            </span>
          `)}
        </div>
      </div>
    `;
  }

  override render() {
    void this.renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <div class="choices">
        <slot name="drags"></slot>
      </div>
      <div class="body">
        <slot></slot>
      </div>
      ${this.cursorInside ? this.renderAssociationsPanel() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'gap-association-change': CustomEvent<GapAssociationChangeDetail>;
  }
}

if (!customElements.get('qti-gap-match-interaction')) {
  customElements.define('qti-gap-match-interaction', QtiGapMatchInteractionEdit);
}

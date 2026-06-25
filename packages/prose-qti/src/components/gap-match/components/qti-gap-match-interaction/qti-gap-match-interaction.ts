import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { Interaction, PendingSelectionController } from '../../../shared';
import styles from './qti-gap-match-interaction.styles.js';

/** Idempotent helper — diffs state set operations. */
function toggleState(set: CustomStateSet, name: string, on: boolean): void {
  if (on) set.add(name);
  else set.delete(name);
}

/**
 * Iterate `"src tgt"` entries from the correct-response value. Accepts the
 * canonical comma-joined string, the codec's array form (returned by
 * `parseCorrectResponseAttribute` when there are multiple entries), and the
 * legacy JSON-array shape (`'["src tgt", ...]'`) authored before this commit.
 * Mirrors the helper in match-shared.ts so both interactions stay aligned.
 */
function* iterPairEntries(raw: string | string[] | null | undefined): Generator<string> {
  if (raw == null) return;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const t = typeof entry === 'string' ? entry.trim() : '';
      if (t) yield t;
    }
    return;
  }
  const trimmed = raw.trim();
  if (!trimmed) return;
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const t = typeof entry === 'string' ? entry.trim() : '';
          if (t) yield t;
        }
        return;
      }
    } catch {
      /* fall through */
    }
  }
  for (const entry of trimmed.split(',')) {
    const t = entry.trim();
    if (t) yield t;
  }
}

export type GapAssociation = [string, string];

export interface GapAssociationChangeDetail {
  associations: GapAssociation[];
}

/**
 * Editor component for qti-gap-match-interaction. Authoring is inline:
 * click a gap-text source → every empty `<qti-gap>` pulses red-dashed (via
 * `:state(pending)` on the gap host) → click a gap to commit. Click the ×
 * inside a filled gap's `<qti-fake-drag>` to clear it. Escape / outside
 * click cancels pending.
 *
 * Selection state lives in {@link PendingSelectionController}; this class
 * owns the association map, label cache, lightdom visual sync, and change
 * event emission.
 */
export class QtiGapMatchInteractionEdit extends Interaction {
  static override styles = styles;

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

  private labelCache = new Map<string, string>();
  private observer: MutationObserver | null = null;
  private lastEmittedResponse: string | null = null;
  private isApplyingVisualState = false;
  private isEmittingChange = false;
  private associations = new Map<string, string>();

  private readonly selection = new PendingSelectionController(this, {
    resolveSource: el => {
      if (el.tagName !== 'QTI-GAP-TEXT') return null;
      const identifier = el.getAttribute('identifier');
      return identifier ? { element: el, identifier } : null;
    },
    resolveTarget: el => {
      if (el.tagName !== 'QTI-GAP') return null;
      const identifier = el.getAttribute('identifier');
      return identifier ? { element: el, identifier } : null;
    },
    onCommit: (textId, target) => {
      const gapId = target.identifier;
      if (!gapId) return;
      this.commitAssociation(textId, gapId);
    },
    onPendingChanged: () => this.applyVisualState(),
  });

  override connectedCallback(): void {
    super.connectedCallback();
    this.parseCorrectResponse();
    this.buildLabelCache();
    this.applyVisualState();
    this.addEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
    void this.selection;

    // Watch for text content changes in gap-text elements so labels stay live.
    this.observer = new MutationObserver(mutations => {
      if (this.isApplyingVisualState) return;
      const touchedGapText = mutations.some(mutation => {
        let node: Node | null = mutation.target;
        while (node && node !== this) {
          if (node instanceof HTMLElement && node.tagName === 'QTI-GAP-TEXT') return true;
          node = node.parentNode;
        }
        return false;
      });
      if (touchedGapText) {
        this.buildLabelCache();
        this.applyVisualState();
      }
    });
    this.observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    this.removeEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
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
      }
    }
  }

  private getGapTexts(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-gap-text')) as HTMLElement[];
  }

  private getGaps(): HTMLElement[] {
    return Array.from(this.querySelectorAll('qti-gap')) as HTMLElement[];
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
    this.associations.clear();
    this.selection.cancel();
    for (const entry of iterPairEntries(this.correctResponse)) {
      const [textId, gapId] = entry.split(/\s+/);
      if (textId && gapId) this.associations.set(gapId, textId);
    }
  }

  private emitChange() {
    if (this.isEmittingChange) return;

    const associations = Array.from(this.associations.entries()).map(
      ([gapId, textId]) => [textId, gapId] as GapAssociation,
    );
    // Canonical comma-joined `"gapText gap"` entries — same shared codec
    // format associate / match / order use. Composer reads this via
    // parseCorrectResponseAttribute and emits one <qti-value> per entry.
    this.lastEmittedResponse =
      associations.length > 0
        ? associations.map(([textId, gapId]) => `${textId} ${gapId}`).join(',')
        : null;

    // Defer the event dispatch to avoid re-entrancy during click handling.
    this.isEmittingChange = true;
    queueMicrotask(() => {
      this.isEmittingChange = false;
      this.dispatchEvent(
        new CustomEvent('qti-prosemirror-node-attrs-change', {
          detail: {
            nodeType: 'qtiGapMatchInteraction',
            tagName: 'qti-gap-match-interaction',
            attrs: { correctResponse: this.lastEmittedResponse },
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.dispatchEvent(
        new CustomEvent<GapAssociationChangeDetail>('gap-association-change', {
          detail: { associations },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  private getTextMatchMax(textId: string): number {
    const element = this.getGapTexts().find(node => node.getAttribute('identifier') === textId);
    const raw = element?.getAttribute('match-max');
    const value = raw ? Number(raw) : 1;
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private countTextUsage(textId: string): number {
    let count = 0;
    for (const assignedTextId of this.associations.values()) {
      if (assignedTextId === textId) count++;
    }
    return count;
  }

  private clearTextAssignments(textId: string) {
    for (const [gapId, assignedTextId] of Array.from(this.associations.entries())) {
      if (assignedTextId === textId) {
        this.associations.delete(gapId);
      }
    }
  }

  /** Called by the {@link PendingSelectionController} when a gap is clicked while a gap-text is pending. */
  private commitAssociation(textId: string, gapId: string) {
    const limit = this.getTextMatchMax(textId);
    if (limit <= 1) {
      this.clearTextAssignments(textId);
    } else if (this.countTextUsage(textId) >= limit && this.associations.get(gapId) !== textId) {
      this.applyVisualState();
      return;
    }
    this.associations.set(gapId, textId);
    this.emitChange();
    this.applyVisualState();
  }

  /**
   * Remove an association when the × button inside a filled gap's
   * `<qti-fake-drag>` is clicked. The button stops the native click event but
   * dispatches a composed `fake-drag-remove` CustomEvent that bubbles out of
   * the gap's shadow into the interaction host. We resolve the affected gap
   * from the event's composedPath (the chip lives inside it).
   *
   * Plain clicks on a filled gap are intentionally NOT a remove gesture —
   * that conflicted with PendingSelectionController's commit cycle (commit
   * fired first, then a plain-click remove undid it).
   */
  private onFakeDragRemove = (event: CustomEvent<{ identifier: string }>): void => {
    const gap = event
      .composedPath()
      .find(node => node instanceof HTMLElement && node.tagName === 'QTI-GAP') as HTMLElement | undefined;
    if (!gap) return;
    const gapId = gap.getAttribute('identifier');
    if (!gapId || !this.associations.has(gapId)) return;
    event.stopPropagation();
    this.associations.delete(gapId);
    this.emitChange();
    this.applyVisualState();
  };

  /**
   * Flush the current `associations` map + pending-source id into UI state
   * across the lightdom gap-text and gap elements. State is expressed via
   * `ElementInternals.states` (`:state(pending|filled|selected|linked|disabled)`)
   * — never via attributes — so editor-only state structurally can't leak
   * into serialized QTI XML. The one DOM attribute we still set is
   * `data-assigned-label` because it's content (the visible label of the
   * assigned gap-text inside the filled gap).
   */
  private applyVisualState() {
    if (this.isApplyingVisualState) return;
    this.isApplyingVisualState = true;

    try {
      const pendingTextId = this.selection.pendingSourceId;
      for (const gapText of this.getGapTexts()) {
        const textId = gapText.getAttribute('identifier');
        if (!textId) continue;
        const usage = this.countTextUsage(textId);
        const limit = this.getTextMatchMax(textId);
        const states = (gapText as HTMLElement & { internals?: ElementInternals }).internals?.states;
        if (!states) continue;
        // `:state(selected)` is owned by PendingSelectionController — don't
        // double-toggle it here. We still own `linked` and `disabled`.
        toggleState(states, 'linked', usage > 0);
        toggleState(states, 'disabled', usage >= limit && pendingTextId !== textId);
      }

      for (const gap of this.getGaps()) {
        const gapId = gap.getAttribute('identifier');
        if (!gapId) continue;
        const assignedTextId = this.associations.get(gapId);
        if (assignedTextId) {
          gap.setAttribute('data-assigned-label', this.getLabel(assignedTextId));
        } else {
          gap.removeAttribute('data-assigned-label');
        }
        const states = (gap as HTMLElement & { internals?: ElementInternals }).internals?.states;
        if (!states) continue;
        toggleState(states, 'filled', assignedTextId != null);
        toggleState(states, 'pending', pendingTextId != null && assignedTextId == null);
      }
    } finally {
      this.isApplyingVisualState = false;
    }
  }

  override render() {
    return html`
      <slot name="prompt"></slot>
      <div class="choices">
        <slot name="drags"></slot>
      </div>
      <div class="body">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'gap-association-change': CustomEvent<GapAssociationChangeDetail>;
  }
}

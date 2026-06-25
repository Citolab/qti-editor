import { html, type LitElement, type ReactiveController } from 'lit';

import { MATCH_SELECTING_TARGET_EVENT, PendingSelectionController } from '../../../shared';
import {
  getChoices,
  getMatchSets,
  parseCorrectResponseAsPairs,
  serializePairs,
  type MatchAssociation,
  type MatchAssociationChangeDetail,
} from './match-shared.js';

import type { FakeDrag, MatchSelectingTargetDetail } from '@citolab/prose-qti/components/shared';

export interface DragDropHost extends LitElement {
  correctResponse: string | string[] | null;
  emitNodeAttrsChange(detail: {
    nodeType: string;
    tagName: string;
    attrs: Record<string, unknown>;
  }): void;
  emitMatchAssociationChange(detail: MatchAssociationChangeDetail): void;
}

/**
 * Drag-drop (click-to-associate) mode controller. Owns:
 *  - the pending-source / associations state
 *  - the label cache (rebuilt on subtree changes — drag-drop legitimately needs
 *    `subtree:true` for this, unlike tabular mode)
 *  - the document-level keydown / pointerdown listeners for Escape and click-out
 *  - the fake-drag synchronization back into the target choices
 */
export class DragDropController implements ReactiveController {
  private host: DragDropHost;
  private observer: MutationObserver | null = null;
  private setupDone = false;

  private readonly selection: PendingSelectionController;
  /**
   * Internal state for both modes is now the same `Set<"src tgt">` shape used
   * by tabular mode. This guarantees a lossless round-trip when the mode
   * switches at runtime — the same correctResponse JSON renders identically.
   */
  private pairs = new Set<string>();
  private labelCache = new Map<string, string>();

  constructor(host: DragDropHost) {
    this.host = host;
    this.selection = new PendingSelectionController(host, {
      resolveSource: el => {
        if (el.tagName !== 'QTI-SIMPLE-ASSOCIABLE-CHOICE') return null;
        const [sourceSet] = getMatchSets(this.host);
        if (!sourceSet?.contains(el)) return null;
        const identifier = el.getAttribute('identifier');
        return identifier ? { element: el, identifier } : null;
      },
      resolveTarget: el => {
        if (el.tagName !== 'QTI-SIMPLE-ASSOCIABLE-CHOICE') return null;
        const [, targetSet] = getMatchSets(this.host);
        if (!targetSet?.contains(el)) return null;
        return { element: el, identifier: el.getAttribute('identifier') };
      },
      onCommit: (sourceId, target) => {
        if (target.identifier) this.commitPair(sourceId, target.identifier);
      },
      onPendingChanged: pending => {
        const [, targetSet] = getMatchSets(this.host);
        // 1. Cross-host event (kept for runtime-mode consumers).
        targetSet?.dispatchEvent(
          new CustomEvent<MatchSelectingTargetDetail>(MATCH_SELECTING_TARGET_EVENT, {
            detail: { active: pending != null },
          }),
        );
        // 2. `:state(pending)` on each target choice — drives the shared
        // `qti-simple-associable-choice:state(pending)` CSS rule.
        const active = pending != null;
        for (const target of getChoices(targetSet)) {
          const internals = (target as HTMLElement & { internals?: ElementInternals }).internals;
          if (!internals) continue;
          if (active) internals.states.add('pending');
          else internals.states.delete('pending');
        }
      },
    });
    host.addController(this);
  }

  hostConnected(): void {
    this.parseCorrectResponse();
    // Defer until first lightdom render is complete.
    requestAnimationFrame(() => this.trySetup());
  }

  hostDisconnected(): void {
    this.host.removeEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
    // Clear any lingering :state(pending|filled) on target choices so a
    // switch to tabular mode doesn't leave drag-drop's affordances behind.
    for (const target of getChoices(getMatchSets(this.host)[1])) {
      const internals = (target as HTMLElement & { internals?: ElementInternals }).internals;
      internals?.states.delete('pending');
      internals?.states.delete('filled');
    }
    this.observer?.disconnect();
    this.observer = null;
    this.setupDone = false;
  }

  /** Called from the host's updated(). slot.assign() is idempotent. */
  routeSlots(promptSlot: HTMLSlotElement | null, defaultSlot: HTMLSlotElement | null): void {
    const prompts = Array.from(this.host.querySelectorAll(':scope > qti-prompt')) as HTMLElement[];
    const matchSets = Array.from(
      this.host.querySelectorAll(':scope > qti-simple-match-set'),
    ) as HTMLElement[];
    promptSlot?.assign(...prompts);
    defaultSlot?.assign(...matchSets);
  }

  /** External trigger from the orchestrator (e.g. correctResponse changed). */
  rerender(): void {
    this.parseCorrectResponse();
    this.triggerRender();
  }

  // ─── Setup ──────────────────────────────────────────────────────────────

  private trySetup(): void {
    if (this.setupDone) return;
    const matchSets = this.host.querySelectorAll(':scope > qti-simple-match-set');
    if (matchSets.length < 2) return;

    this.setupDone = true;
    this.buildLabelCache();
    this.host.addEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
    this.setupMutationObserver();
    this.triggerRender();
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver(() => {
      this.buildLabelCache();
      this.triggerRender();
    });
    // Drag-drop mode does need subtree+characterData (label cache rebuilds on
    // any choice content change). This is NOT the chatty observer that caused
    // problems in tabular mode — it lives in drag-drop mode only.
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // ─── State sync ─────────────────────────────────────────────────────────

  private parseCorrectResponse(): void {
    const raw = this.host.correctResponse;
    const asStr = raw == null ? null : Array.isArray(raw) ? JSON.stringify(raw) : raw;
    this.pairs = parseCorrectResponseAsPairs(asStr);
    this.selection.cancel();
  }

  private emitChange(): void {
    const pairs = Array.from(this.pairs);
    const correctResponse = serializePairs(pairs);

    this.host.emitNodeAttrsChange({
      nodeType: 'qtiMatchInteraction',
      tagName: 'qti-match-interaction',
      attrs: { correctResponse },
    });

    const associations = pairs.map(pair => pair.split(' ', 2) as MatchAssociation);
    this.host.emitMatchAssociationChange({ associations });
  }

  private triggerRender(): void {
    this.host.requestUpdate();
    this.syncFakeDrags();
  }

  private syncFakeDrags(): void {
    if (!this.setupDone) return;
    for (const target of getChoices(getMatchSets(this.host)[1])) {
      const targetId = target.getAttribute('identifier');
      const drags: FakeDrag[] = [];
      if (targetId) {
        for (const pair of this.pairs) {
          const [sourceId, pairTargetId] = pair.split(' ');
          if (pairTargetId === targetId) {
            drags.push({ identifier: sourceId, label: this.labelCache.get(sourceId) ?? sourceId });
          }
        }
      }
      const typed = target as HTMLElement & {
        fakeDrags: FakeDrag[];
        internals?: ElementInternals;
      };
      typed.fakeDrags = drags;
      // Mirror filled state into the choice's internals so the shared
      // `:state(filled)` CSS rule applies uniformly with the other interactions.
      if (typed.internals) {
        if (drags.length > 0) typed.internals.states.add('filled');
        else typed.internals.states.delete('filled');
      }
    }
  }

  private buildLabelCache(): void {
    this.labelCache.clear();
    const [sourceSet, targetSet] = getMatchSets(this.host);
    for (const choice of [...getChoices(sourceSet), ...getChoices(targetSet)]) {
      const id = choice.getAttribute('identifier');
      if (id) {
        const clone = choice.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('qti-simple-associable-choice').forEach(el => el.remove());
        this.labelCache.set(id, clone.textContent?.trim() || id);
      }
    }
  }

  // ─── Interaction ────────────────────────────────────────────────────────

  /**
   * Called by the {@link PendingSelectionController} when the user clicks a
   * drop target while a source is pending. Respects the source choice's
   * `match-max` (1 = single target per source, anything else = multiple).
   */
  private commitPair(sourceId: string, targetId: string): void {
    const matchMax = this.getSourceMatchMax(sourceId);
    if (matchMax === 1) {
      for (const pair of Array.from(this.pairs)) {
        if (pair.startsWith(`${sourceId} `)) this.pairs.delete(pair);
      }
    }
    this.pairs.add(`${sourceId} ${targetId}`);
    this.emitChange();
    this.triggerRender();
  }

  /** Remove the (source, target) pair represented by the clicked fake-drag chip. */
  private removeAssociation(sourceId: string, targetId: string | null): void {
    if (targetId == null) {
      // Fallback to legacy behavior (no target known) — delete all pairs
      // starting with this source.
      for (const pair of Array.from(this.pairs)) {
        if (pair.startsWith(`${sourceId} `)) this.pairs.delete(pair);
      }
    } else {
      this.pairs.delete(`${sourceId} ${targetId}`);
    }
    this.emitChange();
    this.triggerRender();
  }

  private onFakeDragRemove = (e: CustomEvent<{ identifier: string }>): void => {
    e.stopPropagation();
    const sourceId = e.detail?.identifier;
    if (!sourceId) return;
    // The chip lives inside the TARGET choice — find that target via the event path.
    const target = e.composedPath().find(
      n => n instanceof HTMLElement && n.tagName === 'QTI-SIMPLE-ASSOCIABLE-CHOICE',
    ) as HTMLElement | undefined;
    const targetId = target?.getAttribute('identifier') ?? null;
    this.removeAssociation(sourceId, targetId);
  };

  private getSourceMatchMax(sourceId: string): number {
    const [sourceSet] = getMatchSets(this.host);
    const choice = sourceSet?.querySelector<HTMLElement>(
      `qti-simple-associable-choice[identifier="${CSS.escape(sourceId)}"]`,
    );
    const raw = choice?.getAttribute('match-max');
    if (raw == null) return 1;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 1;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  render() {
    return html`
      <slot name="prompt"></slot>
      <slot></slot>
    `;
  }
}

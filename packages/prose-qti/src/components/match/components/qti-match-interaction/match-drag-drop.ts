import { html, type LitElement, type ReactiveController } from 'lit';

import { MATCH_SELECTING_TARGET_EVENT } from '../../../shared';
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

  private pendingSourceId: string | null = null;
  /**
   * Internal state for both modes is now the same `Set<"src tgt">` shape used
   * by tabular mode. This guarantees a lossless round-trip when the mode
   * switches at runtime — the same correctResponse JSON renders identically.
   */
  private pairs = new Set<string>();
  private labelCache = new Map<string, string>();

  constructor(host: DragDropHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.parseCorrectResponse();
    // Defer until first lightdom render is complete.
    requestAnimationFrame(() => this.trySetup());
  }

  hostDisconnected(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.removeEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
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
    this.host.addEventListener('click', this.onClick);
    this.host.addEventListener('fake-drag-remove', this.onFakeDragRemove as EventListener);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('pointerdown', this.onDocumentPointerDown);
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
    this.pendingSourceId = null;
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
    this.syncSelectingTarget();
  }

  private syncSelectingTarget(): void {
    const [, targetSet] = getMatchSets(this.host);
    if (!targetSet) return;
    targetSet.dispatchEvent(
      new CustomEvent<MatchSelectingTargetDetail>(MATCH_SELECTING_TARGET_EVENT, {
        detail: { active: this.pendingSourceId != null },
      }),
    );
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
      (target as HTMLElement & { fakeDrags: FakeDrag[] }).fakeDrags = drags;
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

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.pendingSourceId) this.cancelPending();
  };

  private onClick = (e: MouseEvent): void => {
    const path = e.composedPath();
    const choiceIdx = path.findIndex(
      el => el instanceof HTMLElement && el.tagName === 'QTI-SIMPLE-ASSOCIABLE-CHOICE',
    );
    if (choiceIdx < 0) return;
    const choice = path[choiceIdx] as HTMLElement;
    const identifier = choice.getAttribute('identifier');
    if (!identifier) return;

    e.stopPropagation();

    const [sourceSet, targetSet] = getMatchSets(this.host);
    if (sourceSet?.contains(choice)) this.handleSourceClick(identifier);
    else if (targetSet?.contains(choice)) this.handleTargetClick(identifier);
  };

  private handleSourceClick(sourceId: string): void {
    this.pendingSourceId = this.pendingSourceId === sourceId ? null : sourceId;
    this.triggerRender();
  }

  private handleTargetClick(targetId: string): void {
    if (!this.pendingSourceId) return;
    const sourceId = this.pendingSourceId;

    // Respect the source choice's `match-max` (1 = single target per source,
    // anything else = multiple allowed). When matchMax === 1, replace any
    // existing pair starting with this source.
    const matchMax = this.getSourceMatchMax(sourceId);
    if (matchMax === 1) {
      for (const pair of Array.from(this.pairs)) {
        if (pair.startsWith(`${sourceId} `)) this.pairs.delete(pair);
      }
    }
    this.pairs.add(`${sourceId} ${targetId}`);
    this.pendingSourceId = null;
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

  private cancelPending(): void {
    this.pendingSourceId = null;
    this.triggerRender();
  }

  private onDocumentPointerDown = (e: PointerEvent): void => {
    if (!this.pendingSourceId) return;
    if (e.composedPath().includes(this.host)) return;
    this.cancelPending();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  render() {
    return html`
      <slot name="prompt"></slot>
      <slot></slot>
    `;
  }
}

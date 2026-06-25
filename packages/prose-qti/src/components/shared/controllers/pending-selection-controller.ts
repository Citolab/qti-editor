import type { LitElement, ReactiveController } from 'lit';

/**
 * Hooks the host provides to the controller. Every callback receives the
 * resolved DOM element (and its `identifier` attribute when the controller
 * has already extracted it) — hosts decide partitioning and commit semantics.
 */
export interface PendingSelectionHooks {
  /**
   * Walked from the click target outward — return the source element if this
   * node (or one of its ancestors) is a drag source for this interaction.
   * Return null to keep walking; the controller stops at the host.
   */
  resolveSource(el: HTMLElement): { element: HTMLElement; identifier: string } | null;

  /**
   * Walked from the click target outward — return the target element if this
   * node (or one of its ancestors) is a drop target for this interaction.
   * Return null to keep walking; the controller stops at the host.
   */
  resolveTarget(el: HTMLElement): { element: HTMLElement; identifier: string | null } | null;

  /**
   * Called when a target was clicked while a source was pending. Hosts apply
   * their own storage update + emit change events; the controller has already
   * cleared `pendingSourceId` by the time this runs.
   */
  onCommit(sourceId: string, target: { element: HTMLElement; identifier: string | null }): void;

  /**
   * Optional notification — fires whenever `pendingSourceId` changes (after
   * the controller has called `host.requestUpdate()`). Useful for hosts that
   * need to dispatch a cross-host signal (e.g. match's
   * `MATCH_SELECTING_TARGET_EVENT` to its target match-set).
   */
  onPendingChanged?(pendingSourceId: string | null): void;
}

/**
 * Shared click-to-associate selection state for match-style interactions.
 * Owns the pending-source state, the host-level click delegator, and the
 * document-level keydown (Escape) + pointerdown (click-out) listeners that
 * cancel a pending selection. Hosts plug in partitioning and commit logic
 * via {@link PendingSelectionHooks}.
 *
 * Pattern in use by qti-match-interaction (drag-drop mode), qti-associate-
 * interaction, qti-order-interaction, and qti-gap-match-interaction.
 */
export class PendingSelectionController implements ReactiveController {
  private readonly host: LitElement;
  private readonly hooks: PendingSelectionHooks;
  private _pendingSourceId: string | null = null;
  /** Remembered so we can toggle `:state(selected)` off when pending clears. */
  private _pendingSourceEl: HTMLElement | null = null;

  constructor(host: LitElement, hooks: PendingSelectionHooks) {
    this.host = host;
    this.hooks = hooks;
    host.addController(this);
  }

  get pendingSourceId(): string | null {
    return this._pendingSourceId;
  }

  hostConnected(): void {
    this.host.addEventListener('click', this.onHostClick);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('pointerdown', this.onDocumentPointerDown);
  }

  hostDisconnected(): void {
    this.host.removeEventListener('click', this.onHostClick);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
    this.toggleSelectedState(null);
  }

  /** Explicitly cancel a pending selection (e.g. after correctResponse parse). */
  cancel(): void {
    this.setPending(null, null);
  }

  private setPending(id: string | null, el: HTMLElement | null): void {
    if (this._pendingSourceId === id) return;
    this.toggleSelectedState(el);
    this._pendingSourceId = id;
    this._pendingSourceEl = id == null ? null : el;
    this.host.requestUpdate();
    this.hooks.onPendingChanged?.(id);
  }

  /**
   * Mirror the pending-source identity into the source element's
   * `internals.states` as `:state(selected)`. Apply the toggle BEFORE
   * mutating internal fields so we always have the right "previous" element
   * to clear. Idempotent across interactions: any source whose host CE has
   * an `internals: ElementInternals` field participates uniformly.
   */
  private toggleSelectedState(nextEl: HTMLElement | null): void {
    const prevEl = this._pendingSourceEl;
    if (prevEl && prevEl !== nextEl) {
      const internals = (prevEl as HTMLElement & { internals?: ElementInternals }).internals;
      internals?.states.delete('selected');
    }
    if (nextEl) {
      const internals = (nextEl as HTMLElement & { internals?: ElementInternals }).internals;
      internals?.states.add('selected');
    }
  }

  private onHostClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    for (const node of path) {
      if (node === this.host) break;
      if (!(node instanceof HTMLElement)) continue;

      const target = this.hooks.resolveTarget(node);
      if (target) {
        if (this._pendingSourceId == null) return;
        event.stopPropagation();
        const sourceId = this._pendingSourceId;
        this.setPending(null, null);
        this.hooks.onCommit(sourceId, target);
        return;
      }

      const source = this.hooks.resolveSource(node);
      if (source) {
        event.stopPropagation();
        const toggleOff = this._pendingSourceId === source.identifier;
        this.setPending(toggleOff ? null : source.identifier, toggleOff ? null : source.element);
        return;
      }
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._pendingSourceId != null) {
      event.preventDefault();
      this.setPending(null, null);
    }
  };

  private onDocumentPointerDown = (event: PointerEvent): void => {
    if (this._pendingSourceId == null) return;
    if (event.composedPath().includes(this.host)) return;
    this.setPending(null, null);
  };
}

import { LitElement, nothing, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';

import { Interaction } from '../../../shared';
import { DragDropController, type DragDropHost } from './match-drag-drop.js';
import { classHasTabular, type MatchAssociationChangeDetail, type TabularMatchAssociationChangeDetail } from './match-shared.js';
import { TabularController, tabularStyles, type TabularHost } from './match-tabular.js';
import hostBaseStyles from './qti-match-interaction.styles.js';

/**
 * One element, two modes:
 *  - `<qti-match-interaction>`                          → click-to-associate (drag-drop controller)
 *  - `<qti-match-interaction class="qti-match-tabular">` → matrix of checkboxes (tabular controller)
 *
 * The active controller is swapped at runtime whenever the `class` attribute
 * gains/loses `qti-match-tabular`. Each controller owns its own observers,
 * listeners, and shadow render template; the orchestrator just routes.
 */
export class QtiMatchInteractionEdit extends Interaction implements TabularHost, DragDropHost {
  static override styles = [hostBaseStyles, tabularStyles];

  /**
   * Manual slot assignment — the tabular controller routes match-sets to named
   * slots; the drag-drop controller routes them to the default slot. Either
   * way, we never write `slot=""` onto PM's lightdom.
   *
   * `shadowRootOptions` (not a `createRenderRoot()` override) so Lit's default
   * `createRenderRoot()` still adopts our static styles — lesson banked from
   * the earlier silent-styles bug.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  /** Reactive class attribute — triggers willUpdate when toggled. */
  @property({ attribute: 'class' }) classes: string | null = null;

  // Shared (used by both modes)
  @property({ attribute: 'data-first-column-header' }) dataFirstColumnHeader: string | null = null;

  // (`correctResponse` + `responseIdentifier` come from the Interaction base.)

  @query('slot[name="prompt"]') private promptSlot!: HTMLSlotElement;
  @query('slot[name="match-rows"]') private rowsSlot!: HTMLSlotElement;
  @query('slot[name="match-cols"]') private colsSlot!: HTMLSlotElement;
  @query('slot:not([name])') private defaultSlot!: HTMLSlotElement;

  private tabular?: TabularController;
  private dragDrop?: DragDropController;
  private currentMode: 'tabular' | 'drag-drop' | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.applyMode(this.isTabular() ? 'tabular' : 'drag-drop');
  }

  override disconnectedCallback(): void {
    this.applyMode(null);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('classes')) {
      const wanted = this.isTabular() ? 'tabular' : 'drag-drop';
      if (wanted !== this.currentMode) this.applyMode(wanted);
    }
    if (changed.has('correctResponse' as keyof this)) {
      // Forward to the active controller so it can re-parse + re-render.
      this.tabular?.rerender();
      this.dragDrop?.rerender();
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this.currentMode === 'tabular') {
      this.tabular?.routeSlots(this.promptSlot, this.rowsSlot, this.colsSlot);
    } else if (this.currentMode === 'drag-drop') {
      this.dragDrop?.routeSlots(this.promptSlot, this.defaultSlot);
    }
  }

  private isTabular(): boolean {
    // Read live classList so the constructor's call (before any @property update)
    // picks up class="qti-match-tabular" written by ProseMirror's nodeView.
    return classHasTabular(this.classes) || this.classList.contains('qti-match-tabular');
  }

  private applyMode(next: 'tabular' | 'drag-drop' | null): void {
    if (next === this.currentMode) return;
    // Tear down current
    if (this.currentMode === 'tabular' && this.tabular) {
      this.removeController(this.tabular);
      this.tabular = undefined;
    } else if (this.currentMode === 'drag-drop' && this.dragDrop) {
      this.removeController(this.dragDrop);
      this.dragDrop = undefined;
    }
    this.currentMode = next;
    // Spin up next (constructor calls host.addController for us)
    if (next === 'tabular') this.tabular = new TabularController(this);
    else if (next === 'drag-drop') this.dragDrop = new DragDropController(this);
    // Force the new controller to re-read correctResponse from the host so its
    // visual state matches whatever the previous mode left behind. (rerender
    // is safe to call before render — it just re-parses + schedules update.)
    this.tabular?.rerender();
    this.dragDrop?.rerender();
    this.requestUpdate();
  }

  /** Called by the ProseMirror nodeView's update() hook (legacy method name). */
  rerender(): void {
    this.tabular?.rerender();
    this.dragDrop?.rerender();
  }

  // ─── Single entry point for both controllers' event dispatch ─────────────

  emitNodeAttrsChange(detail: {
    nodeType: string;
    tagName: string;
    attrs: Record<string, unknown>;
  }): void {
    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  emitTabularAssociationChange(detail: TabularMatchAssociationChangeDetail): void {
    this.dispatchEvent(
      new CustomEvent('tabular-match-association-change', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  emitMatchAssociationChange(detail: MatchAssociationChangeDetail): void {
    this.dispatchEvent(
      new CustomEvent('match-association-change', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  override render() {
    if (this.currentMode === 'tabular') return this.tabular?.render() ?? nothing;
    if (this.currentMode === 'drag-drop') return this.dragDrop?.render() ?? nothing;
    return nothing;
  }
}

declare global {
  interface HTMLElementEventMap {
    'match-association-change': CustomEvent<MatchAssociationChangeDetail>;
    'tabular-match-association-change': CustomEvent<TabularMatchAssociationChangeDetail>;
  }
  interface HTMLElementTagNameMap {
    'qti-match-interaction': QtiMatchInteractionEdit;
  }
}

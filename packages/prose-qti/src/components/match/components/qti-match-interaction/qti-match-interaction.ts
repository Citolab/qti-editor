import { ContextProvider } from '@lit/context';
import { LitElement, nothing, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';

import { correctionContext, Interaction, serializeCorrection } from '../../../shared';
import { DragDropController, type DragDropHost } from './match-drag-drop.js';
import { classHasTabular, getChoices, getMatchSets, labelOfChoice, type MatchAssociationChangeDetail, type TabularMatchAssociationChangeDetail } from './match-shared.js';
import { TabularController, tabularStyles, type TabularHost } from './match-tabular.js';
import hostBaseStyles from './qti-match-interaction.styles.js';

import type { CorrectionLink, CorrectionRole } from '../../../shared';

/**
 * One element, two modes:
 *  - `<qti-match-interaction>`                          → click-to-associate (drag-drop controller)
 *  - `<qti-match-interaction class="qti-match-tabular">` → matrix of checkboxes (tabular controller)
 *
 * The active controller is swapped at runtime whenever the `class` attribute
 * gains/loses `qti-match-tabular`. Each controller owns its own observers,
 * listeners, and shadow render template; the orchestrator just routes.
 *
 * @customElement qti-match-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `directedPair`.
 * @attr {string} class - Shared interaction vocabulary. `qti-match-tabular` switches this
 * element from click-to-associate to the checkbox matrix; the class is what selects the mode,
 * there is no separate attribute for it.
 * @attr {string} data-first-column-header - Editor-specific. Heading for the first column of
 * the tabular mode, above the source choices.
 * @attr {string} correct-response - Answer key held on the element while authoring. One `source
 * target` pair per association, space inside the pair and comma between pairs
 * (`left_druk right_pascal`). `source` is an identifier from the first `qti-simple-match-set`
 * and `target` from the second — the direction matters. Converted to and from
 * `qti-correct-response` on import/export.
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

  private readonly correction = new ContextProvider(this, { context: correctionContext });

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

  // ─── Correction state, published to the choices inside ───────────────────

  /**
   * Publish the correction state for whichever mode is active.
   *
   * The provider lives on the host rather than in a controller because the two modes are swapped at
   * runtime: a provider owned by the drag-drop controller would disappear the moment an author
   * ticked `qti-match-tabular`, and every choice would lose its subscription with it. The host
   * outlives both, so the controllers hand it their links and it does the publishing.
   *
   * Roles are decided here for the same reason they cannot be decided by the choices: a
   * `qti-simple-associable-choice` is a drag or a drop purely by which `qti-simple-match-set` it
   * sits in, and the sets are told apart by their order. Only this element can see that.
   */
  publishCorrection(links: readonly CorrectionLink[], pending: string | null): void {
    const [sourceSet, targetSet] = getMatchSets(this);
    const sources = getChoices(sourceSet);
    const targets = getChoices(targetSet);

    const roles = new Map<string, CorrectionRole>();
    const labels = new Map<string, string>();
    const limits = new Map<string, number>();

    for (const [choices, role] of [
      [sources, 'drag'],
      [targets, 'drop'],
    ] as const) {
      for (const choice of choices) {
        const identifier = choice.getAttribute('identifier');
        if (!identifier) continue;
        roles.set(identifier, role);
        labels.set(identifier, labelOfChoice(choice));
        const raw = choice.getAttribute('match-max');
        const limit = raw ? Number(raw) : 1;
        limits.set(identifier, Number.isFinite(limit) && limit >= 0 ? limit : 1);
      }
    }

    // Only prune once there is evidence the choices have rendered — see the same reasoning in
    // gap-match's `live`. Before ProseMirror attaches them every identifier looks missing.
    const present = roles.size > 0;
    const live = present
      ? links.filter(link => roles.get(link.drag) === 'drag' && roles.get(link.drop) === 'drop')
      : [...links];

    this.correction.setValue({
      links: live,
      roleOf: identifier => roles.get(identifier) ?? null,
      presentation: this.currentMode === 'tabular' ? 'matrix' : 'chips',
      dragsIn: drop => live.filter(link => link.drop === drop).map(link => link.drag),
      dropsOf: drag => live.filter(link => link.drag === drag).map(link => link.drop),
      labelOf: drag => labels.get(drag),
      limitOf: drag => limits.get(drag) ?? 1,
      pending,
    });

    // A pruned link named a choice that is no longer in the document, so the answer key has to lose
    // it too or it exports a `qti-correct-response` referring to something not in the item. Written
    // from here rather than from a controller because both modes can be the one that noticed, and
    // the controller only keeps its own copy in step — one writer for the document either way.
    if (live.length !== links.length) {
      this.emitNodeAttrsChange({
        nodeType: this.currentMode === 'tabular' ? 'qtiMatchInteractionTabular' : 'qtiMatchInteraction',
        tagName: 'qti-match-interaction',
        attrs: { correctResponse: serializeCorrection(live) },
      });
      this.dragDrop?.adoptLinks(live);
    }
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

import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';

import { DropzoneAutoSizeMixin } from '@qti-components/interactions-core';

import { correctionContext, Interaction, markChips, PendingSelectionController, renderEditChip } from '../../../shared';
import styles from './qti-order-interaction.styles.js';

import type { CorrectionLink, CorrectionRole } from '../../../shared';

/**
 * The drop slots are sized from the chips they will hold, by the SAME mixin the runtime uses.
 * `DropzoneAutoSizeMixin` measures the widest and tallest `qti-simple-choice` and publishes
 * `--qti-dropzone-min-width` / `--qti-dropzone-min-height`; upstream's stylesheet, already imported
 * here as `externalStyles`, reads them on `[part~='drop']`. Nothing in this file knows the numbers.
 *
 * The selectors differ from the mixin's defaults because the editor's markup does: the drops are
 * `<drop-list part="drop">` in this shadow root, and the drag container is a `<div part="drags">`
 * rather than upstream's `<slot part="drags">`.
 *
 * @customElement qti-order-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `identifier` and ordered
 * cardinality.
 * @attr {boolean} shuffle - Whether the delivery engine may randomise the order the choices are
 * presented in. Honoured at delivery, not in the editor.
 * @attr {'horizontal'|'vertical'} orientation - Direction the drop slots run in. Unlike on
 * `qti-choice-interaction`, this attribute is current for the order interaction and not
 * deprecated.
 * @attr {string} class - Shared interaction vocabulary for the presentation of the choices and
 * the drop slots.
 * @attr {string} correct-response - Answer key held on the element while authoring. The
 * `identifier` of every `qti-simple-choice` in the one correct sequence, comma-separated
 * (`step1,step2,step3`). Order IS the answer here — reordering these values changes what is
 * correct. Converted to and from `qti-correct-response` on import/export.
 */
export class QtiOrderInteractionEdit extends DropzoneAutoSizeMixin(
  Interaction,
  'qti-simple-choice',
  '[part~="drop"]',
  '[part="drags"]'
) {
  static override styles = styles;

  public internals: ElementInternals;

  @property({ type: Boolean })
  shuffle: boolean = false;

  @property({ type: String })
  orientation: 'horizontal' | 'vertical' = 'vertical';

  @property({ type: String, attribute: 'class' })
  classes: string | null = null;

  @property({ type: String, attribute: 'correct-response' })
  correctResponse: string | null = null;

  @state()
  private _renderTrigger = 0;

  /** Positional, sparse: index = slot, value = choice id or null. */
  private _order: (string | null)[] = [];

  private readonly _correction = new ContextProvider(this, { context: correctionContext });
  private _setupDone = false;
  private _observer: MutationObserver | null = null;

  private readonly _selection = new PendingSelectionController(this, {
    resolveSource: el => {
      if (el.tagName !== 'QTI-SIMPLE-CHOICE') return null;
      const identifier = el.getAttribute('identifier');
      return identifier ? { element: el, identifier } : null;
    },
    resolveTarget: el => {
      const raw = el.dataset?.slotIndex;
      if (raw == null) return null;
      return { element: el, identifier: raw };
    },
    onCommit: (sourceId, target) => {
      const slotIndex = Number(target.identifier);
      if (Number.isFinite(slotIndex)) this._placeSelectedChoice(sourceId, slotIndex);
    },
    // Mirror the pending state onto the interaction host so editor styles can
    // target pending order placement without DOM-visible attributes.
    onPendingChanged: pending => {
      if (pending != null) this.internals.states.add('pending');
      else this.internals.states.delete('pending');
    }
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  private get _pendingChoiceId(): string | null {
    return this._selection.pendingSourceId;
  }

  override connectedCallback() {
    this.addEventListener('dummy-drag-activate', this._onChipActivate as EventListener);
    super.connectedCallback();
    this._parseCorrectResponse();
    requestAnimationFrame(() => this._trySetup());
    void this._selection;
  }

  override disconnectedCallback() {
    this.removeEventListener('dummy-drag-activate', this._onChipActivate as EventListener);
    this._observer?.disconnect();
    this._observer = null;
    this._setupDone = false;
    super.disconnectedCallback();
  }

  /**
   * Not the host. This element is a ProseMirror node, and PM's DOMObserver runs with
   * `attributes: true` over its subtree — a `style` attribute it did not author marks the node
   * dirty, it re-renders, and the re-render re-triggers whatever wrote it. `part="container"` is
   * inside the shadow root, invisible to that observer, and an ancestor of both the chips and the
   * drops in the flat tree, which is all custom property inheritance needs.
   */
  public override dropzonePropertyTarget(): HTMLElement {
    return this.shadowRoot?.querySelector<HTMLElement>('[part="container"]') ?? this;
  }

  override firstUpdated() {
    this._trySetup();
    this.updateMinDimensionsForDropZones();
  }

  private _onSlotChange = () => {
    this._trySetup();
    if (this._setupDone) {
      this._syncOrderWithChoices();
      this._triggerRender();
    }
    // Deliberately here and in firstUpdated, NOT in updated(): the mixin's first pass returns before
    // it attaches its observers when there are no chips yet, so an interaction that starts empty
    // would never measure at all — while measuring on every render turns one pass into a cycle.
    this.updateMinDimensionsForDropZones();
  };

  private _trySetup() {
    if (this._setupDone) return;
    const choices = this.querySelectorAll('qti-simple-choice');
    if (choices.length === 0) return;

    this._setupDone = true;
    this._syncOrderWithChoices();
    this._setupMutationObserver();
    this._triggerRender();
  }

  /**
   * Decline the chip menu while a choice is pending — the click means "place it here" and belongs
   * to the pending-selection commit, which only this element knows about.
   */
  private _onChipActivate = (event: CustomEvent): void => {
    if (this._selection.pendingSourceId != null) event.preventDefault();
  };

  private _setupMutationObserver() {
    this._observer = new MutationObserver(() => {
      this._syncOrderWithChoices();
      this._triggerRender();
    });
    this._observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('correctResponse')) {
      this._parseCorrectResponse();
      if (this._setupDone) {
        this._syncOrderWithChoices();
      }
      this._triggerRender();
    }
  }

  private _parseCorrectResponse() {
    this._selection.cancel();
    if (!this.correctResponse) {
      this._order = [];
      return;
    }

    // correctResponse is a comma-separated list of identifiers (qti-components
    // convention): "id1,id2,id3". The list is dense — ordered cardinality has
    // no gaps — so we hydrate positions 0..n in order.
    this._order = this.correctResponse
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  private _syncOrderWithChoices() {
    const choiceIds = this._getChoiceIds();
    const slotCount = choiceIds.length;
    const validIds = new Set(choiceIds);
    const seen = new Set<string>();

    const next: (string | null)[] = Array.from({ length: slotCount }, (_, i) => {
      const id = this._order[i] ?? null;
      if (id && validIds.has(id) && !seen.has(id)) {
        seen.add(id);
        return id;
      }
      return null;
    });
    this._order = next;

    if (this._pendingChoiceId && !validIds.has(this._pendingChoiceId)) {
      this._selection.cancel();
    }
  }

  private _getChoices(): HTMLElement[] {
    const choices = Array.from(this.querySelectorAll<HTMLElement>('qti-simple-choice'));
    // Every path that cares about the chips comes through here, so this is the one place that has to
    // classify them for the theme. See markChips for why it is a state and not an attribute.
    markChips(choices);
    return choices;
  }

  private _getChoiceIds(): string[] {
    return this._getChoices()
      .map(choice => choice.getAttribute('identifier'))
      .filter((id): id is string => Boolean(id));
  }

  /**
   * The words in a choice, read when asked rather than cached.
   *
   * The cache this replaces was rebuilt from a MutationObserver, which meant it could be a step
   * behind the DOM — the same staleness that had a gap-match gap painting a raw identifier. It also
   * fell back to the identifier for an empty choice, which is not a label and is not what the
   * candidate would ever see; an empty choice now reads as empty, which is the truth.
   */
  private _labelOf(id: string): string {
    const choice = this.querySelector<HTMLElement>(`qti-simple-choice[identifier="${CSS.escape(id)}"]`);
    return choice?.textContent?.trim() ?? '';
  }

  private _getSlots(): Array<string | null> {
    const slotCount = this._getChoiceIds().length;
    return Array.from({ length: slotCount }, (_, index) => this._order[index] ?? null);
  }

  private _triggerRender() {
    this._publish();
    this._renderTrigger++;
  }

  /**
   * Publish what is true for order, and no more.
   *
   * Order is the weakest fit of the three drag-drop interactions for this context, for two
   * structural reasons worth stating rather than working around. Its drops are `<drop-list>` divs in
   * this element's own shadow root, addressed by index — they are not custom elements and not
   * ProseMirror nodes, so they can never subscribe to anything. And its answer key is an ordered
   * LIST, not directed pairs: `_order` is positional and emits dense, so `drop` below is a slot
   * number rather than an identity. Nothing consumes it as one — `dragsIn` has no consumers here —
   * and calling it an identifier would be the shape lying about what it holds.
   *
   * What the pool chips get out of it is real: they learn they are placed without this element
   * reaching in to tell them, which is what removed the label cache and its staleness.
   *
   * `limitOf` is 1 because a choice occupies one slot at a time. `qti-simple-choice` deliberately
   * does not derive `disabled` from that: a placed choice can still be picked up and moved to
   * another slot, so "used up" is not a state it is ever in.
   */
  private _publish(): void {
    const labels = new Map<string, string>();
    const roles = new Map<string, CorrectionRole>();
    for (const choice of this._getChoices()) {
      const id = choice.getAttribute('identifier');
      if (!id) continue;
      labels.set(id, choice.textContent?.trim() ?? '');
      roles.set(id, 'drag');
    }

    const links: CorrectionLink[] = [];
    this._order.forEach((id, index) => {
      if (id) links.push({ drag: id, drop: String(index) });
    });

    this._correction.setValue({
      links,
      roleOf: id => roles.get(id) ?? null,
      presentation: 'chips',
      dragsIn: drop => links.filter(link => link.drop === drop).map(link => link.drag),
      dropsOf: drag => links.filter(link => link.drag === drag).map(link => link.drop),
      labelOf: drag => labels.get(drag),
      limitOf: () => 1,
      pending: this._selection.pendingSourceId
    });
  }

  private _emitChange() {
    // Serialize as qti-components does: a dense, comma-separated identifier list
    // (ordered cardinality forbids gaps — we drop empty slots on emit).
    const dense = this._order.filter((id): id is string => id !== null);
    const correctResponse = dense.length > 0 ? dense.join(',') : null;

    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        detail: {
          nodeType: 'qtiOrderInteraction',
          tagName: 'qti-order-interaction',
          attrs: { correctResponse }
        },
        bubbles: true,
        composed: true
      })
    );

    this.dispatchEvent(
      new CustomEvent('order-response-change', {
        detail: { order: dense, correctResponse },
        bubbles: true,
        composed: true
      })
    );
  }

  private _placeSelectedChoice(choiceId: string, slotIndex: number) {
    const slotCount = this._getChoiceIds().length;
    if (slotIndex < 0 || slotIndex >= slotCount) return;

    // Positional placement: put the choice in the exact slot the user clicked.
    // Clear it from any previous slot so each choice appears at most once.
    const next: (string | null)[] = Array.from({ length: slotCount }, (_, i) => this._order[i] ?? null);
    for (let i = 0; i < next.length; i++) {
      if (next[i] === choiceId) next[i] = null;
    }
    next[slotIndex] = choiceId;

    this._order = next;
    this._emitChange();
    this._triggerRender();
  }

  private _clearSlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= this._order.length) return;
    if (this._order[slotIndex] == null) return;
    const next = [...this._order];
    next[slotIndex] = null;
    this._order = next;
    this._emitChange();
    this._triggerRender();
  }

  private _renderSlots() {
    // Plain `<drop-list role="region" part="drop">` mirrors the runtime
    // qti-components shape (runtime renders `<div role="region" part="drop">`
    // inside `part="drops"`). The `<drop-list>` tag is NOT a registered custom
    // element — just a styling/role hook; the theme reaches it via ::part(drop).
    // The `empty` part token lets outside editor styles distinguish unfilled
    // slots from filled ones through `::part(drop empty)` when they need to.
    // Every existing `::part(drop)` rule in qti-theme still matches either way.
    return html`
      ${this._getSlots().map(
        (choiceId, index) => html`
          <div role="region" part="drop" data-slot-index=${index}>
            ${choiceId !== null
              ? renderEditChip(this._labelOf(choiceId), choiceId, () => this._clearSlot(index))
              : nothing}
          </div>
        `
      )}
    `;
  }

  override render() {
    void this._renderTrigger;

    return html`
      <slot name="prompt"></slot>
      <div part="container">
        <slot part="drags" @slotchange=${this._onSlotChange}></slot>
        <div part="drops">${this._renderSlots()}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'order-response-change': CustomEvent<{ order: string[]; correctResponse: string | null }>;
  }
}

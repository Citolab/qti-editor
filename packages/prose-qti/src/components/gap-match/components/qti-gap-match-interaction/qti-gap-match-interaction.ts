import { ContextProvider } from '@lit/context';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { DropzoneAutoSizeMixin } from '@qti-components/interactions-core';

import {
  correctionContext,
  Interaction,
  markChips,
  markDroppables,
  parseCorrection,
  PendingSelectionController,
  serializeCorrection,
} from '../../../shared';
import styles from './qti-gap-match-interaction.styles.js';

import type { CorrectionLink, CorrectionRole, CorrectionState } from '../../../shared';

/** True when this node is, or holds, either end of a link — a chip in the pool or a gap in the prose. */
function containsLinkable(node: HTMLElement): boolean {
  return (
    node.tagName === 'QTI-GAP-TEXT' ||
    node.tagName === 'QTI-GAP' ||
    node.querySelector('qti-gap-text, qti-gap') != null
  );
}

export type GapAssociation = [string, string];

export interface GapAssociationChangeDetail {
  associations: GapAssociation[];
}

/**
 * Editor component for qti-gap-match-interaction.
 *
 * Authoring is inline: click a `qti-gap-text`, then click a gap to link them.
 * Escape or a click outside cancels a pending pick.
 *
 * ## What this class owns, and what it no longer does
 *
 * It owns the correction state — the list of `{ drag, drop }` links — and publishes it on
 * {@link correctionContext} for the elements inside it. `correct-response` is *derived* from that
 * list and written back to the ProseMirror node, which stays what is persisted; the list is the
 * live model between those writes.
 *
 * It used to also paint every child: a `querySelectorAll` sweep on each change, setting custom
 * states and a label attribute on each gap. That needed a MutationObserver to catch children
 * ProseMirror had added, a label cache to avoid re-reading them, and an `isApplyingVisualState`
 * guard so the sweep's own writes would not re-trigger it — and the cache could still be a step
 * behind the DOM, which is exactly how a gap came to paint a raw `GAP_TEXT_<uuid>` as its label.
 * Children now subscribe to the state and paint themselves, so all of that is gone.
 *
 * The one observer left watches the pool for label edits, because the words an author types are
 * part of the published state and nothing else would notice them changing.
 *
 * @customElement qti-gap-match-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `directedPair`.
 * @attr {number} max-associations - Maximum number of gaps the candidate may fill. `0` means
 * unlimited.
 * @attr {number} min-associations - Minimum number of gaps the candidate must fill before the
 * interaction counts as answered.
 * @attr {boolean} shuffle - Whether the delivery engine may randomise the order of the
 * `qti-gap-text` choices. Honoured at delivery, not in the editor.
 * @attr {string} class - Shared interaction vocabulary for the presentation of the choice pool
 * and the gaps.
 * @attr {string} correct-response - Answer key held on the element while authoring. One
 * `gaptext gap` pair per filled gap, space inside the pair and comma between pairs
 * (`ht_zuur gap_low,ht_basisch gap_high`); the `qti-gap-text` identifier comes first.
 * Converted to and from `qti-correct-response` on import/export.
 */
export class QtiGapMatchInteractionEdit extends DropzoneAutoSizeMixin(
  Interaction,
  'qti-gap-text',
  'qti-gap'
) {
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

  /** The correction state. Everything else about linking is derived from this list. */
  private links: CorrectionLink[] = [];
  private observer: MutationObserver | null = null;
  private lastEmittedResponse: string | null = null;
  private isEmittingChange = false;

  private readonly provider = new ContextProvider(this, { context: correctionContext });

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
    onCommit: (dragId, target) => {
      if (target.identifier) this.link(dragId, target.identifier);
    },
    // A pick-up changes nothing about the links, but the drops need to know to offer themselves.
    onPendingChanged: () => this.publish(),
  });

  override connectedCallback(): void {
    super.connectedCallback();
    this.links = parseCorrection(this.correctResponse);
    this.publish();
    this.addEventListener('dummy-drag-remove', this.onChipRemove as EventListener);
    this.addEventListener('dummy-drag-activate', this.onChipActivate as EventListener);
    void this.selection;

    // Three things the published state depends on are changed by ordinary editing rather than by
    // anything this class runs: the words in a chip, whether a chip is there at all, and whether a
    // gap is. Deleting either end is how a link comes to name something that no longer exists, so a
    // removal has to republish just as much as an edit does — and a removal reports the INTERACTION
    // as the mutation target, so it is invisible to a walk that starts at the target and stops here.
    //
    // Republishing is all it does. Unlike the sweep this replaced it writes nothing to the DOM, and
    // what publishing does write — states, and a label attribute on the gaps — is not observed
    // here, so it cannot re-trigger itself.
    this.observer = new MutationObserver(mutations => {
      const touched = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          const changed = [...mutation.addedNodes, ...mutation.removedNodes];
          if (changed.some(node => node instanceof HTMLElement && containsLinkable(node))) return true;
        }

        let node: Node | null = mutation.target;
        while (node && node !== this) {
          if (node instanceof HTMLElement && node.tagName === 'QTI-GAP-TEXT') return true;
          node = node.parentNode;
        }
        return false;
      });
      if (touched) {
        this.publish();
        this.updateMinDimensionsForDropZones();
      }
    });
    this.observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    this.removeEventListener('dummy-drag-remove', this.onChipRemove as EventListener);
    this.removeEventListener('dummy-drag-activate', this.onChipActivate as EventListener);
    this.observer?.disconnect();
    this.observer = null;
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this.updateMinDimensionsForDropZones();
  }

  /**
   * The drops, not the host. A gap is a light-DOM `qti-gap` assigned to `slot[part='drops']`, so the
   * slot is its parent in the flat tree and the reservation reaches it by inheritance. The chips are
   * covered separately — `applyDropzoneAutoSizing` publishes on `slot[part='drags']` too — which is
   * what lets this stay entirely inside the shadow root. Writing on the host instead would put a
   * `style` attribute on a ProseMirror node, and PM's DOMObserver watches attributes.
   */
  public override dropzonePropertyTarget(): HTMLElement {
    return this.shadowRoot?.querySelector<HTMLElement>('slot[part="drops"]') ?? this;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    // An answer key that arrived from outside — an import, an undo — replaces the state. One that
    // this element just derived and emitted is already the state, and re-reading it would undo a
    // link the author made in the same tick.
    if (changedProperties.has('correctResponse') && this.correctResponse !== this.lastEmittedResponse) {
      this.links = parseCorrection(this.correctResponse);
      this.publish();
    }
  }

  private get drags(): HTMLElement[] {
    const drags = Array.from(this.querySelectorAll<HTMLElement>('qti-gap-text'));
    // The one place that enumerates the chips, so the one place that classifies them for the theme.
    markChips(drags);
    return drags;
  }

  private get drops(): HTMLElement[] {
    const drops = Array.from(this.querySelectorAll<HTMLElement>('qti-gap'));
    // A gap IS a custom element, so unlike order's and associate's plain <div> drops it can carry
    // the state the runtime marks drop targets with.
    markDroppables(drops);
    return drops;
  }

  private dragElement(identifier: string): HTMLElement | undefined {
    return this.drags.find(drag => drag.getAttribute('identifier') === identifier);
  }

  /**
   * Drop links whose drag or drop no longer exists.
   *
   * Deleting either end is ordinary editing — no command intercepts a Backspace — and a link that
   * outlives what it names is not cosmetic: it exports a `qti-correct-response` referring to an
   * element that is not in the item. Recomputed on publish rather than watched for, so it holds
   * however the element left.
   *
   * ## Why the pool is checked for emptiness first
   *
   * Before ProseMirror has attached the light-DOM children, every identifier looks missing, and
   * pruning on that evidence would empty a perfectly good answer key the moment the item loaded.
   * The pool is what says whether anything has rendered: the content model requires at least two
   * `qti-gap-text`, so no chips at all means "not yet", never "the author removed them". Once the
   * pool is there the gaps are trustworthy too — including an interaction that legitimately has no
   * gaps, where every link naming one really is stale.
   */
  private live(links: readonly CorrectionLink[]): CorrectionLink[] {
    const drags = new Set(this.drags.map(drag => drag.getAttribute('identifier')).filter(Boolean));
    if (drags.size === 0) return [...links];

    const drops = new Set(this.drops.map(drop => drop.getAttribute('identifier')).filter(Boolean));
    return links.filter(link => drags.has(link.drag) && drops.has(link.drop));
  }

  /** Rebuild the published snapshot. Always a new object, so subscribers always hear about it. */
  private publish(): void {
    const links = this.live(this.links);
    const dropped = links.length !== this.links.length;
    this.links = links;

    const labels = new Map<string, string>();
    const limits = new Map<string, number>();
    for (const drag of this.drags) {
      const identifier = drag.getAttribute('identifier');
      if (!identifier) continue;
      // The words as typed, and nothing invented. A chip the author has emptied has no label, and
      // saying so lets a filled gap paint an empty chip rather than the identifier — which is not a
      // label, is not what the candidate would ever see, and reads as corruption.
      labels.set(identifier, drag.textContent?.trim() ?? '');
      const raw = drag.getAttribute('match-max');
      const limit = raw ? Number(raw) : 1;
      limits.set(identifier, Number.isFinite(limit) && limit >= 0 ? limit : 1);
    }
    // Touch the drops so a newly added gap is classified even before it consumes anything.
    void this.drops;

    // In gap-match the role IS the element type, so this is a lookup rather than a decision.
    const roles = new Map<string, CorrectionRole>();
    for (const identifier of labels.keys()) roles.set(identifier, 'drag');
    for (const drop of this.drops) {
      const identifier = drop.getAttribute('identifier');
      if (identifier) roles.set(identifier, 'drop');
    }

    const state: CorrectionState = {
      links,
      roleOf: identifier => roles.get(identifier) ?? null,
      presentation: 'chips',
      dragsIn: drop => links.filter(link => link.drop === drop).map(link => link.drag),
      dropsOf: drag => links.filter(link => link.drag === drag).map(link => link.drop),
      labelOf: drag => labels.get(drag),
      limitOf: drag => limits.get(drag) ?? 1,
      pending: this.selection.pendingSourceId,
    };
    this.provider.setValue(state);

    // A link lost with its drag still has to leave the answer key.
    if (dropped) this.emitChange();
  }

  /** Put `drag` in `drop`, respecting how many drops that drag may occupy. */
  private link(drag: string, drop: string): void {
    const limit = this.limitFor(drag);
    const alreadyHere = this.links.some(link => link.drag === drag && link.drop === drop);

    let next = this.links.filter(link => link.drop !== drop);
    if (limit === 1) {
      // A one-drop drag moves rather than multiplies.
      next = next.filter(link => link.drag !== drag);
    } else if (!alreadyHere && limit !== 0 && next.filter(link => link.drag === drag).length >= limit) {
      this.publish();
      return;
    }

    next.push({ drag, drop });
    this.links = next;
    this.publish();
    this.emitChange();
  }

  private limitFor(drag: string): number {
    const raw = this.dragElement(drag)?.getAttribute('match-max');
    const limit = raw ? Number(raw) : 1;
    return Number.isFinite(limit) && limit >= 0 ? limit : 1;
  }


  /**
   * Decline the chip menu while a drag is pending.
   *
   * A click on a placed chip then means "put this one here instead", which is the pending-selection
   * commit's job — and only this element knows a drag is pending. Cancelling lets the click carry on
   * to that commit instead of opening a menu over the top of it.
   */
  private onChipActivate = (event: CustomEvent): void => {
    if (this.selection.pendingSourceId != null) event.preventDefault();
  };

  /** Empty a drop. Raised when the chip a filled gap paints is removed. */
  private onChipRemove = (event: CustomEvent<{ identifier: string }>): void => {
    const gap = event
      .composedPath()
      .find(node => node instanceof HTMLElement && node.tagName === 'QTI-GAP') as HTMLElement | undefined;
    const drop = gap?.getAttribute('identifier');
    if (!drop || !this.links.some(link => link.drop === drop)) return;
    event.stopPropagation();
    this.links = this.links.filter(link => link.drop !== drop);
    this.publish();
    this.emitChange();
  };

  /** Derive `correct-response` from the links and hand it to the document. */
  private emitChange(): void {
    if (this.isEmittingChange) return;

    this.lastEmittedResponse = serializeCorrection(this.links);
    const associations = this.links.map(link => [link.drag, link.drop] as GapAssociation);

    // Deferred to avoid re-entrancy while a click is still being handled.
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

  override render() {
    return html`
      <slot name="prompt"></slot>
      <slot part="drags" name="drags"></slot>
      <slot part="drops"></slot>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'gap-association-change': CustomEvent<GapAssociationChangeDetail>;
  }
}

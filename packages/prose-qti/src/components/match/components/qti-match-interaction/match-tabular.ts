import { css, html, type LitElement, type ReactiveController } from 'lit';

/**
 * Adopted into document.adoptedStyleSheets exactly once. Reaches across the
 * <qti-simple-associable-choice> shadow boundary via ::part() to hide the
 * drag-drop dropslot when the choice is projected into a tabular header —
 * shadow styles in the merged element can't reach there (two shadow hops).
 */
let lightdomSheetAdopted = false;
function adoptTabularLightdomStyles(): void {
  if (lightdomSheetAdopted) return;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(/* css */ `
    qti-match-interaction.qti-match-tabular qti-simple-associable-choice::part(dropslot) {
      display: none;
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  lightdomSheetAdopted = true;
}

import {
  getChoices,
  getMatchSets,
  parseCorrectResponseAsPairs,
  serializePairs,
  type TabularMatchAssociation,
  type TabularMatchAssociationChangeDetail,
} from './match-shared.js';

export interface TabularHost extends LitElement {
  correctResponse: string | string[] | null;
  dataFirstColumnHeader: string | null;
  /** Single entry point on the host so controllers don't litter dispatchEvent calls. */
  emitNodeAttrsChange(detail: {
    nodeType: string;
    tagName: string;
    attrs: Record<string, unknown>;
  }): void;
  emitTabularAssociationChange(detail: TabularMatchAssociationChangeDetail): void;
}

/**
 * Tabular CSS — inlined (NOT a separate styles module). Cross-module `css`
 * template literals are unreliable in this monorepo: the CSSResult constructor
 * identity check in LitElement.elementStyles can fail and the styles
 * silently don't adopt. Keep this `css` adjacent to the consumer.
 */
export const tabularStyles = css`
  :host(.qti-match-tabular) {
    display: block;
    margin: 0.5rem 0;
    white-space: normal;
  }

  :host(.qti-match-tabular) .grid {
    /* grid-template-columns/rows set inline on .grid from render(); NEVER on
       the host — mutating host's style attribute makes ProseMirror destroy
       and recreate the nodeView, which freezes the browser. */
    display: grid;
    border: 1px solid var(--qti-border-color, #ddd6c7);
    border-radius: 10px;
    overflow: hidden;
    background: var(--qti-background, #fff);
    font-size: 0.92rem;
  }

  :host(.qti-match-tabular) .corner {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    color: var(--qti-muted-foreground, #6b4226);
    font-weight: 600;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }

  :host(.qti-match-tabular) .cols-wrap {
    grid-column: 2 / -1;
    grid-row: 1;
    display: grid;
    grid-template-columns: subgrid;
  }

  :host(.qti-match-tabular) .rows-wrap {
    grid-column: 1;
    grid-row: 2 / -1;
    display: grid;
    grid-template-rows: subgrid;
  }

  :host(.qti-match-tabular) slot {
    display: contents;
  }

  :host(.qti-match-tabular) ::slotted(qti-simple-match-set) {
    display: contents;
  }

  :host(.qti-match-tabular) .checkbox-grid {
    grid-column: 2 / -1;
    grid-row: 2 / -1;
    display: grid;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
  }

  :host(.qti-match-tabular) .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }

  :host(.qti-match-tabular) input[type='radio'],
  :host(.qti-match-tabular) input[type='checkbox'] {
    width: 17px;
    height: 17px;
    accent-color: var(--qti-border-active, #7a4a2f);
    cursor: pointer;
    margin: 0;
  }
`;

/**
 * Tabular-mode controller. Owns:
 *  - structural observers (match-set add/remove via host childList; choice
 *    add/remove per match-set with childList only — NO subtree:true)
 *  - the reactive list of sourceChoices / targetChoices used by render()
 *  - the slot routing under manual slot assignment
 *  - the change event handler that flushes back into the PM doc
 */
export class TabularController implements ReactiveController {
  private host: TabularHost;
  private hostObserver: MutationObserver | null = null;
  private matchSetObservers = new Map<HTMLElement, MutationObserver>();

  sourceChoices: HTMLElement[] = [];
  targetChoices: HTMLElement[] = [];

  constructor(host: TabularHost) {
    this.host = host;
    adoptTabularLightdomStyles();
    host.addController(this);
  }

  hostConnected(): void {
    this.observeHost();
    this.recomputeChoices();
  }

  hostDisconnected(): void {
    this.hostObserver?.disconnect();
    this.hostObserver = null;
    for (const obs of this.matchSetObservers.values()) obs.disconnect();
    this.matchSetObservers.clear();
  }

  /** Called from the host's updated(). slot.assign() is idempotent. */
  routeSlots(
    promptSlot: HTMLSlotElement | null,
    rowsSlot: HTMLSlotElement | null,
    colsSlot: HTMLSlotElement | null,
  ): void {
    const prompts = Array.from(this.host.querySelectorAll(':scope > qti-prompt')) as HTMLElement[];
    const [sourceSet, targetSet] = getMatchSets(this.host);
    promptSlot?.assign(...prompts);
    rowsSlot?.assign(...(sourceSet ? [sourceSet] : []));
    colsSlot?.assign(...(targetSet ? [targetSet] : []));
  }

  /** External trigger (e.g. PM nodeView update()). */
  rerender(): void {
    this.recomputeChoices();
  }

  private observeHost(): void {
    if (this.hostObserver) return;
    this.hostObserver = new MutationObserver(() => this.recomputeChoices());
    this.hostObserver.observe(this.host, { childList: true });
  }

  private syncMatchSetObservers(sets: HTMLElement[]): void {
    for (const [set, obs] of this.matchSetObservers) {
      if (!sets.includes(set)) {
        obs.disconnect();
        this.matchSetObservers.delete(set);
      }
    }
    for (const set of sets) {
      if (this.matchSetObservers.has(set)) continue;
      const obs = new MutationObserver(() => this.recomputeChoices());
      obs.observe(set, { childList: true });
      this.matchSetObservers.set(set, obs);
    }
  }

  private recomputeChoices(): void {
    const [sourceSet, targetSet] = getMatchSets(this.host);
    this.syncMatchSetObservers(
      [sourceSet, targetSet].filter((s): s is HTMLElement => s != null),
    );
    this.sourceChoices = getChoices(sourceSet);
    this.targetChoices = getChoices(targetSet);
    this.host.requestUpdate();
  }

  /** Returns the entire tabular shadow body for the host's render(). */
  render() {
    const cols = this.targetChoices.length;
    const rows = this.sourceChoices.length;
    const correctResponse = parseCorrectResponseAsPairs(this.host.correctResponse);
    const firstColumnHeader = this.host.dataFirstColumnHeader ?? '';

    const gridStyle =
      `grid-template-columns: minmax(150px, auto) repeat(${cols}, minmax(110px, 1fr));` +
      ` grid-template-rows: minmax(46px, auto) repeat(${rows}, 46px);`;

    return html`
      <slot name="prompt"></slot>
      <div
        class="grid"
        style=${gridStyle}
        contenteditable="false"
        @change=${this.onCellChange}
        @click=${stopEvent}
        @mousedown=${stopEvent}
      >
        <div class="corner">${firstColumnHeader}</div>
        <div class="cols-wrap"><slot name="columns"></slot></div>
        <div class="rows-wrap"><slot name="rows"></slot></div>
        <div class="checkbox-grid">
          ${rows === 0 || cols === 0
            ? html``
            : this.sourceChoices.flatMap((source, r) =>
                this.renderRowCells(source, r, correctResponse),
              )}
        </div>
      </div>
    `;
  }

  private renderRowCells(source: HTMLElement, r: number, correctResponse: Set<string>) {
    const sourceId = source.getAttribute('identifier') ?? '';
    const matchMaxAttr = source.getAttribute('match-max');
    const matchMax = matchMaxAttr == null ? 1 : Number(matchMaxAttr);
    const type: 'radio' | 'checkbox' = matchMax === 1 ? 'radio' : 'checkbox';

    return this.targetChoices.map((target, c) => {
      const targetId = target.getAttribute('identifier') ?? '';
      const pair = `${sourceId} ${targetId}`;
      const checked = correctResponse.has(pair);
      return html`
        <div class="cell" style="grid-column: ${c + 1}; grid-row: ${r + 1};">
          <input
            type=${type}
            name=${sourceId}
            .value=${pair}
            .checked=${checked}
            data-pair=${pair}
          />
        </div>
      `;
    });
  }

  private collectCheckedPairs(): string[] {
    const inputs = this.host.renderRoot.querySelectorAll<HTMLInputElement>(
      'input[data-pair]',
    );
    const pairs: string[] = [];
    for (const input of inputs) {
      if (input.checked) {
        const pair = input.getAttribute('data-pair');
        if (pair) pairs.push(pair);
      }
    }
    return pairs;
  }

  private onCellChange = (): void => {
    const pairs = this.collectCheckedPairs();
    const correctResponse = serializePairs(pairs);

    this.host.emitNodeAttrsChange({
      nodeType: 'qtiMatchInteractionTabular',
      tagName: 'qti-match-interaction',
      attrs: { correctResponse },
    });

    this.host.emitTabularAssociationChange({
      associations: pairs.map(pair => pair.split(' ', 2) as TabularMatchAssociation),
    });
  };
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}

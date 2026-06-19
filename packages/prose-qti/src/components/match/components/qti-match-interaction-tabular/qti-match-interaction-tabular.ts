import shadowStyles from './qti-match-interaction-tabular.styles.js';

export type TabularMatchAssociation = [string, string];

export interface TabularMatchAssociationChangeDetail {
  associations: TabularMatchAssociation[];
}

export class QtiMatchInteractionTabularElement extends HTMLElement {
  static observedAttributes = [
    'correct-response',
    'data-first-column-header',
  ];

  private root: ShadowRoot;
  private gridEl!: HTMLDivElement;
  private cornerEl!: HTMLDivElement;
  private rowsSlot!: HTMLSlotElement;
  private colsSlot!: HTMLSlotElement;
  private checkboxGrid!: HTMLDivElement;

  private renderScheduled = false;
  private lastStructureKey = '';

  /**
   * ProseMirror's nodeView `update()` only fires when the tabular node itself
   * changes — not when a descendant (like a new choice in a match-set) is
   * added. So we watch the host's direct children (match-set add/remove) and
   * each match-set's direct children (choice add/remove) ourselves.
   *
   * `childList` only, no `subtree:true` — keystrokes inside a choice paragraph
   * never reach these observers.
   */
  private hostObserver: MutationObserver | null = null;
  private matchSetObservers = new Map<HTMLElement, MutationObserver>();

  constructor() {
    super();
    // Manual slot assignment — we never write `slot=""` on PM's lightdom.
    // (Also: slot.assign() only accepts DIRECT children of the host, which is
    // exactly what our match-sets are.)
    this.root = this.attachShadow({ mode: 'open', slotAssignment: 'manual' });

    const style = document.createElement('style');
    style.textContent = shadowStyles;
    this.root.appendChild(style);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'grid';
    this.gridEl.setAttribute('contenteditable', 'false');
    this.gridEl.addEventListener('change', this.onCellChange);
    this.gridEl.addEventListener('click', stopEvent);
    this.gridEl.addEventListener('mousedown', stopEvent);
    this.root.appendChild(this.gridEl);

    this.cornerEl = document.createElement('div');
    this.cornerEl.className = 'corner';
    this.gridEl.appendChild(this.cornerEl);

    const colsWrap = document.createElement('div');
    colsWrap.className = 'cols-wrap';
    this.colsSlot = document.createElement('slot');
    this.colsSlot.name = 'columns';
    colsWrap.appendChild(this.colsSlot);
    this.gridEl.appendChild(colsWrap);

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'rows-wrap';
    this.rowsSlot = document.createElement('slot');
    this.rowsSlot.name = 'rows';
    rowsWrap.appendChild(this.rowsSlot);
    this.gridEl.appendChild(rowsWrap);

    this.checkboxGrid = document.createElement('div');
    this.checkboxGrid.className = 'checkbox-grid';
    this.gridEl.appendChild(this.checkboxGrid);
  }

  connectedCallback(): void {
    this.observeHost();
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.hostObserver?.disconnect();
    this.hostObserver = null;
    for (const obs of this.matchSetObservers.values()) obs.disconnect();
    this.matchSetObservers.clear();
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.scheduleRender();
  }

  rerender(): void {
    this.scheduleRender();
  }

  private observeHost(): void {
    if (this.hostObserver) return;
    this.hostObserver = new MutationObserver(() => this.scheduleRender());
    this.hostObserver.observe(this, { childList: true });
  }

  private syncMatchSetObservers(sets: HTMLElement[]): void {
    // Disconnect observers for match-sets that disappeared.
    for (const [set, obs] of this.matchSetObservers) {
      if (!sets.includes(set)) {
        obs.disconnect();
        this.matchSetObservers.delete(set);
      }
    }
    // Add observers for newly-seen match-sets.
    for (const set of sets) {
      if (this.matchSetObservers.has(set)) continue;
      const obs = new MutationObserver(() => this.scheduleRender());
      obs.observe(set, { childList: true });
      this.matchSetObservers.set(set, obs);
    }
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      if (!this.isConnected) return;
      this.render();
    });
  }

  private getMatchSets(): [HTMLElement | null, HTMLElement | null] {
    const sets = this.querySelectorAll(':scope > qti-simple-match-set');
    return [
      (sets[0] as HTMLElement | undefined) ?? null,
      (sets[1] as HTMLElement | undefined) ?? null,
    ];
  }

  private getChoices(set: HTMLElement | null): HTMLElement[] {
    if (!set) return [];
    return Array.from(set.querySelectorAll(':scope > qti-simple-associable-choice'));
  }

  private parseCorrectResponse(): Set<string> {
    const raw = this.getAttribute('correct-response');
    const set = new Set<string>();
    if (!raw) return set;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (typeof entry === 'string' && entry.trim()) set.add(entry.trim());
        }
      }
    } catch {
      // Ignore.
    }
    return set;
  }

  private render(): void {
    const [sourceSet, targetSet] = this.getMatchSets();
    const sourceChoices = this.getChoices(sourceSet);
    const targetChoices = this.getChoices(targetSet);
    const correctResponse = this.parseCorrectResponse();
    const firstColumnHeader = this.getAttribute('data-first-column-header') ?? '';

    // Keep one childList observer per current match-set so adding/removing a
    // choice fires scheduleRender.
    this.syncMatchSetObservers(
      [sourceSet, targetSet].filter((s): s is HTMLElement => s != null),
    );

    // Assign match-sets to named slots. NB: slot.assign() requires direct
    // children of the host — match-sets are direct children, so this works.
    this.rowsSlot.assign(...(sourceSet ? [sourceSet] : []));
    this.colsSlot.assign(...(targetSet ? [targetSet] : []));

    // Drive grid template on the shadow .grid element (NEVER the host —
    // mutating host.style triggers PM reconciliation and freezes the browser).
    const cols = targetChoices.length;
    const rows = sourceChoices.length;
    this.gridEl.style.gridTemplateColumns =
      `minmax(150px, auto) repeat(${Math.max(cols, 0)}, minmax(110px, 1fr))`;
    this.gridEl.style.gridTemplateRows =
      `minmax(46px, auto) repeat(${Math.max(rows, 0)}, 46px)`;

    if (this.cornerEl.textContent !== firstColumnHeader) {
      this.cornerEl.textContent = firstColumnHeader;
    }

    const structureKey = sourceChoices.map(getChoiceKey).join('|') + '#' +
      targetChoices.map(getChoiceKey).join('|');
    if (structureKey !== this.lastStructureKey) {
      this.lastStructureKey = structureKey;
      this.rebuildCheckboxGrid(sourceChoices, targetChoices, correctResponse);
      return;
    }

    const inputs = this.checkboxGrid.querySelectorAll<HTMLInputElement>('input[data-pair]');
    for (const input of inputs) {
      const pair = input.getAttribute('data-pair') ?? '';
      const shouldBeChecked = correctResponse.has(pair);
      if (input.checked !== shouldBeChecked) input.checked = shouldBeChecked;
    }
  }

  private rebuildCheckboxGrid(
    sourceChoices: HTMLElement[],
    targetChoices: HTMLElement[],
    correctResponse: Set<string>,
  ): void {
    this.checkboxGrid.replaceChildren();
    if (sourceChoices.length === 0 || targetChoices.length === 0) return;

    sourceChoices.forEach((source, r) => {
      const sourceId = source.getAttribute('identifier') ?? '';
      const matchMaxAttr = source.getAttribute('match-max');
      const matchMax = matchMaxAttr == null ? 1 : Number(matchMaxAttr);
      const type: 'radio' | 'checkbox' = matchMax === 1 ? 'radio' : 'checkbox';

      targetChoices.forEach((target, c) => {
        const targetId = target.getAttribute('identifier') ?? '';
        const pair = `${sourceId} ${targetId}`;

        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridColumn = String(c + 1);
        cell.style.gridRow = String(r + 1);

        const input = document.createElement('input');
        input.type = type;
        input.name = sourceId;
        input.value = pair;
        input.checked = correctResponse.has(pair);
        input.setAttribute('data-pair', pair);
        cell.appendChild(input);
        this.checkboxGrid.appendChild(cell);
      });
    });
  }

  private collectCheckedPairs(): string[] {
    const inputs = this.checkboxGrid.querySelectorAll<HTMLInputElement>('input[data-pair]');
    const pairs: string[] = [];
    for (const input of inputs) {
      if (input.checked) {
        const pair = input.getAttribute('data-pair');
        if (pair) pairs.push(pair);
      }
    }
    return pairs;
  }

  private emitAttrChange(): void {
    const pairs = this.collectCheckedPairs();
    const correctResponse = pairs.length > 0 ? JSON.stringify(pairs) : null;

    this.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        bubbles: true,
        composed: true,
        detail: {
          nodeType: 'qtiMatchInteractionTabular',
          tagName: 'qti-match-interaction-tabular',
          attrs: { correctResponse },
        },
      }),
    );

    this.dispatchEvent(
      new CustomEvent<TabularMatchAssociationChangeDetail>('tabular-match-association-change', {
        bubbles: true,
        composed: true,
        detail: {
          associations: pairs.map(pair => pair.split(' ', 2) as TabularMatchAssociation),
        },
      }),
    );
  }

  private onCellChange = (): void => {
    this.emitAttrChange();
  };
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}

function getChoiceKey(el: HTMLElement): string {
  return `${el.getAttribute('identifier') ?? ''}:${el.getAttribute('match-max') ?? ''}`;
}

declare global {
  interface HTMLElementEventMap {
    'tabular-match-association-change': CustomEvent<TabularMatchAssociationChangeDetail>;
  }
  interface HTMLElementTagNameMap {
    'qti-match-interaction-tabular': QtiMatchInteractionTabularElement;
  }
}

export const QtiMatchInteractionTabularEdit = QtiMatchInteractionTabularElement;

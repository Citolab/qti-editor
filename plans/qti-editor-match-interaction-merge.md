# Plan: Merge `<qti-match-interaction>` editor element into one mode-switching component

## Goal

Today the editor has **two separate custom elements** for the match interaction:

- `<qti-match-interaction>` ([packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.ts](packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.ts)) — click-to-associate UX, default render template, `MutationObserver(subtree:true)`, etc.
- `<qti-match-interaction-tabular>` ([packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts](packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts)) — the LitElement + CSS-grid + manual-slot-assignment renderer we just finished.

Merge them into **one** `<qti-match-interaction>` that switches mode at runtime based on the presence of the `qti-match-tabular` class. Keep the two modes' bodies in **separate TypeScript files** so they never bleed into each other; the host file is a thin orchestrator.

Once this works in the editor, we have a clean reference to port into qti-components proper (separate plan, already drafted at [plans/qti-components-match-tabular-slot-grid-mixin.md](plans/qti-components-match-tabular-slot-grid-mixin.md)).

---

## Phase 0 — Established facts (no further discovery needed)

From the current code (verified during this session):

### File map of what we're merging

| File | What it does today | Fate |
|---|---|---|
| `components/qti-match-interaction/qti-match-interaction.ts` | `QtiMatchInteractionEdit` — click-to-associate Lit element, extends `Interaction` | Becomes orchestrator (Phase 5) |
| `components/qti-match-interaction/qti-match-interaction.styles.ts` | Drag-drop CSS | Moved into `match-drag-drop.ts` (Phase 4) |
| `components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts` | `QtiMatchInteractionTabularElement` — LitElement, manual slot assignment | Logic moves into `match-tabular.ts` (Phase 3); file deleted (Phase 7) |
| `components/qti-match-interaction-tabular/qti-match-interaction-tabular.schema.ts` | Schema node `qtiMatchInteractionTabular`, parseDOM matches `qti-match-interaction[class~="qti-match-tabular"]` or `qti-match-interaction-tabular`, toDOM emits `<qti-match-interaction-tabular>` | toDOM changes to emit `<qti-match-interaction class="qti-match-tabular">` (Phase 6) |
| `components/qti-match-interaction-tabular/qti-match-interaction-tabular.compose.ts` | Tabular compose handler | Stays |
| `extensions/tabular-node-view.ts` | PM nodeView plugin — creates `<qti-match-interaction-tabular>` | Switches to creating `<qti-match-interaction>` with `class="qti-match-tabular"` (Phase 6) |
| `register.ts` | `customElements.define('qti-match-interaction', QtiMatchInteractionEdit)` + `customElements.define('qti-match-interaction-tabular', QtiMatchInteractionTabularElement)` | The tabular `define()` line is deleted (Phase 7) |
| `descriptor.ts` | Two descriptors (matchInteractionDescriptor + matchInteractionTabularDescriptor) | Stays — schemas remain distinct; only the rendered tag converges |

### Base class

`Interaction` ([packages/prose-qti/src/components/shared/components/interaction.ts:4](packages/prose-qti/src/components/shared/components/interaction.ts#L4)) extends `LitElement` and declares `responseIdentifier` + `correctResponse` reactive properties. Both editor elements already extend it.

### Allowed APIs (Lit 3)

| API | Use for | Where it's documented in the repo |
|---|---|---|
| Lit Reactive Controller (`ReactiveController` + `addController()` / `removeController()`) | Per-mode state + lifecycle, with clean teardown on mode switch | https://lit.dev/docs/composition/controllers/ (use as reference) |
| `static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' }` | Manual slot assignment without losing Lit style adoption | We already use this in the current tabular element — copy from there |
| `attributeChangedCallback('class', old, next)` via `@property({ attribute: 'class' })` | React to class attribute changes (mode toggle) | Lit observes attributes declared via `@property` |
| `host.requestUpdate()` from inside a controller | Trigger re-render after mode switch | Lit ReactiveController contract |
| `slot.assign(node)` | Manual slot routing in tabular mode | Established working in current tabular element |

### Anti-patterns to avoid (lessons banked this session)

- ❌ **Never mutate the host's `style` attribute.** Bisected freeze cause — PM destroys/recreates the nodeView, which loops. Grid template lives on a shadow-side `.grid` div.
- ❌ **Never override `createRenderRoot()` to set `slotAssignment`.** That bypasses Lit's automatic style adoption (silent broken styles). Always use `static shadowRootOptions`.
- ❌ **Never split `css` template literals across modules in this monorepo.** Two `CSSResult` constructor instances in resolution means `LitElement` doesn't recognize them as styles. Keep `css` adjacent to the `LitElement` that uses it (verified this session — required the inline fix).
- ❌ **Never use `subtree:true` on the host's MutationObserver in tabular mode.** Every keystroke inside a choice's paragraph would re-fire the observer; we already proved this is fine when narrowly scoped to `childList:true` on each match-set.
- ❌ **Never write `slot=""` on PM's lightdom from inside the tabular renderer.** Use `slot.assign()` — manual slot assignment is set up via `shadowRootOptions`.

### Risks called out up-front

1. **Schema isolation pierced.** The two schemas (`qtiMatchInteraction`, `qtiMatchInteractionTabular`) have different `attrs`. If the tabular schema's `toDOM` starts emitting `<qti-match-interaction class="qti-match-tabular">`, the non-tabular `parseDOM` rule (matching `qti-match-interaction`) could greedily match it during round-trip parsing. **Mitigation**: the non-tabular `parseDOM` already has a `:not(.qti-match-tabular)` style guard via parse priorities — verify before Phase 6, add the explicit `class` filter if missing.
2. **Runtime mode switching mid-life.** PM can update the `class` attribute on the host via `setNodeMarkup`. The orchestrator must react. **Mitigation**: declare `@property({ attribute: 'class' }) classes` so Lit re-runs `updated()`. The orchestrator swaps controllers there.
3. **Drag-drop mixin (qti-components-side concern).** Not in scope for the editor merge — the editor's "non-tabular" branch is the click-to-associate flow, not the qti-components drag-drop mixin chain. We're only proving the architecture works for the editor here.
4. **Observer cleanup on mode switch.** Both modes attach `MutationObserver`s and DOM event listeners. If the orchestrator forgets to call `disconnectedCallback()` equivalents on the inactive controller, listeners leak. **Mitigation**: ReactiveController `hostDisconnected` + explicit `host.removeController()` when swapping.

---

## Phase 1 — File layout decision

**Final file layout** under `packages/prose-qti/src/components/match/components/qti-match-interaction/`:

```
qti-match-interaction.ts           ← orchestrator (the host LitElement)
match-shared.ts                    ← parseCorrectResponse, getMatchSets, getChoices, label cache, event-detail types
match-tabular.ts                   ← TabularController + tabular render template + tabular CSS
match-drag-drop.ts                 ← DragDropController + click-to-associate template + drag-drop CSS
qti-match-interaction.styles.ts    ← host-level base styles (display:block, host-shared rules); per-mode CSS lives inside the per-mode files
qti-match-interaction.commands.ts  ← unchanged (PM commands)
qti-match-interaction.compose.ts   ← unchanged (compose handler)
qti-match-interaction.schema.ts    ← unchanged (PM schema)
qti-match-interaction.schema.test.ts ← unchanged
```

**No more `qti-match-interaction-tabular/` folder.** Its `compose.ts` and `schema.ts` move under the unified folder (Phase 7).

### Difficulty: 1/5

Pure decision step. No code.

---

## Phase 2 — Extract `match-shared.ts`

### What to implement

Create `packages/prose-qti/src/components/match/components/qti-match-interaction/match-shared.ts`. Copy these helpers verbatim from the current two implementations:

| Function | Source |
|---|---|
| `parseCorrectResponseAsAssociations(raw: string \| null): Map<string, string>` | Adapted from `_parseCorrectResponse()` in current `qti-match-interaction.ts:123-143` — keeps the `Map<sourceId, targetId>` shape used by drag-drop mode |
| `parseCorrectResponseAsPairs(raw: string \| null): Set<string>` | Adapted from `parseCorrectResponse()` in current tabular element — keeps the `Set<"src tgt">` shape used by tabular mode |
| `serializeAssociations(associations: Map<string, string>): string \| null` | Adapted from `_emitChange()` in `qti-match-interaction.ts:148-149` |
| `serializePairs(pairs: string[]): string \| null` | The reverse for tabular — already inlined in current tabular `emitAttrChange()` |
| `getMatchSets(host: HTMLElement): [HTMLElement \| null, HTMLElement \| null]` | Same query (`:scope > qti-simple-match-set`) used by both modes |
| `getChoices(matchSet: HTMLElement \| null): HTMLElement[]` | Same `:scope > qti-simple-associable-choice` query |
| Exported types: `MatchAssociation`, `MatchAssociationChangeDetail`, `TabularMatchAssociation`, `TabularMatchAssociationChangeDetail` | Move from current per-mode files |

### Verification

- `grep -R "parseCorrectResponse\|getMatchSets\|getChoices" packages/prose-qti/src/components/match/components/qti-match-interaction*/` shows the functions live in only one file after this phase.
- The two old files still compile (they'll import from `match-shared` now).

### Anti-pattern guard

- ❌ Do NOT add `host.requestUpdate()` calls inside `match-shared.ts`. Pure functions only — controllers handle the reactivity.

### Difficulty: 2/5

Pure extraction. No behavior change.

---

## Phase 3 — Extract `match-tabular.ts` as a `ReactiveController`

### What to implement

Create `packages/prose-qti/src/components/match/components/qti-match-interaction/match-tabular.ts`.

Pattern (Lit Reactive Controller):

```ts
import { css, html, type LitElement, type ReactiveController } from 'lit';
import { parseCorrectResponseAsPairs, getMatchSets, getChoices, serializePairs, type TabularMatchAssociation } from './match-shared.js';

export const tabularStyles = css`
  /* the css we proved out in this session — host = block, .grid = grid,
     .corner / .cols-wrap / .rows-wrap / .checkbox-grid / .cell, etc.
     COPY VERBATIM from the current LitElement's `static styles` block. */
`;

export interface TabularHost extends LitElement {
  correctResponse: string | null;
  dataFirstColumnHeader: string | null;
  /** Re-emit attribute changes via nodeAttrsSync */
  emitAttrChange(detail: { nodeType: string; tagName: string; attrs: Record<string, unknown> }): void;
}

export class TabularController implements ReactiveController {
  private host: TabularHost;
  private hostObserver: MutationObserver | null = null;
  private matchSetObservers = new Map<HTMLElement, MutationObserver>();
  sourceChoices: HTMLElement[] = [];
  targetChoices: HTMLElement[] = [];

  constructor(host: TabularHost) {
    this.host = host;
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

  /** Called from the host's updated() to keep slot routing fresh. */
  routeSlots(rowsSlot: HTMLSlotElement | null, colsSlot: HTMLSlotElement | null): void {
    const [sourceSet, targetSet] = getMatchSets(this.host);
    rowsSlot?.assign(...(sourceSet ? [sourceSet] : []));
    colsSlot?.assign(...(targetSet ? [targetSet] : []));
  }

  /** Called from the host's render() — returns the entire tabular shadow body. */
  render(): unknown { /* the html`` template from the current tabular file */ }

  private observeHost() { /* copy from current tabular element */ }
  private syncMatchSetObservers(sets: HTMLElement[]) { /* copy */ }
  private recomputeChoices() {
    /* copy logic; then call this.host.requestUpdate() */
  }
}
```

### Documentation references

- Current tabular element's `render()`, `recomputeChoices()`, `syncMatchSetObservers()`, `parseCorrectResponse()` — all copy verbatim. Translate `this.requestUpdate()` (LitElement) to `this.host.requestUpdate()` (ReactiveController).
- Event dispatch (`qti-prosemirror-node-attrs-change` and `tabular-match-association-change`) — call back into a host method `host.emitTabularAttrChange(detail)` rather than `host.dispatchEvent(...)` directly, so the host owns the event-name contract and the controller stays decoupled.

### Verification

- `grep -R "tabular-match-association-change\|qti-prosemirror-node-attrs-change" match-tabular.ts` returns the dispatcher call to `host.emit*`, not raw `dispatchEvent`.
- New controller imports only from `lit`, `./match-shared`, and standard DOM types.
- Old `qti-match-interaction-tabular.ts` still compiles (it'll be deleted in Phase 7).

### Anti-pattern guards

- ❌ Do NOT export `css` from a separate styles file again. Inline it here (we proved cross-module `css` breaks in this monorepo).
- ❌ Do NOT touch `host.style` from anywhere in this file. Use `gridEl.style.gridTemplateColumns` only.

### Difficulty: 3/5

Translation from LitElement to ReactiveController is mechanical but requires routing `requestUpdate`, `query` access, and event dispatch back through the host.

---

## Phase 4 — Extract `match-drag-drop.ts` as a `ReactiveController`

### What to implement

Same pattern as Phase 3 but for the existing click-to-associate logic in current `qti-match-interaction.ts`.

```ts
export class DragDropController implements ReactiveController {
  // host, _pendingSourceId, _associations: Map<string, string>, _labelCache
  hostConnected() {
    // copy from current connectedCallback (excluding super calls)
    // attach this.host.addEventListener('click', ...)
    // attach document.addEventListener('keydown' / 'pointerdown', ...)
    // set up MutationObserver (childList + subtree + characterData stays — drag-drop needs it for label cache)
    // ⚠️ this observer is the chatty one we banned in tabular mode; that ban does NOT apply here because
    //   drag-drop mode doesn't watch for grid-structure changes
  }
  hostDisconnected() { /* tear down everything */ }
  render(): unknown { /* the slot-name="prompt" + default slot template */ }
}

export const dragDropStyles = css`/* copy from qti-match-interaction.styles.ts */`;
```

### Sources to copy

- `connectedCallback`, `disconnectedCallback`, `_trySetup`, `_setupMutationObserver`, `_buildLabelCache`, `_onClick`, `_handleSourceClick`, `_handleTargetClick`, `_onKeyDown`, `_onDocumentPointerDown`, `_onFakeDragRemove`, `_syncFakeDrags`, `_syncSelectingTarget` — all from current [qti-match-interaction.ts](packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.ts).
- Render template (lines 343-351 current file).

### Verification

- `grep -R "fake-drag-remove\|MATCH_SELECTING_TARGET_EVENT" packages/prose-qti/src/components/match/components/qti-match-interaction/` shows wiring lives in `match-drag-drop.ts` only.

### Difficulty: 3/5

Same translation pattern as Phase 3, but more methods.

---

## Phase 5 — Build the orchestrator

### File

Replace the body of `packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.ts` with:

```ts
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { Interaction } from '../../../shared';
import { TabularController, tabularStyles } from './match-tabular.js';
import { DragDropController, dragDropStyles } from './match-drag-drop.js';
import { hostStyles } from './qti-match-interaction.styles.js';

const TABULAR_CLASS = 'qti-match-tabular';

export class QtiMatchInteractionEdit extends Interaction {
  static override styles = [hostStyles, tabularStyles, dragDropStyles];

  // Manual slot assignment for the tabular mode; the drag-drop mode uses the
  // default <slot> normally — that still works under manual assignment as long
  // as the drag-drop mode's render doesn't rely on auto-routing (it doesn't —
  // it uses the default slot to render the lightdom in place via display:block).
  // VERIFY in Phase 9: confirm drag-drop mode still shows the match-sets under
  // manual slot assignment, or switch shadowRootOptions OFF when not tabular.
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    slotAssignment: 'manual',
  };

  @property({ attribute: 'class' }) classes: string | null = null;
  @property({ attribute: 'correct-response' }) correctResponse: string | null = null;
  @property({ attribute: 'data-first-column-header' }) dataFirstColumnHeader: string | null = null;

  @query('slot[name="rows"]') private rowsSlot!: HTMLSlotElement;
  @query('slot[name="columns"]') private colsSlot!: HTMLSlotElement;

  // Both controllers are constructed up-front, but only the active one's
  // hostConnected / hostUpdated do work. The inactive one's render() is just
  // not called. Cleanest: swap addController/removeController on mode change.
  private tabular?: TabularController;
  private dragDrop?: DragDropController;

  @state() private isTabular = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.applyMode(this.classList.contains(TABULAR_CLASS));
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('classes')) {
      const nextIsTabular = (this.classes ?? '').split(/\s+/).includes(TABULAR_CLASS);
      if (nextIsTabular !== this.isTabular) this.applyMode(nextIsTabular);
    }
  }

  private applyMode(nextIsTabular: boolean): void {
    // Tear down old controller
    if (this.isTabular && this.tabular) { this.removeController(this.tabular); this.tabular = undefined; }
    if (!this.isTabular && this.dragDrop) { this.removeController(this.dragDrop); this.dragDrop = undefined; }
    // Spin up new one
    this.isTabular = nextIsTabular;
    if (nextIsTabular) this.tabular = new TabularController(this);
    else this.dragDrop = new DragDropController(this);
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this.isTabular) this.tabular?.routeSlots(this.rowsSlot, this.colsSlot);
  }

  /** Re-export so controllers can dispatch through a single host entry point. */
  emitAttrChange(detail: { nodeType: string; tagName: string; attrs: Record<string, unknown> }) {
    this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
      bubbles: true, composed: true, detail,
    }));
  }

  override render() {
    return this.isTabular ? this.tabular?.render() ?? nothing : this.dragDrop?.render() ?? nothing;
  }
}
```

### Documentation references

- Reactive Controller contract: https://lit.dev/docs/composition/controllers/ — `addController()`, `removeController()`, `hostConnected`, `hostDisconnected`, `hostUpdated`, `hostUpdate`.
- `requestUpdate()`: lit.dev/docs/components/lifecycle/#requestUpdate
- `static shadowRootOptions`: lit.dev/docs/components/shadow-dom/#customizing-the-render-root

### Verification

- `grep -R "QtiMatchInteractionEdit\|QtiMatchInteractionTabularEdit" packages/prose-qti/src/` shows ONE export per name; the tabular re-export alias is gone.
- Toggle test (manual, Phase 9): in DevTools, `el.classList.toggle('qti-match-tabular')` swaps render modes without page reload.

### Anti-pattern guards

- ❌ Do NOT override `createRenderRoot()` (would break style adoption — banked lesson).
- ❌ Do NOT inline either controller's body into this file. Orchestrator stays thin.

### Difficulty: 4/5

The runtime mode switch is the trickiest part. Mitigation: write a Storybook (or test) story that programmatically toggles the class and asserts the controller swap, observers torn down, and shadow DOM repainted.

---

## Phase 6 — Wire schemas and nodeView to the single tag

### Edits

1. **`components/qti-match-interaction-tabular/qti-match-interaction-tabular.schema.ts`**: change `toDOM` (line 92) from:
   ```ts
   return ['qti-match-interaction-tabular', attrs, 0];
   ```
   to:
   ```ts
   attrs.class = withTabularMatchClass(attrs.class as string | undefined);
   return ['qti-match-interaction', attrs, 0];
   ```
2. **`extensions/tabular-node-view.ts`**: change `document.createElement('qti-match-interaction-tabular')` to `document.createElement('qti-match-interaction')` and ensure `applyAttrs` keeps the `class` attribute carrying `qti-match-tabular`.
3. **`components/qti-match-interaction/qti-match-interaction.schema.ts`**: verify its parseDOM rule excludes tabular markup. The current rule matches `qti-match-interaction`. Add (or confirm) priority so `[class~="qti-match-tabular"]` is picked up by the tabular spec first.

### Verification

- Round-trip test: open a tabular item, hit save/reload — XML output still has `<qti-match-interaction class="qti-match-tabular">`, the editor remounts in tabular mode.
- `grep -R 'qti-match-interaction-tabular' packages/prose-qti/src/components/match/` returns 0 hits in `.schema.ts`, `.tabular-node-view.ts`, and the rendered editor DOM (DevTools inspection).

### Difficulty: 2/5

---

## Phase 7 — Delete the old tabular element files

### Files to delete

```
packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts
packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.styles.ts (already gone)
```

### Files to move (NOT delete) — into the unified folder

- `qti-match-interaction-tabular.schema.ts` → `components/qti-match-interaction/qti-match-interaction-tabular.schema.ts` (or merge into the same `.schema.ts` file — orchestrator's call).
- `qti-match-interaction-tabular.compose.ts` → same target folder.
- Browser tests → same.

### Edits

- **`register.ts`**: delete the `customElements.define('qti-match-interaction-tabular', QtiMatchInteractionTabularEdit)` block. Update imports.
- **`descriptor.ts`**: keep `matchInteractionTabularDescriptor` (the PM node still exists), but its `tagName` field changes from `'qti-match-interaction-tabular'` to `'qti-match-interaction'`. Verify nothing reads the tagName to do `customElements.get(tag)`.

### Verification

- `grep -R "qti-match-interaction-tabular" packages/ apps/` returns 0 hits in `customElements.define` or new DOM construction; the only allowed remaining hits are in compose handlers / parse rules that target the legacy literal tag for backward compatibility on input.
- Editor reloads existing items unchanged.

### Difficulty: 2/5

---

## Phase 8 — Storybook + tests

### Tests to add (or repurpose)

1. **Mode-switch test** (new) — mount `<qti-match-interaction>`, assert click-to-associate works; toggle `qti-match-tabular` class via `el.classList.add(...)`, assert tabular grid appears and the drag-drop click handlers are gone (e.g. clicking a choice no longer pends).
2. **Tabular-only behaviors** (port from current `qti-match-interaction-tabular.schema.browser.test.ts`) — Enter inside a choice adds a row/col, `style` on host stays `null`, `slot.assign` populates slots.
3. **Drag-drop-only behaviors** (port from current — if exists) — click source then target creates an association, `match-association-change` event fires.
4. **Round-trip XML** — open ITEM010 (tabular) and any drag-drop item, save, reopen — mode preserved.

### Verification

- All existing browser tests pass.
- Manual smoke test using devtools MCP: click ITEM010 → tabular renders → no freeze → toggle class off → click-to-associate appears.

### Difficulty: 3/5

---

## Phase 9 — Final verification

Checklist:

- [ ] `grep -R "qti-match-interaction-tabular" packages/prose-qti/src/components/match/` returns 0 hits in TypeScript identifiers/define calls (only parser literals remain, intentionally).
- [ ] `grep -R "this\.style\.\|host\.style\." packages/prose-qti/src/components/match/components/qti-match-interaction/` returns 0 hits — no host-style mutation.
- [ ] `customElements.get('qti-match-interaction-tabular')` is `undefined` at runtime.
- [ ] `customElements.get('qti-match-interaction')` resolves to the orchestrator class.
- [ ] ITEM010 in `http://localhost:5175/` renders the tabular grid with full styles, no freeze.
- [ ] Toggling `qti-match-tabular` on/off via `classList` at runtime swaps modes without remount.
- [ ] Drag-drop items render the click-to-associate UI as before.
- [ ] XML round-trip preserves mode in both directions.
- [ ] No new console errors, no leaked event listeners (Devtools "Memory" sampling shows no growth on repeated mode toggle).

---

## Difficulty summary

| Phase | Difficulty | Notes |
|---|---|---|
| 0. Discovery | done | We already know the facts |
| 1. File layout | 1/5 | Decision only |
| 2. `match-shared.ts` | 2/5 | Pure extraction |
| 3. `match-tabular.ts` | 3/5 | LitElement → ReactiveController translation |
| 4. `match-drag-drop.ts` | 3/5 | Same translation, more methods |
| 5. Orchestrator | 4/5 | Runtime mode switch is the hardest part |
| 6. Schema/nodeView rewire | 2/5 | Small targeted edits |
| 7. Delete old files | 2/5 | Mechanical |
| 8. Tests + Storybook | 3/5 | Especially the mode-switch test |
| 9. Verification | 1/5 | Run the checklist |

**Total**: solidly doable in one focused session. The runtime-switch correctness is the only place that needs careful manual testing.

## "How hard would that be?" — direct answer

**Medium.** No new architecture invention required — Lit Reactive Controllers are the textbook tool for this exact problem (multiple lifecycle-managed behaviors that can be added/removed per-instance). The two big risks are:

1. **Runtime mode switch reliability.** Both modes attach DOM listeners and observers; the orchestrator has to tear them down cleanly on swap. Phase 5's `applyMode()` + ReactiveController `hostDisconnected` handle this if implemented carefully. Verify with the toggle test in Phase 8.
2. **Manual slot assignment in drag-drop mode.** `shadowRootOptions` is set element-wide. The drag-drop render currently uses `<slot>` (default) for the match-sets. With manual slot assignment, that default slot needs explicit `slot.assign(...)`. The drag-drop controller's `hostUpdated` must call `defaultSlot.assign(...matchSets)` and `promptSlot.assign(...prompts)` — easy to forget but mechanical. `setAttribute('slot', '…')` on lightdom is **not** an option (ProseMirror won't tolerate the lightdom mutation). See the dedicated "Slot routing under manual assignment" section below for the exact code in both controllers.

Once those two are nailed, the rest is mechanical extraction.

---

## Slot routing under manual assignment — applies to BOTH modes

Both controllers MUST route slots themselves via `slot.assign(...)`. We do not write `slot=""` on PM's lightdom under any circumstance — PM's mutation observer treats lightdom attribute writes as foreign edits and reconciliation pain follows (separate from the host-style freeze, but in the same family of "don't poke PM's contentDOM"). The `static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' }` setting is host-wide, so the drag-drop mode also has to route.

### Drag-drop mode slot routing

The current drag-drop template ([qti-match-interaction.ts:347-350](packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.ts#L347-L350)) is:

```ts
return html`
  <slot name="prompt"></slot>
  <slot @slotchange=${this._onSlotChange}></slot>
`;
```

Under manual slot assignment, the `DragDropController` must, on `hostUpdated`:

```ts
const promptSlot = host.renderRoot.querySelector('slot[name="prompt"]') as HTMLSlotElement | null;
const defaultSlot = host.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement | null;

const prompts = Array.from(host.querySelectorAll(':scope > qti-prompt')) as HTMLElement[];
const matchSets = Array.from(host.querySelectorAll(':scope > qti-simple-match-set')) as HTMLElement[];

promptSlot?.assign(...prompts);
defaultSlot?.assign(...matchSets);
```

The `slotchange` listener in the original (`@slotchange=${this._onSlotChange}`) was wired to a default `<slot>` populated by auto-assignment. With manual assignment, `slotchange` only fires when `slot.assign(...)` changes the assigned set — re-running `assign` with the same nodes is a no-op. So `_onSlotChange` should be retriggered explicitly when the drag-drop controller detects a structural change via its `MutationObserver`, not via slotchange.

### Tabular mode slot routing

Same pattern, three named slots:

```ts
const promptSlot = host.renderRoot.querySelector('slot[name="prompt"]') as HTMLSlotElement | null;
const rowsSlot   = host.renderRoot.querySelector('slot[name="rows"]') as HTMLSlotElement | null;
const colsSlot   = host.renderRoot.querySelector('slot[name="columns"]') as HTMLSlotElement | null;

const prompts = Array.from(host.querySelectorAll(':scope > qti-prompt')) as HTMLElement[];
const [sourceSet, targetSet] = getMatchSets(host);

promptSlot?.assign(...prompts);
rowsSlot?.assign(...(sourceSet ? [sourceSet] : []));
colsSlot?.assign(...(targetSet ? [targetSet] : []));
```

### Verification

- `grep -R "setAttribute('slot'" packages/prose-qti/src/components/match/components/qti-match-interaction/` returns 0 hits.
- `el.querySelectorAll(':scope > qti-simple-match-set').forEach(s => console.assert(!s.hasAttribute('slot')))` — sanity check in devtools that nothing ever wrote a `slot` attribute onto lightdom.
- Manual smoke in both modes: `<qti-prompt>` text shows, match-sets render in the right shadow slot positions.

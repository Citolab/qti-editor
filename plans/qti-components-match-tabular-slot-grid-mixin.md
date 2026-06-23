# Plan: Port slot-based CSS-grid tabular rendering into qti-components, as a mixin

## Goal

Replace the internal `<table>` + `cloneNode` rendering in qti-components' `<qti-match-interaction class="qti-match-tabular">` with the **slot + CSS Grid + subgrid** approach proven in the editor:

- The host element *is* the grid (or has a shadow grid wrapper).
- Two named slots (`rows`, `columns`) — each receives one of the lightdom `<qti-simple-match-set>` elements.
- `::slotted(qti-simple-match-set) { display: contents }` flattens the wrapper so each `<qti-simple-associable-choice>` becomes a real grid item — **no `cloneNode`, no copies**, the live lightdom is the header.
- Only the checkbox cells are built in shadow; the response/correctness logic stays unchanged.

Extract this into a **Lit mixin** so `QtiMatchInteraction` can call it conditionally when the `qti-match-tabular` class is present. Non-tabular drag-drop rendering stays in `QtiMatchInteraction` exactly as today.

---

## Phase 0 — Documentation discovery (must run first)

A short subagent pass before any implementation to verify the APIs we plan to use.

### Required reads

- `packages/interactions/match-interaction/src/qti-match-interaction.ts` — current tabular `render()` (lines 214–294). Identify exactly what state + methods the tabular branch reads (`sourceChoices`, `targetChoices`, `response`, `correctOptions`, `handleRadioChange`, `handleRadioClick`).
- `packages/qti-theme/src/styles/qti-theme/interactions/qti-match-interaction.css` — current `::part(...)` rule set. Catalog every part name in use so the new template can either reuse names (for visual parity) or the mixin's PR can include the matching CSS rename.
- `packages/interactions/core/src/mixins/` — existing mixin patterns (`drag-drop-observables`, `vocabulary`, etc.). Confirm the project's mixin idiom: function returning a `Constructor<Interaction>`, generic over a `superClass`. **Also confirm** the drag-drop mixin's `updated()` / `connectedCallback()` call `super` (so our mixin can chain), and that it does not depend on the lightdom match-sets being unassigned (e.g. by reading `defaultSlot.assignedElements()` directly). If it does, the non-tabular branch of `assignMatchSetSlots(false)` — which clears the `slot` attribute — already restores the expected state.
- `packages/interactions/match-interaction/src/qti-match-interaction.stories.ts` — the existing Storybook story for the tabular variant, so we have a manual smoke test target.
- Lit's `LitElement.createRenderRoot()` docs/source — confirm we can override it to call `attachShadow({ mode: 'open', slotAssignment: 'manual' })` if we want manual slot assignment, OR confirm that simply setting `slot=""` attribute on the match-sets is acceptable here (no ProseMirror constraint in the runtime).

### Allowed APIs

| API | Used for |
|---|---|
| Lit `html` / `css` template literals | Tabular template + per-mixin styles |
| Lit `@property` / `@state` | Reactive grid-template + checked state |
| Lit `createRenderRoot()` override | Optional — only if we choose manual slot assignment |
| `element.setAttribute('slot', '...')` | Auto slot routing (simplest path) |
| `slot.assign(...)` | Manual slot routing (alt path) |
| `::slotted(qti-simple-match-set)` | Flatten the slotted wrapper via `display: contents` |
| `CSSResultGroup` `static styles = […, mixinStyles]` | Compose mixin styles into the host component |

### Anti-patterns to avoid

- ❌ `cloneNode(true)` of choice children into table cells. **The point of this refactor is to delete those clones.**
- ❌ Inline `style="grid-row:…; grid-column:…"` on each `<qti-simple-associable-choice>` in lightdom. Use **subgrid wrappers** that auto-flow choices into the inherited tracks instead — no per-choice JS placement.
- ❌ Writing `style` (CSS vars, grid-template, anything) on the **host element**. In qti-components there is no ProseMirror so it's not a freeze risk, but it still bleeds host-component styling concerns into the host's `style` attribute, which any downstream consumer can override accidentally. Keep grid-template on a shadow-side wrapper.
- ❌ Removing existing `::part(...)` names without coordinating the qti-theme update. Either keep the existing part names *or* ship both files in the same PR.

---

## Phase 1 — Mixin file

### File

`packages/interactions/match-interaction/src/match-tabular-mixin.ts`

### Responsibilities

1. Provide a `MatchTabularMixin(superClass)` factory.
2. Expose a `renderTabularMatrix()` method that returns the Lit template for the entire tabular view: corner + named slots `rows` / `columns` + checkbox subgrid.
3. Provide an `assignMatchSetSlots()` method called from `updated()` that finds the two lightdom `<qti-simple-match-set>` elements and tags them via `setAttribute('slot', 'rows' | 'columns')`. Idempotent: guards on the current value so re-renders write nothing when slots are already correct. When the host is not in tabular mode, removes any slot attribute the mixin previously set so the default `<slot>` reclaims the match-sets for the drag-drop path.
4. Provide a `tabularStyles` `CSSResult` the host can splice into its `static styles`.
5. **Do not** override the host's `render()`. The host decides when to call `renderTabularMatrix()`.
6. **Do not** override `createRenderRoot()` — auto slot assignment is what we want so `<qti-prompt>`'s self-`slot="prompt"` and the default drag-drop slot keep working.

### Sketch

```ts
import { css, html, type CSSResult, type LitElement } from 'lit';

import type { QtiSimpleAssociableChoice } from '@qti-components/interactions-core/elements/qti-simple-associable-choice';

type Constructor<T> = new (...args: any[]) => T;

export interface MatchTabularHost extends LitElement {
  sourceChoices: QtiSimpleAssociableChoice[];
  targetChoices: QtiSimpleAssociableChoice[];
  response: string[];
  correctOptions: { source: string; target: string }[] | null;
  handleRadioChange(e: { target: any }): void;
  handleRadioClick(e: { target: HTMLInputElement }): void;
}

export const tabularStyles: CSSResult = css`
  :host(.qti-match-tabular) {
    --qti-tabular-row-height: 46px;
  }
  .qti-tabular-grid {
    display: grid;
    /* grid-template-columns/rows set inline from renderTabularMatrix(). */
    border: 1px solid var(--qti-border-color, #ddd);
    border-radius: 10px;
    overflow: hidden;
    background: var(--qti-bg, #fff);
  }
  .qti-tabular-grid > [part='corner'] {
    grid-column: 1; grid-row: 1;
    border-bottom: 1px solid var(--qti-subtle-border, #eee);
    border-right: 1px solid var(--qti-subtle-border, #eee);
  }
  /* Subgrid wrappers — choices auto-flow into inherited tracks. */
  .qti-tabular-grid > [part='cols-wrap'] {
    grid-column: 2 / -1; grid-row: 1;
    display: grid; grid-template-columns: subgrid;
  }
  .qti-tabular-grid > [part='rows-wrap'] {
    grid-column: 1; grid-row: 2 / -1;
    display: grid; grid-template-rows: subgrid;
  }
  slot { display: contents; }
  ::slotted(qti-simple-match-set) { display: contents; }

  .qti-tabular-grid > [part='checkbox-grid'] {
    grid-column: 2 / -1; grid-row: 2 / -1;
    display: grid;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
  }
  [part='cell'] {
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid var(--qti-subtle-border, #eee);
    border-right: 1px solid var(--qti-subtle-border, #eee);
  }
`;

export const MatchTabularMixin = <T extends Constructor<MatchTabularHost>>(superClass: T) => {
  class MatchTabularImpl extends superClass {
    /**
     * Tag the two lightdom match-sets with slot="rows" / slot="columns" when
     * tabular; clear those tags otherwise so the default <slot> in the
     * non-tabular template reclaims them for the drag-drop path.
     * Idempotent — guards on the current value.
     */
    protected assignMatchSetSlots(isTabular: boolean): void {
      const sets = this.querySelectorAll(':scope > qti-simple-match-set');
      const wanted = isTabular ? ['rows', 'columns'] : [null, null];
      for (let i = 0; i < Math.min(sets.length, 2); i++) {
        const el = sets[i] as HTMLElement;
        const want = wanted[i];
        if (want == null) {
          if (el.hasAttribute('slot')) el.removeAttribute('slot');
        } else if (el.getAttribute('slot') !== want) {
          el.setAttribute('slot', want);
        }
      }
    }

    protected override updated(changed: Map<string, unknown>): void {
      super.updated?.(changed);
      this.assignMatchSetSlots(this.classList.contains('qti-match-tabular'));
    }

    /** Pure render — produces the entire tabular view. */
    protected renderTabularMatrix() {
      const rows = this.sourceChoices?.length || 0;
      const cols = this.targetChoices?.length || 0;
      const gridTemplate =
        `grid-template-columns: minmax(150px, auto) repeat(${cols}, minmax(110px, 1fr));` +
        `grid-template-rows: minmax(var(--qti-tabular-row-height, 46px), auto) repeat(${rows}, var(--qti-tabular-row-height, 46px));`;
      const response = this.response || [];
      const hasCorrectResponse = this.correctOptions !== null;

      return html`
        <div class="qti-tabular-grid" part="grid" style=${gridTemplate}>
          <div part="corner"></div>
          <div part="cols-wrap"><slot name="columns"></slot></div>
          <div part="rows-wrap"><slot name="rows"></slot></div>
          <div part="checkbox-grid">
            ${this.sourceChoices?.flatMap((row, r) => {
              const rowId = row.getAttribute('identifier')!;
              const matchMax = row.matchMax;
              const type = matchMax === 1 ? 'radio' : 'checkbox';
              const selectedInRow = response.filter(v => v.split(' ')[0] === rowId).length;

              return this.targetChoices.map((col, c) => {
                const colId = col.getAttribute('identifier')!;
                const value = `${rowId} ${colId}`;
                const checked = response.includes(value);
                const isCorrect = !!this.correctOptions?.find(o => o.source === rowId && o.target === colId);
                const baseToken = type === 'radio' ? 'rb' : 'cb';
                const tokens = [baseToken];
                if (checked) tokens.push(`${baseToken}-checked`);
                if (hasCorrectResponse) tokens.push(isCorrect ? `${baseToken}-correct` : `${baseToken}-incorrect`);
                const disable = hasCorrectResponse
                  ? true
                  : matchMax === 1
                    ? false
                    : matchMax !== 0 && selectedInRow >= matchMax && !checked;
                return html`
                  <div part="cell" style="grid-column: ${c + 1}; grid-row: ${r + 1};">
                    <input
                      type=${type}
                      part=${tokens.join(' ')}
                      name=${rowId}
                      value=${value}
                      .checked=${checked}
                      .disabled=${disable}
                      @change=${this.handleRadioChange}
                      @click=${(e: { target: HTMLInputElement }) =>
                        matchMax === 1 ? this.handleRadioClick(e) : undefined}
                    />
                    ${type === 'checkbox' && checked
                      ? html`<svg
                          part="checkmark" viewBox="0 0 24 24"
                          style="position:absolute;width:18px;height:18px;top:3px;left:3px;pointer-events:none;">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                        </svg>`
                      : ''}
                  </div>
                `;
              });
            })}
          </div>
        </div>
      `;
    }
  }
  return MatchTabularImpl;
};
```

### Verification

- `grep -R "cloneNode" packages/interactions/match-interaction/src/` returns no hits in the tabular path after Phase 2.
- Mixin file imports nothing from outside `@qti-components/*` + `lit`.
- Mixin only exposes `assignMatchSetSlots()` (protected), `renderTabularMatrix()` (protected), and the named export `tabularStyles`.

---

## Phase 2 — Wire the mixin into `QtiMatchInteraction`

### Edit

`packages/interactions/match-interaction/src/qti-match-interaction.ts`

### Changes

1. Add to the mixin chain:
   ```ts
   export class QtiMatchInteraction extends MatchTabularMixin(
     DragDropSlottedSortableMixin(SlottedBase, '[qti-draggable="true"]'),
   ) { … }
   ```
2. Compose styles:
   ```ts
   static override styles: CSSResultGroup = [styles, tabularStyles];
   ```
3. Slim `render()`:
   ```ts
   override render() {
     const isTabular = this.classList.contains('qti-match-tabular');
     return html`
       <slot name="prompt"></slot>
       <slot ?hidden=${isTabular}></slot>
       ${isTabular ? this.renderTabularMatrix() : nothing}
       <div role="alert" part="message" id="validation-message"></div>
     `;
   }
   ```
4. **Delete** the inline `<table>` template (lines 222–290 of the current file) once Phase 1 mixin is wired up.
5. Leave `handleRadioChange`, `handleRadioClick`, `validate`, `toggleInternalCorrectResponse`, `toggleCandidateCorrection`, `connectedCallback`, response getters/setters **untouched** — the mixin only owns the rendering.

### Verification

- Storybook tabular story renders identically (visual diff via Chromatic).
- Existing tests pass.
- `grep -R 'part="table"' packages/interactions/match-interaction/src/` returns 0 — the old part names are gone.

---

## Phase 3 — Update qti-theme stylesheet

### Edit

`packages/qti-theme/src/styles/qti-theme/interactions/qti-match-interaction.css`

### Changes

The new template uses different `::part(...)` names. Replace the tabular block (lines 2–101 in the current file) with rules targeting the new structure:

```css
@layer qti-components {
  qti-match-interaction.qti-match-tabular {
    &::part(message)       { @apply validation-message; }
    &::part(grid)          { background: var(--qti-bg, #fff); }
    &::part(corner)        { background: var(--qti-bg-active, #f8f8f8); }
    &::part(cols-wrap)     { background: var(--qti-bg-active, #f8f8f8); }
    &::part(rows-wrap)     { background: var(--qti-bg-active, #f8f8f8); }
    &::part(checkbox-grid) { /* nothing — subgrid alignment only */ }
    &::part(cell) {
      height: 48px;
      border: 1px solid #ddd;
    }
    /* rb / cb / rb-checked / cb-checked / rb-correct / cb-correct /
       rb-incorrect / cb-incorrect / checkmark — KEEP exact rules from
       the current file (lines 41–100); the parts still exist with the
       same names. */
  }

  /* Lightdom rule — choices are NOT in shadow, so a plain descendant
     selector reaches them. No ::slotted needed. */
  qti-match-interaction.qti-match-tabular qti-simple-match-set qti-simple-associable-choice {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    background: var(--qti-bg-active, #f8f8f8);
    font-weight: 500;
    border-bottom: 1px solid #ddd;
    border-right: 1px solid #ddd;
  }
  qti-match-interaction.qti-match-tabular qti-simple-match-set:first-of-type qti-simple-associable-choice {
    justify-content: flex-start;
    text-align: left;
  }
  qti-match-interaction.qti-match-tabular qti-simple-match-set:last-of-type qti-simple-associable-choice {
    justify-content: center;
    text-align: center;
  }

  qti-match-interaction:not(.qti-match-tabular) { /* keep as-is */ }
}
```

### Verification

- Visual snapshot on Storybook unchanged or improved.
- Chromatic story comparison shows only the intended changes.

---

## Phase 4 — Storybook story + tests

### Storybook

- Run the existing `qti-match-interaction.stories.ts` tabular story; confirm rendering, click handling, correct-response visualization.
- Add a story variant with **rich content** in choices (bold, image, multi-paragraph) — this is the killer feature the slot approach unlocks. With `cloneNode`, rich content gets stripped to a snapshot; with slots, it stays live.

### Unit / browser tests

- Re-run `match-interaction` browser tests. Assert `<table>` no longer present; the new `[part="grid"]`, `[part="corner"]`, `[part="cells"]`, etc. are present in the shadow root.
- New assertion: when `qti-match-tabular` is present, the first lightdom match-set has `slot="rows"` and the second has `slot="columns"`. When the class is removed at runtime, both attributes are cleared so the default `<slot>` reclaims them. Use this same test to prove the mixin is symmetric.
- New assertion: editing a choice's text in lightdom (`textContent = 'x'`) updates the displayed header without a re-render call (slot projection is live).

---

## Phase 5 — Final verification

- [ ] `grep -R "cloneNode" packages/interactions/match-interaction/src/` returns nothing.
- [ ] `grep -R 'part="table"\|part="r-header"\|part="c-header"\|part="row"\|part="input-cell"' packages/interactions/match-interaction/src/` returns nothing.
- [ ] Storybook + Chromatic unchanged (or expected diffs only).
- [ ] No new console warnings; all existing tests green.
- [ ] Editor consumers (qti-prosemirror-item) that mount `<qti-match-interaction class="qti-match-tabular">` still work — including ITEM010 in QTI-Editor.

---

## Decisions (locked in)

1. **Hard break with migration doc.** No alias parts. The PR couples component + theme + migration doc. New file: `packages/interactions/match-interaction/MIGRATION-tabular-slots.md` (or equivalent location consistent with the repo's docs convention). Content: before/after `::part(...)` table, a one-line note that header rendering is now slot-projected lightdom (so consumer-side CSS that targeted `::part(r-header)`/`::part(c-header)`/`::part(row)`/`::part(input-cell)`/`::part(table)` needs to retarget the new parts), and a snippet showing the rich-content-in-choices upgrade path that the new approach unlocks.
2. **Auto slot assignment via `setAttribute('slot', '…')`.** No `createRenderRoot()` override, no manual slot assignment. The mixin sets `slot="rows"` and `slot="columns"` on the two lightdom `<qti-simple-match-set>` elements from `updated()` when the host has the `qti-match-tabular` class; clears them when it doesn't. The lightdom-mutation concern that drove manual assignment in the editor (ProseMirror's mutation observer triggering reconciliation) does not apply at qti-components runtime, and auto assignment keeps the existing default `<slot>` + `<slot name="prompt">` wiring (used by the drag-drop path and by `<qti-prompt>` self-assignment) working unchanged.
3. **Co-located mixin** at `packages/interactions/match-interaction/src/match-tabular-mixin.ts` — separation of concerns only, not reuse.

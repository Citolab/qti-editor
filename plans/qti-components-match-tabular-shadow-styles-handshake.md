# Plan: Port the editor's tabular shadow structure into qti-components, with a styles handshake

## Goal

1. In qti-components' `<qti-match-interaction>`, when the host carries `class="qti-match-tabular"`, render the **same shadow tree** the editor renders today (`.grid > .corner | .cols-wrap | .rows-wrap | .checkbox-grid`, CSS Grid + subgrid + `display: contents` on slotted match-sets). Same `part` names on both sides.
2. Leave the non-tabular drag-drop path untouched (mixins, response semantics, `validate()`, `toggleInternalCorrectResponse()`, `toggleCandidateCorrection()`).
3. Update qti-theme's `qti-match-interaction.css` so its tabular block targets the new `part` names. Drag-drop block untouched.
4. Export both the shadow stylesheet (`tabularShadowStyles`) and the lightdom adopted-stylesheet content (`tabularLightdomStyles`) from qti-components so the editor consumes them instead of redeclaring its own copy. The editor keeps **zero visual CSS** for tabular — only structural CSS the qti-theme stylesheet doesn't cover.

## Phase 0 — Documentation discovery (DONE — facts banked below)

### Confirmed facts (qti-components side, citations in discovery agent report)

- `DragDropSlottedMixin` (`packages/interactions/core/src/mixins/drag-drop-observables/drag-drop-slotted.mixin.ts:40-56`) and `DragDropSlottedSortableMixin` (`drag-drop-slotted-sortable.mixin.ts:27-30`) **do NOT override `createRenderRoot()` or declare `static shadowRootOptions`**.
- Neither mixin **calls `shadowRoot.querySelector('slot')`** or attaches **`slotchange`** listeners.
- Neither mixin uses **`MutationObserver`** (uses `observable-polyfill` event streams for pointer events only).
- The mixin **DOES write `slot=""` attribute** on lightdom elements during drag-drop (`drag-drop-slotted.mixin.ts:390-397`, also `drag-drop-slotted-sortable.mixin.ts:193`). It expects **auto slot assignment** to route those elements.
- Element discovery in the mixins uses `this.querySelectorAll(draggablesSelector)` against **lightdom**, not slot-assigned content. So shadow-side slot routing doesn't affect mixin selectors.
- `Interaction` base (`packages/qti-base/src/abstract/interaction.ts`) does **NOT** override `createRenderRoot` or declare `shadowRootOptions`. It declares `response` as **abstract**.
- The `response` getter on `DragDropSlottedMixin` returns a **comma-separated string** like `"choice1 drop1,choice2 drop2"` (not the JSON-array shape used by the editor's tabular controller). The setter handles either `string` or `string[]`.

### Critical consequence for the plan

Because the drag-drop mixin writes `slot=""` and expects auto-routing, **we CANNOT set `slotAssignment: 'manual'` element-wide** in qti-components. The editor's choice to use manual slot assignment was specifically driven by ProseMirror's mutation observer hostility to lightdom attribute writes; that constraint does not apply at qti-components runtime.

**Decision (locked in for qti-components):** Use **auto slot assignment** (default Lit shadow root). In tabular mode, write `slot="rows"` and `slot="columns"` on the two lightdom `<qti-simple-match-set>` elements in `updated()` (idempotent). In non-tabular mode, clear those attributes so the default `<slot>` reclaims them for the drag-drop mixin. The editor keeps **manual slot assignment** locally — both implementations end up projecting the same DOM into the same shadow template via different routing mechanisms.

### Confirmed facts (editor side, banked from this session)

- Editor uses `static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' }` and `slot.assign(matchSet)` in `updated()`.
- Editor's `tabularStyles` is currently inlined in `match-tabular.ts` (cross-module `css` template literals proved unreliable in this monorepo — `CSSResult` constructor identity check fails silently and styles don't adopt).
- Editor's `adoptTabularLightdomStyles()` adopts a one-rule stylesheet into `document.adoptedStyleSheets` hiding `::part(dropslot)` on choices inside `.qti-match-tabular`.

### Allowed APIs

| API | Use for | Source |
|---|---|---|
| `css\`...\`` tagged template | Shadow stylesheet | Lit docs |
| `unsafeCSS(rawString)` | Cross-module styles sharing without CSSResult identity issue | Lit docs |
| `new CSSStyleSheet()` + `replaceSync()` + `document.adoptedStyleSheets.push(...)` | Lightdom adopted stylesheet | CSSOM / Constructable Stylesheets |
| `Element.setAttribute('slot', '…')` | Auto slot routing in qti-components | DOM |
| `slot.assign(...)` | Manual slot routing in editor | DOM (Lit 3 supports) |
| `static shadowRootOptions` | Configure shadow root attach options (editor only) | Lit docs |

### Anti-patterns (banked from this session)

- ❌ **Never split `css` template literals across packages** without a string-mediated fallback. Use `unsafeCSS(rawText)` for cross-package sharing and ship the raw text alongside the `CSSResult` from qti-components.
- ❌ **Never override `createRenderRoot()`** to add `slotAssignment` — that path bypasses Lit's automatic `adoptStyles`. Use `static shadowRootOptions` instead. (Applies to the editor side only — qti-components stays auto.)
- ❌ **Never write to the host's `style` attribute.** ProseMirror reconciliation loops were caused by this; even outside PM, host-level inline styles bleed onto consumer overrides. Grid template goes on a shadow-side `.grid` element.
- ❌ **Never `cloneNode` choice content into shadow cells.** The whole point of the slot/subgrid structure is live header rendering. The existing qti-components `<table>` cloneNode path goes away.

---

## Phase 1 — Lock in the part-name list and the lightdom rule list

### Part names (used identically by qti-components and the editor)

| Part | Element | Purpose |
|---|---|---|
| `grid` | `<div class="grid">` (top-level shadow container) | Outer grid background, border, radius |
| `corner` | `<div class="corner">` (1,1) | Top-left empty cell |
| `cols-wrap` | `<div class="cols-wrap">` (row 1, cols 2/-1) | Column-headers subgrid wrapper |
| `rows-wrap` | `<div class="rows-wrap">` (rows 2/-1, col 1) | Row-headers subgrid wrapper |
| `checkbox-grid` | `<div class="checkbox-grid">` (2/-1, 2/-1) | Checkbox subgrid |
| `cell` | `<div class="cell">` | Each radio/checkbox cell |
| `rb` | `<input type="radio">` | Radio (when `match-max === 1`) |
| `rb-checked` | `<input type="radio">` add-on | Checked state for `rb` |
| `rb-correct` | `<input type="radio">` add-on | Correct-response visualization |
| `rb-incorrect` | `<input type="radio">` add-on | Incorrect-response visualization |
| `cb` | `<input type="checkbox">` | Checkbox (when `match-max > 1`) |
| `cb-checked` | `<input type="checkbox">` add-on | Checked state for `cb` |
| `cb-correct` | `<input type="checkbox">` add-on | Correct-response visualization |
| `cb-incorrect` | `<input type="checkbox">` add-on | Incorrect-response visualization |
| `checkmark` | `<svg>` overlay | Checkmark inside checked checkbox |
| `message` | `<div role="alert">` (qti-components only) | Validation message — editor doesn't render this |

Notes:
- `rb-correct`/`cb-incorrect` etc. are emitted as **separate tokens** in the input's `part` attribute, not concatenated names. The qti-theme already does this (`::part(rb-checked rb-correct)`).
- The editor's shadow template doesn't need `message`; it's harmless to omit. qti-components keeps it for validation feedback.

### Hard-break: parts retired

The old qti-theme tabular rules used these parts (no longer emitted by either implementation after this change):

- `table`, `r-header`, `c-header`, `row`, `input-cell`

These get removed from the stylesheet in Phase 4. Migration doc (Phase 6) lists the mapping for downstream consumers.

### Lightdom rule list (lives in `tabularLightdomStyles`)

```css
qti-match-interaction.qti-match-tabular qti-simple-associable-choice::part(dropslot) {
  display: none;
}
```

That's it for now. The qti-theme stylesheet handles all the **visual** styling of the shadow parts. The lightdom rule exists because `::part()` can only cross one shadow boundary — a shadow-side rule can't reach into the choice's shadow root.

### Difficulty: 1/5 (decision only)

---

## Phase 2 — Create `packages/interactions/match-interaction/src/match-interaction-tabular-styles.ts`

### What to implement

A new file co-located with `qti-match-interaction.ts`. Exports:

```ts
import { css, type CSSResultGroup, unsafeCSS } from 'lit';

/** Raw stylesheet text for the shadow template — keep this as the single
 *  source of truth so cross-package consumers (the editor) can rebuild a
 *  `CSSResult` against their own `css` tag without hitting the CSSResult
 *  constructor-identity issue. */
export const tabularShadowStylesText = String.raw`
  /* :host(.qti-match-tabular) {} — base layout block */
  :host(.qti-match-tabular) [part="grid"] {
    display: grid;
    border: 1px solid var(--qti-border-color, #ddd6c7);
    border-radius: 10px;
    overflow: hidden;
    background: var(--qti-background, #fff);
    font-size: 0.92rem;
  }
  :host(.qti-match-tabular) [part="corner"] {
    grid-column: 1; grid-row: 1;
    display: flex; align-items: center;
    padding: 0 0.75rem;
    color: var(--qti-muted-foreground, #6b4226);
    font-weight: 600;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }
  :host(.qti-match-tabular) [part="cols-wrap"] {
    grid-column: 2 / -1; grid-row: 1;
    display: grid; grid-template-columns: subgrid;
  }
  :host(.qti-match-tabular) [part="rows-wrap"] {
    grid-column: 1; grid-row: 2 / -1;
    display: grid; grid-template-rows: subgrid;
  }
  :host(.qti-match-tabular) slot { display: contents; }
  :host(.qti-match-tabular) ::slotted(qti-simple-match-set) { display: contents; }
  :host(.qti-match-tabular) [part="checkbox-grid"] {
    grid-column: 2 / -1; grid-row: 2 / -1;
    display: grid;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
  }
  :host(.qti-match-tabular) [part="cell"] {
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }
  /* `[part~="rb"]` / `[part~="cb"]` matches because parts are space-separated
     tokens — see the toDOM/render in Phase 3. The visual styling for rb/cb,
     rb-checked, cb-correct, etc. lives in qti-theme, not here. */
`;

/** Pre-built CSSResult for qti-components' own static styles array. */
export const tabularShadowStyles: CSSResultGroup = css`${unsafeCSS(tabularShadowStylesText)}`;

/** Raw text for the lightdom rule. Editor and qti-components both adopt this
 *  into document.adoptedStyleSheets exactly once. */
export const tabularLightdomStylesText = String.raw`
  qti-match-interaction.qti-match-tabular qti-simple-associable-choice::part(dropslot) {
    display: none;
  }
`;

/** Helper that adopts the lightdom stylesheet into document.adoptedStyleSheets
 *  exactly once per page. Safe to call from a controller constructor. */
let lightdomSheetAdopted = false;
export function adoptTabularLightdomStyles(): void {
  if (lightdomSheetAdopted) return;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(tabularLightdomStylesText);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  lightdomSheetAdopted = true;
}
```

### Verification

- `grep -R "tabularShadowStyles\|tabularLightdomStyles" packages/interactions/match-interaction/src/` returns the named exports.
- The module imports only from `lit` — no peer-package deps.
- The file's `package.json` `exports` field gets a new subpath if qti-components publishes per-subpath; otherwise it's pulled via the package's main `src/index.ts` (Phase 6).

### Anti-pattern guards

- ❌ Do NOT export only the `CSSResult`. Cross-package `CSSResult` identity fails silently — both `tabularShadowStyles` and `tabularShadowStylesText` MUST be exported.
- ❌ Do NOT put visual rules for `rb` / `cb` / `rb-checked` etc. in here. Those stay in `qti-theme`. The shadow stylesheet only contains the **structural** layout (grid + subgrid + slot tricks).

### Difficulty: 2/5

---

## Phase 3 — Refactor `qti-match-interaction.ts` in qti-components

### What to implement

1. **`static styles` composition**: add `tabularShadowStyles` to the existing static styles array.
2. **No `shadowRootOptions` change** — keep auto slot assignment because the drag-drop mixin writes `slot=""` and expects auto-routing.
3. **`updated()` hook**: when `qti-match-tabular` is in the class list, set `slot="rows"` on the first lightdom match-set and `slot="columns"` on the second, idempotently. When the class is removed at runtime, clear those slot attributes so the default `<slot>` reclaims them.
4. **`render()`**: split into `renderTabularMatrix()` (new) and the existing drag-drop branch. The tabular branch returns:

   ```ts
   return html`
     <slot name="prompt"></slot>
     <div part="grid">
       <div part="corner"></div>
       <div part="cols-wrap"><slot name="columns"></slot></div>
       <div part="rows-wrap"><slot name="rows"></slot></div>
       <div part="checkbox-grid">
         ${rows.flatMap((rowEl, r) => cols.map((colEl, c) => this.renderCell(rowEl, colEl, r, c)))}
       </div>
     </div>
     <div role="alert" part="message" id="validation-message"></div>
   `;
   ```

   The `renderCell` helper builds the `<div part="cell">` with the input + part-token computation already in place at qti-match-interaction.ts:246-249. **Copy verbatim** from the current `render()` lines 246-285 — only the wrapping cell element changes (`<td part="input-cell">` → `<div part="cell">`).

5. **Delete `cloneNode` in the tabular render** — the slotted choices project live. The non-tabular `toggleInternalCorrectResponse()` path that uses `cloneNode` for the correct-response preview chips (lines 152-157) stays unchanged.

### Documentation references

- `tabular-shadow-styles-text` (Phase 2) is the only source of structural shadow CSS.
- Editor's current `match-tabular.ts:renderRowCells` at `packages/prose-qti/src/components/match/components/qti-match-interaction/match-tabular.ts` shows the cell-rendering pattern (radio/checkbox + `data-pair` attr) — copy that, but reinstate qti-components' correct-response tokens (`rb-correct` / `cb-incorrect` / etc.) which the editor doesn't emit.

### Verification

- `grep -R "<table" packages/interactions/match-interaction/src/qti-match-interaction.ts` returns 0 hits in the tabular branch.
- `grep -R "cloneNode" packages/interactions/match-interaction/src/qti-match-interaction.ts` returns 0 hits in the tabular branch (only the correct-response preview path keeps it).
- Existing drag-drop story unchanged visually (Chromatic).
- Tabular story shows the new grid layout with all checked / correct / incorrect states styled correctly by the updated qti-theme stylesheet (Phase 4).

### Anti-pattern guards

- ❌ Do NOT touch the drag-drop mixin chain — `SlottedBase = DragDropSlottedMixin(Interaction, ...)`, `extends DragDropSlottedSortableMixin(SlottedBase, ...)`.
- ❌ Do NOT add `static shadowRootOptions` — the mixin writes `slot=""` and needs auto routing.
- ❌ Do NOT change the `response` getter/setter — it stays comma-separated.
- ❌ Do NOT remove `<div role="alert" part="message">` — the validate path depends on it.

### Difficulty: 4/5

The render template translation is mechanical, but the `updated()` slot-attribute toggling and the runtime mode-switch behavior need a manual smoke test. The render template translation is the bulk of the work; ~80 lines.

---

## Phase 4 — Rewrite the tabular block in `packages/qti-theme/src/styles/qti-theme/interactions/qti-match-interaction.css`

### What to implement

Replace lines 2–101 (the entire `qti-match-interaction.qti-match-tabular { ... }` block) with the new rules below. **Keep** lines 102+ untouched (the non-tabular drag-drop rules).

```css
@layer qti-components {
  qti-match-interaction.qti-match-tabular {
    &::part(message) {
      @apply validation-message;
    }
    /* `grid` / `corner` / `cols-wrap` / `rows-wrap` / `checkbox-grid` / `cell`
       structural layout is provided by tabularShadowStyles in the component
       itself; this theme block only adds visual chrome. */
    &::part(cell) {
      min-height: 48px;
      padding: 8px;
    }
    &::part(rb) {
      appearance: none;
      width: 24px; height: 24px;
      border-radius: 50%;
      border: 2px solid var(--qti-border-active, #2196f3);
      background-color: transparent !important;
      cursor: pointer;
      display: block;
    }
    &::part(rb-checked) {
      box-shadow: inset 0 0 0 6px var(--qti-border-active, #2196f3);
    }
    &::part(cb) {
      appearance: none;
      width: 24px; height: 24px;
      border-radius: 3px;
      border: 2px solid var(--qti-border-active, #2196f3);
      background-color: transparent !important;
      cursor: pointer;
      display: block;
    }
    &::part(cb-checked) {
      background-color: var(--qti-border-active, #2196f3) !important;
    }
    &::part(checkmark) {
      position: absolute;
      width: 18px; height: 18px;
      top: 3px; left: 3px;
      pointer-events: none;
    }
    &::part(rb-correct)             { border-color: var(--qti-correct, #4caf50); }
    &::part(rb-checked rb-correct)  { box-shadow: inset 0 0 0 6px var(--qti-correct, #4caf50); }
    &::part(cb-correct)             { border-color: var(--qti-correct, #4caf50); }
    &::part(cb-checked cb-correct)  { background-color: var(--qti-correct, #4caf50) !important; }
    &::part(rb-incorrect)           { border-color: var(--qti-incorrect, #f44336); }
    &::part(rb-checked rb-incorrect){ box-shadow: inset 0 0 0 6px var(--qti-incorrect, #f44336); }
    &::part(cb-incorrect)           { border-color: var(--qti-incorrect, #f44336); }
    &::part(cb-checked cb-incorrect){ background-color: var(--qti-incorrect, #f44336) !important; }
  }
  /* Non-tabular drag-drop rules untouched */
}
```

### Verification

- Chromatic story diff shows tabular variants pixel-identical (modulo intentional structural differences if any).
- `grep -R '::part(table)\|::part(r-header)\|::part(c-header)\|::part(row)\|::part(input-cell)' packages/qti-theme/src/` returns 0 hits.

### Difficulty: 2/5

---

## Phase 5 — Editor adopts qti-components' exports

### Edit

`packages/prose-qti/src/components/match/components/qti-match-interaction/match-tabular.ts`:

1. Remove the inlined `tabularStyles` `css` block.
2. Remove `adoptTabularLightdomStyles()` and `lightdomSheetAdopted`.
3. Import from qti-components:
   ```ts
   import {
     tabularShadowStylesText,
     adoptTabularLightdomStyles,
   } from '@qti-components/match-interaction/tabular-styles';
   import { css, unsafeCSS } from 'lit';

   export const tabularStyles = css`${unsafeCSS(tabularShadowStylesText)}`;
   ```
4. Call `adoptTabularLightdomStyles()` once in `TabularController` constructor (already does this — just swap the implementation source).
5. Update the editor's host element template so the shadow tree uses the same `part` attributes (just add `part="grid"` etc. — the class names stay too for any editor-only selectors that might be added later).

### Sub-path export

In qti-components' `packages/interactions/match-interaction/package.json`, add the subpath:

```json
{
  "exports": {
    "./tabular-styles": {
      "types": "./dist/match-interaction-tabular-styles.d.ts",
      "import": "./dist/match-interaction-tabular-styles.js"
    }
  }
}
```

(Verify against the package's existing exports map — adjust to match its convention; this snippet is illustrative.)

### Verification

- Editor's tabular ITEM010 still renders identically.
- `grep -R "tabularStylesText" packages/prose-qti/` shows the editor importing it from qti-components.
- DevTools confirms `adoptedSheets > 0` on document (qti-components adopted) and `> 0` on the host's shadowRoot (Lit adopted from `static styles`).

### Difficulty: 3/5

The cross-package import + the package.json export wiring is mechanical but easy to get wrong (subpath typos, missing build step). Verify in the editor before declaring done.

---

## Phase 6 — Migration doc, Storybook, tests

### Migration doc

Add `packages/interactions/match-interaction/MIGRATION-tabular-parts.md`:

| Old part | Replacement | Notes |
|---|---|---|
| `::part(table)` | `::part(grid)` | Container element |
| `::part(r-header)` | n/a — header cells are now slot-projected lightdom | Targets shifted to lightdom; style choices via descendant selectors |
| `::part(c-header)` | n/a — see above | |
| `::part(row)` | n/a | Rows no longer exist as wrapper elements |
| `::part(input-cell)` | `::part(cell)` | Cell wrapping the input |
| `::part(rb)` / `::part(cb)` / `::part(rb-checked)` / etc. | unchanged | Input-level parts stay |
| `::part(message)` | unchanged | Validation message stays |

Plus a short paragraph explaining the rendering change ("`<table>` with cloned content is now a CSS Grid with slot-projected live lightdom choices") and the upgrade unlocked (rich content — bold, italic, images — inside choices renders live as headers).

### Storybook

- The existing `qti-match-interaction.stories.ts` tabular story should pass unchanged visually.
- Add a new story variant with **markup inside choices** (bold, em, img) to demonstrate the live-projection win that `cloneNode` blocked.

### Tests

- Browser/DOM tests for the new render: assert `<div part="grid">`, count of `<div part="cell">` = N × M, presence of `slot[name="rows"]` / `slot[name="columns"]` slots.
- Assert that toggling the `qti-match-tabular` class at runtime correctly clears the `slot="rows"` / `slot="columns"` lightdom attributes (when removing) and re-adds them (when re-adding).
- Assert that `response`, `validate()`, `toggleInternalCorrectResponse(true)`, `toggleCandidateCorrection(true)` all keep their existing behavior in tabular mode.

### Difficulty: 3/5

---

## Final verification checklist

- [ ] `grep -R "<table" packages/interactions/match-interaction/src/qti-match-interaction.ts` returns 0 hits in the tabular branch.
- [ ] `grep -R "::part(table)\|::part(r-header)\|::part(c-header)\|::part(row)\|::part(input-cell)" packages/qti-theme/src/` returns 0 hits.
- [ ] qti-components Storybook tabular story renders correctly; Chromatic diff is intentional only.
- [ ] qti-components non-tabular drag-drop story renders identically (no regression).
- [ ] Editor's ITEM010 (tabular) renders identically and consumes `tabularShadowStylesText` + `adoptTabularLightdomStyles` from qti-components — no inlined copy remains in `match-tabular.ts`.
- [ ] No new TypeScript errors in either package.
- [ ] Migration doc lives at `packages/interactions/match-interaction/MIGRATION-tabular-parts.md`.

---

## Difficulty summary

| Phase | Difficulty | Notes |
|---|---|---|
| 0. Discovery | done | Banked above |
| 1. Part-name + lightdom rule decisions | 1/5 | Decision only |
| 2. Create `match-interaction-tabular-styles.ts` | 2/5 | Export raw text + CSSResult + adopt helper |
| 3. Refactor `qti-match-interaction.ts` | 4/5 | Template translation + idempotent slot-attribute toggling |
| 4. Rewrite tabular block in qti-theme stylesheet | 2/5 | Mechanical part-name swap |
| 5. Editor consumes qti-components exports | 3/5 | Cross-package import + subpath wiring |
| 6. Migration doc + Storybook + tests | 3/5 | Especially the rich-content story |

Total: solidly doable in one focused session if Phases 2-4 land cleanly. Phase 5 is the only one with cross-repo coordination — order matters (qti-components must publish before the editor can import).

---

## Risks

1. **DragDropSlottedMixin manual-routing incompatibility** — resolved by keeping auto slot assignment in qti-components. The editor stays on manual (for ProseMirror reasons). Both project the same shadow DOM; the routing mechanism differs but is invisible to consumers.
2. **Cross-package `CSSResult` identity** — already hit in this session. Mitigation: export `tabularShadowStylesText: string` AND `tabularShadowStyles: CSSResult` from qti-components. The editor reconstructs its own `CSSResult` via `css\`${unsafeCSS(text)}\`` using its own Lit. Lossless.
3. **Consumer `::part(table)` overrides break silently** — the migration doc (Phase 6) is the only mitigation. Hard break — no aliases.
4. **The qti-components mixin writes `slot=""` during drops** — if a consumer toggles the tabular class at runtime after drops have happened, mixed slot attributes may remain on dropped clones. Mitigation: the orchestrator's `updated()` should clear any stray `slot=""` it didn't author. (Detail to handle in Phase 3.)
5. **Storybook story selectors targeting old parts** — Phase 6 includes a sweep for `data-test*` / `::part(...)` selectors in story / test code.

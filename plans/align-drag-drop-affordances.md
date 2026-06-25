# Align drag-drop affordances across the four QTI interactions

Unify the **pending state visual** and the **fake-drag chip** across `qti-match-interaction`, `qti-gap-match-interaction`, `qti-order-interaction`, `qti-associate-interaction`. Take styling cues from the existing `@qti-components/theme` runtime palette so the editor visually matches what authors see at runtime. Split the prosemirror-item app stylesheet into `app.css` (chrome) + `qti.css` (everything QTI) on the way through.

**Architectural decision**: transient UI state is expressed via `ElementInternals.states` + the `:state(name)` CSS pseudo-class — **not** via DOM attributes. This makes it structurally impossible for editor-only state to leak into the serialized QTI XML (states aren't attributes, so neither ProseMirror's mutation observer nor `DOMSerializer` can see them). Where the drop target isn't already a custom element (order, associate render shadow `<div part="drop-list">`), wrap it in a new tiny `<qti-edit-drop-slot>` custom element so `:state()` applies uniformly.

The codebase already uses `ElementInternals` in two places — [qti-choice-interaction.ts:36-41](packages/prose-qti/src/components/choice/components/qti-choice-interaction/qti-choice-interaction.ts#L36-L41) and [qti-simple-associable-choice.ts:121-124](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice.ts#L121-L124) — so this is following an established pattern, not introducing one.

Pending state machine is already shared via `PendingSelectionController` — this plan is **styling + chip render + state plumbing**, no behavior changes to the selection state machine itself.

---

## Phase 0 — Discovery (already done; baked into the phases below)

Source of truth: `@qti-components/theme/src/styles/qti-theme/qti-base.css` and the per-interaction CSS under `interactions/`.

Canonical CSS variables (from `qti-base.css`):

| Var | Default | Meaning |
|---|---|---|
| `--qti-border-color` | `#c6cad0` | idle drop dashed line |
| `--qti-border-active` | `#f86d70` | pending drop border |
| `--qti-bg-active` | `#ffecec` | pending drop fill |
| `--qti-bg` | `#fff` | idle drop fill |
| `--qti-border-thickness` | `2px` | drop dash thickness |
| `--qti-correct` | `#2e7d32` | filled chip border |
| `--qti-incorrect` | `#ef5350` | (feedback only) |

Canonical drop-target selectors used at runtime:

| Interaction | Selector |
|---|---|
| match | `qti-simple-associable-choice::part(dropslot)` |
| gap-match | `qti-gap` (lightdom) |
| order | `qti-order-interaction::part(drop-list)` |
| associate | `qti-associate-interaction::part(drop-list)` |

Current editor divergences (full table in agent report; abbreviated):

| | match | gap-match | order | associate |
|---|---|---|---|---|
| Pending signal | `[active]` + `--qti-dropslot-selecting` | `[data-pending]` | `[data-pending-target]` | `[active]` |
| Filled signal | implicit (fakeDrags.length) | `[data-filled]` | `[data-filled]` | `.filled` class |
| Chip render | `qti-simple-associable-choice` shadow | none | inline span+button | inline span+button |
| Remove × visible | always | n/a | always | always |
| Chip colors | hardcoded green | n/a | from app style.css | unstyled span |

---

## Phase 1 — Split `style.css` into `app.css` + `qti.css` and seed theme vars

**Goal:** All QTI-related editor styling lives in one file that imports the `@qti-components/theme` palette. App chrome (header, panes, layout, scrollbars) stays separate.

**Files:**
- Create `apps/qti-prosemirror-item/src/app.css` — keep everything currently in `style.css` that is NOT a qti-* selector (`:root`, `body`, `header`, `#editor`, `#item-pane`, `#attributes-pane`, responsive rules, etc.)
- Create `apps/qti-prosemirror-item/src/qti.css` — move every `qti-*` rule out of `style.css` into here. Includes the recent `qti-gap`, `qti-gap-text`, `qti-order-interaction::part(...)`, `qti-associate-interaction::part(...)`, and the new ones added in later phases.
- Update `apps/qti-prosemirror-item/src/main.ts` (or whatever imports `style.css`) to import both:
  ```ts
  import './app.css';
  import './qti.css';
  ```
- Delete `style.css` once both new files exist and are imported.

**At the top of `qti.css`** add a `:root` block that *aliases* canonical theme vars to short local names — but always with the theme's value as the default so we stay in sync:

```css
:root {
  /* Drop target — pending */
  --qti-edit-drop-pending-border: var(--qti-border-active, #f86d70);
  --qti-edit-drop-pending-bg:     var(--qti-bg-active,    #ffecec);
  /* Drop target — idle */
  --qti-edit-drop-idle-border:    var(--qti-border-color, #c6cad0);
  --qti-edit-drop-idle-bg:        var(--qti-bg,           #fff);
  /* Chip — filled drop assignment */
  --qti-edit-chip-border:         var(--qti-correct,      #22c55e);
  --qti-edit-chip-bg:             #f0fdf4;
  --qti-edit-chip-text:           inherit;
}
```

These names are intentional: app authors override the LEFT side; the runtime palette still drives the RIGHT side. One source of truth.

**Verification:**
- `grep -rn "from './style.css'" apps/qti-prosemirror-item/src` returns zero hits.
- App still loads (no missing import errors).
- DevTools "Computed" panel on a `qti-gap` shows the new var resolving to `#f86d70` when pending.

**Anti-pattern guard:** Do NOT replicate theme values inline — always go through the var with the theme value as fallback. Do not delete `style.css` until you've verified main.ts imports both new files.

---

## Phase 1.5 — ElementInternals + `<qti-edit-drop-slot>` custom element

**Goal:** Every drop target becomes a custom element with `ElementInternals` so its UI state is expressed via `internals.states.add('pending')` (etc.) and CSS targets it via `:state(pending)`. No more `data-pending` / `[active]` / `[data-pending-target]` attributes for editor-only state.

### 1.5.A — Adopt `ElementInternals` on the existing custom-element drop targets

Two of the four drop targets are already custom elements; just attach internals (one already has them).

**qti-simple-associable-choice** — already has `this.internals = this.attachInternals()` at [line 124](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice.ts#L124). No code change. Will start calling `.internals.states.add('pending')` from the match interaction's `onPendingChanged` handler in Phase 2.

**qti-gap** — needs internals. In [qti-gap.ts](packages/prose-qti/src/components/shared/components/qti-gap/qti-gap.ts) add:
```ts
public internals: ElementInternals;
constructor() {
  super();
  this.internals = this.attachInternals();
}
```

**qti-gap-text** — same; needs internals for the `:state(selected)` / `:state(linked)` / `:state(disabled)` source affordances. Same constructor pattern.

### 1.5.B — Create `<qti-edit-drop-slot>` for order and associate

Two of the four drop targets are shadow-DOM `<div part="drop-list">` rendered by their interaction's shadow template. Replace them with a small custom element so `:state()` works there too.

**New file**: `packages/prose-qti/src/components/shared/components/qti-edit-drop-slot/qti-edit-drop-slot.ts`

```ts
import { LitElement, html } from 'lit';

/**
 * Editor-only drop-slot custom element. Wraps the rendered content of any
 * drop target whose visible element isn't already a custom element (order's
 * `.order-slot`, associate's `.dl`). Exists so `:state(pending|filled)` CSS
 * applies uniformly across all four drag-drop interactions.
 *
 * Pure UI state — never serialized, no attrs.
 */
export class QtiEditDropSlot extends LitElement {
  public internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  override createRenderRoot() {
    return this; // light-dom render so the inline content stays styleable
  }

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('qti-edit-drop-slot')) {
  customElements.define('qti-edit-drop-slot', QtiEditDropSlot);
}
```

Export from `packages/prose-qti/src/components/shared/index.ts`.

**Refactor [qti-order-interaction.ts](packages/prose-qti/src/components/order/components/qti-order-interaction/qti-order-interaction.ts)** (around the `_renderSlots()` method, ~line 245):
- Replace `<div class="order-slot" part="drop-list" data-slot-index=${index}>...</div>` with `<qti-edit-drop-slot part="drop-list" data-slot-index=${index}>...</qti-edit-drop-slot>`.
- The controller's `resolveTarget` continues to read `el.dataset.slotIndex` — drop slot is now a `<qti-edit-drop-slot>` element but the data-slot-index attribute lookup is unchanged (this is **identity** data, not editor state).
- Toggle pending/filled state via `slotEl.internals.states.add('pending')` / `'filled'` driven from a small sync step at render time (or in `updated()`).

**Refactor [qti-associate-interaction.ts](packages/prose-qti/src/components/associate/components/qti-associate-interaction/qti-associate-interaction.ts)** (around `_renderDropContainer()`, ~lines 301-330):
- Same swap — `<div class="dl" part="drop-list" data-drop-slot=…>` → `<qti-edit-drop-slot part="drop-list" data-drop-slot=…>`. Drop the inline `?active=…` attribute (Phase 2's `:state(pending)` rule replaces it).
- After render, walk the rendered drop slots and call `internals.states.add('pending')` on the ones that are empty while a source is pending.

### 1.5.C — A small reactive controller to sync `:state` from data

Setting `internals.states` imperatively in `updated()` is annoying boilerplate. Add `packages/prose-qti/src/components/shared/controllers/dom-state-sync.ts`:

```ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface DomStateSyncTarget {
  internals: ElementInternals;
}

/**
 * Helper that mirrors a `Set<string>` of state names into the element's
 * `internals.states`, diffed on each host update. Lets render code stay
 * declarative — `controller.set('pending', when)` — without manual add/delete.
 */
export class DomStateSyncController implements ReactiveController {
  private active = new Set<string>();

  constructor(private readonly host: ReactiveControllerHost & DomStateSyncTarget) {
    host.addController(this);
  }

  hostConnected(): void {/* no-op */}

  set(name: string, on: boolean): void {
    if (on === this.active.has(name)) return;
    if (on) this.active.add(name); else this.active.delete(name);
    if (on) this.host.internals.states.add(name); else this.host.internals.states.delete(name);
  }

  clear(): void {
    for (const name of this.active) this.host.internals.states.delete(name);
    this.active.clear();
  }
}
```

Used inside qti-edit-drop-slot, qti-gap, qti-gap-text, and qti-simple-associable-choice to keep render code calling `controller.set('pending', boolean)` instead of poking internals manually.

### Verification (Phase 1.5)

- Devtools console on a `qti-gap`: `$0.matches(':state(pending)')` returns `true` immediately after clicking a gap-text source, `false` after Escape.
- Same for `qti-edit-drop-slot` inside order/associate.
- Workspace typecheck passes: `pnpm -r typecheck`.
- `grep -rn "data-pending\|data-pending-target\|\\bactive=" packages/prose-qti/src/components/{match,gap-match,order,associate}/` returns zero hits in render code (the data attrs are gone).

**Anti-pattern guard:** Do NOT use the legacy `--state-name` syntax (`internals.states.add('--pending')`). Use plain identifiers (`'pending'`) — the modern spec syntax. The existing `--checked` usage in [correct-response-click.mixin.ts:100](packages/prose-qti/src/components/shared/mixins/correct-response-click.mixin.ts#L100) and [qti-inline-choice.ts:48](packages/prose-qti/src/components/inline-choice/components/qti-inline-choice-interaction/qti-inline-choice.ts#L48) is legacy; migrating those is OUT OF SCOPE for this plan (separate cleanup).

Do NOT replace data-* attributes that carry **identity** information (e.g. `data-slot-index`, `data-drop-slot`). Only **state** moves to `:state()`. Identity stays an attribute because the controller's `resolveTarget` reads it.

---

## Phase 2 — One shared pending-state rule for all four drop targets

**Goal:** A single block in `qti.css` styles the pending state identically for all four interactions. Because Phase 1.5 made every drop target a custom element with `:state(pending)`, the selector list collapses to **four custom-element selectors with the same pseudo-class**.

**What to add to `qti.css`:**

```css
/* Idle drop target — shared base. Applies to every CE that represents a
   drop target (qti-gap in lightdom, qti-edit-drop-slot in order/associate
   shadow render, qti-simple-associable-choice in match). */
qti-gap,
qti-edit-drop-slot,
qti-simple-associable-choice {
  border: var(--qti-border-thickness, 2px) dashed var(--qti-edit-drop-idle-border);
  background: var(--qti-edit-drop-idle-bg);
  border-radius: 0.3rem;
  cursor: pointer;
  transition: border-color 150ms ease-out, background 150ms ease-out;
}

/* Pending drop target — uniform `:state(pending)`. Same selector grammar
   across all four interactions, no per-component attribute variation. */
qti-gap:state(pending),
qti-edit-drop-slot:state(pending),
qti-simple-associable-choice:state(pending) {
  border-color: var(--qti-edit-drop-pending-border);
  background: var(--qti-edit-drop-pending-bg);
  animation: qti-edit-drop-pulse 1.2s ease-in-out infinite;
}

/* Filled drop target — solid border, suppresses pending pulse. */
qti-gap:state(filled),
qti-edit-drop-slot:state(filled),
qti-simple-associable-choice:state(filled) {
  border-style: solid;
  border-color: var(--qti-edit-chip-border);
  background: var(--qti-edit-drop-idle-bg);
  animation: none;
}

@keyframes qti-edit-drop-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--qti-edit-drop-pending-border) 45%, transparent); }
  50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--qti-edit-drop-pending-border) 0%, transparent); }
}
```

For match's INNER dropslot (the part inside `qti-simple-associable-choice`'s shadow that holds the fake-drag chips) the existing `--qti-dropslot-selecting` CSS variable mechanism stays — but it now reads its own host state via `:state(pending)`. Add to [qti-simple-associable-choice.ts](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice.ts):

```css
:host(:state(pending)) {
  --qti-dropslot-selecting: dropslot-pulse;
}
```

This replaces the `qti-simple-match-set.slot-wrapper.selecting` external CSS variable plumbing — match's `onPendingChanged` now sets `:state(pending)` directly on each target choice via `internals.states.add('pending')` (in match-drag-drop.ts).

**What to REMOVE from component CSS files** (after Phase 1.5's state plumbing is wired):

- [qti-order-interaction.styles.ts](packages/prose-qti/src/components/order/components/qti-order-interaction/qti-order-interaction.styles.ts) — strip the local `qti-order-dropslot-pulse` keyframes, `.order-slot[data-pending-target]`, `.order-slot[data-filled]` blocks. Keep `:host`, layout/grid, slot flex rules.
- [qti-associate-interaction.styles.ts](packages/prose-qti/src/components/associate/components/qti-associate-interaction/qti-associate-interaction.styles.ts) — already minimal; verify nothing references `[active]` after the render change.
- [qti-simple-associable-choice.ts](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice.ts) — keep the `[part='dropslot']` rule (it reads `--qti-dropslot-selecting`); add the new `:host(:state(pending))` block above.

**What to REMOVE from `qti.css` (migrated from `style.css`)**:

- The old `qti-order-interaction::part(drop-list)` / `qti-associate-interaction::part(drop-list)[active]` / `qti-gap[data-pending]` blocks added in earlier sessions. Replaced wholesale by the three shared rules above.

**What to REMOVE from interaction render code**:

- `qti-order-interaction.ts`: stop emitting `data-pending-target` and `data-filled` attributes from the slot render. The state is now on the `<qti-edit-drop-slot>` via internals.
- `qti-associate-interaction.ts`: stop emitting `?active=…`. State is on `<qti-edit-drop-slot>`.
- `qti-gap-match-interaction.ts`: stop calling `gap.toggleAttribute('data-pending', ...)` and `gap.toggleAttribute('data-filled', ...)` in `applyVisualState`. Call `gap.internals.states.add('pending')` / `.delete('pending')` instead. Same for filled.

**Verification:**
- Click a source in each of the four interactions; every drop target shows the same red dashed pulsing border with `#ffecec` bg.
- Sample one drop target per interaction in DevTools console: `$0.matches(':state(pending)')` is `true`; `$0.getAttributeNames()` contains NO `data-pending` / `data-pending-target` / `active`.
- Saving the document and re-loading roundtrips identically — the regression `ITEMxxx.xml` ↔ `ITEMxxx-editor.xml` fixtures pass.

**Anti-pattern guard:** Do not invent new part names. Do not rename `dropslot` (used by the qti-components runtime theme). Do not duplicate the `@keyframes`. Do not use the legacy `:state(--pending)` dashed syntax.

---

## Phase 3 — Canonical fake-drag chip render contract

**Goal:** Same DOM shape, same CSS, hover-only ×, across match / order / associate. Decide for gap-match (recommendation: skip the chip since `qti-gap` already shows the assigned label inline — but DO add the hover-× remove via a small adjustment).

**Canonical chip DOM:**

```html
<span class="qti-edit-chip" part="chip" data-identifier="${id}">
  <span part="chip-label">${label}</span>
  <button type="button" part="chip-remove" aria-label="Remove">×</button>
</span>
```

**Steps:**

1. **Add a tiny shared Lit helper** at `packages/prose-qti/src/components/shared/render/chip.ts`:
   ```ts
   import { html, type TemplateResult } from 'lit';
   export function renderEditChip(label: string, identifier: string, onRemove: (e: Event) => void): TemplateResult {
     return html`
       <span class="qti-edit-chip" part="chip" data-identifier=${identifier}>
         <span part="chip-label">${label}</span>
         <button type="button" part="chip-remove" aria-label="Remove" @click=${onRemove}>×</button>
       </span>
     `;
   }
   ```
   Export from `packages/prose-qti/src/components/shared/index.ts`.

2. **Replace inline chip renders** in:
   - `qti-order-interaction.ts` (~ lines 257–266) — currently `<span class="fake-drag">...</span>` — call `renderEditChip(...)`.
   - `qti-associate-interaction.ts` (~ lines 310–328) — currently `<span>${label}</span><button class="slot-remove">×</button>` — call `renderEditChip(...)`.
   - `qti-simple-associable-choice.ts` (~ lines 160–175) — currently renders the FakeDrag chips inside the choice's shadow; replace with `renderEditChip(...)`. Note: this one is rendered in shadow DOM so the part forwarding goes through `qti-simple-associable-choice::part(chip)` to be styleable from app CSS — verify by adding the part to the host via [`exportparts`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts).

3. **gap-match**: do NOT add a chip — `qti-gap`'s label IS the visual. BUT add a hover-× via a `<button part="chip-remove">` next to the label inside `qti-gap`'s render, only displayed when `[data-filled]` is set (CSS handles the hover-reveal). See Phase 4.

4. **Add shared chip CSS to `qti.css`**:
   ```css
   /* Canonical chip used inside filled drop targets. */
   .qti-edit-chip,
   qti-simple-associable-choice::part(chip),
   qti-order-interaction::part(chip),
   qti-associate-interaction::part(chip) {
     display: inline-flex;
     align-items: center;
     gap: 4px;
     padding: 2px 6px;
     border: 1px solid var(--qti-edit-chip-border);
     border-radius: 4px;
     background: var(--qti-edit-chip-bg);
     color: var(--qti-edit-chip-text);
     font-size: 0.9em;
     line-height: 1.2;
     user-select: none;
     cursor: default;
   }
   ```

5. **DELETE the now-orphaned per-interaction chip CSS:**
   - `qti-order-interaction.styles.ts`: `.fake-drag`, `.fake-drag-remove`, `.fake-drag-remove:hover` blocks.
   - `qti-simple-associable-choice.ts`: `.fake-drag` and `.fake-drag-remove` blocks. Keep `.dropslot` rules.
   - `qti-associate-interaction.styles.ts`: `.slot-remove`, `.slot-remove:hover` blocks.

**Verification:**
- Inspect a filled drop in each interaction; the chip DOM looks identical (`<span class="qti-edit-chip">…<button>×</button></span>`).
- Computed style for `border-color` is `#22c55e` (or whatever `--qti-correct` resolves to) in all four.

**Anti-pattern guard:** Do not change the runtime chip rendering (i.e. don't touch how qti-simple-associable-choice renders when NOT in edit mode). Only the FakeDrag-driven chip render branch changes.

---

## Phase 4 — Hover-only remove ×

**Goal:** The × button is invisible until the user hovers the chip (or the chip's containing drop). Keyboard focus on the button also reveals it for a11y.

**Add to `qti.css`** under the chip block:

```css
/* Remove button — hidden until parent chip (or drop slot) is hovered or focused. */
.qti-edit-chip [part="chip-remove"],
qti-simple-associable-choice::part(chip-remove),
qti-order-interaction::part(chip-remove),
qti-associate-interaction::part(chip-remove),
qti-gap [part="chip-remove"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1.1em;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease-out;
}

/* Reveal on drop-target hover OR keyboard focus. Targets use `:state(filled)`
   uniformly across all four interactions — no per-interaction selector. */
qti-gap:state(filled):hover [part="chip-remove"],
qti-edit-drop-slot:state(filled):hover [part="chip-remove"],
qti-simple-associable-choice:state(filled):hover::part(chip-remove),
.qti-edit-chip:focus-within [part="chip-remove"],
[part="chip-remove"]:focus {
  opacity: 0.7;
}

[part="chip-remove"]:hover {
  opacity: 1;
  background: rgb(0 0 0 / 0.1);
}
```

**For gap-match**: update [qti-gap.ts](packages/prose-qti/src/components/shared/components/qti-gap/qti-gap.ts) render to include `<button part="chip-remove">×</button>` next to the label (always rendered, hidden via CSS until `:state(filled):hover`). The button's click bubbles to `qti-gap-match-interaction`'s existing `onClickFilledGap` handler (already in place and stops propagation) — no new wiring needed.

**Verification:**
- × not visible on any chip until you hover.
- × becomes visible AND clickable when hovering the parent drop slot.
- Tab key onto the × button shows it via `:focus`.
- Clicking × in each interaction removes the assignment.

**Anti-pattern guard:** Do NOT use `display: none` for the hidden state — it breaks focus-visible. Use `opacity: 0` so the button stays focusable.

---

## Phase 5 — Verify visually and clean up

**Per-interaction checks** (each tested by opening the corresponding ITEM in the prosemirror-item app):

| Item | Test |
|---|---|
| ITEM006 (inline-choice — sanity) | unaffected; still works |
| ITEM007–010 (match) | click left source → all right targets pulse red-dashed identical to gap-match. Click right target → chip placed; × hidden until hover. Click × → removes. |
| ITEM013–014 (order) | click choice → slots pulse red-dashed. Click slot → chip placed with × on hover. |
| ITEM015 (gap-match) | click gap-text → all empty gaps pulse red-dashed. Click gap → filled. Hover filled gap → × reveals. Click × → cleared. |
| Associate items (no kennisnet item ref) | use a story or add a test fixture |

**Workspace check:**
```bash
pnpm -r typecheck
# Should return zero hits in interaction render code — state is now in internals.
grep -rn "data-pending\|data-pending-target\|toggleAttribute.*data-\(pending\|filled\|selected\|linked\|disabled\)" \
  packages/prose-qti/src/components/{match,gap-match,order,associate,shared/components/qti-gap,shared/components/qti-gap-text,shared/components/qti-simple-associable-choice}
# Should return zero hits — replaced by the shared rules.
grep -rn "fake-drag\|dropslot-pulse\|order-dropslot-pulse" packages/prose-qti/src apps/qti-prosemirror-item/src
```

**File-level check:**
- `apps/qti-prosemirror-item/src/style.css` no longer exists.
- `app.css` and `qti.css` both imported in `main.ts`.
- `qti.css` has exactly one `@keyframes qti-edit-drop-pulse`, one chip block, one × block.
- New file `packages/prose-qti/src/components/shared/components/qti-edit-drop-slot/qti-edit-drop-slot.ts` exports `QtiEditDropSlot`.
- New file `packages/prose-qti/src/components/shared/controllers/dom-state-sync.ts` exports `DomStateSyncController`.
- New file `packages/prose-qti/src/components/shared/render/chip.ts` exports `renderEditChip`.

---

---

## Phase 6 — Structural mirror: drag-in-drop placement + styled fake-drag `part`

**Goal:** Match the *placement structure* of qti-components' filled state — the drag goes **inside** the drop — for all four interactions. The editor keeps its own custom elements (no `qti-draggable`/`tabindex`/`aria-*`/`data-has-drop` mimicry — the editor doesn't need them) but its fake-drag element gains a `part` so the relevant runtime "drag" styling can be copied onto that part selector.

Scope is narrower than originally framed: this is about *where the fake drag sits in the DOM* and *how it gets styled* — not full attribute mimicry.

**Evidence basis** — live `https://qti.citolab.nl/preview` was inspected after a forced drop for all four interactions; the resulting DOM is summarized below and matches the source contracts in `/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/interactions/{associate,order,match,gap-match}-interaction/src/*.ts` (drag-drop-slotted.mixin.ts always **clones** rather than moves; line 396).

### Why placement matters but attributes don't

The editor's nodes are ProseMirror-backed custom elements that re-render `toDOM()` from the document model each draw. They serve a different purpose from `qti-components`:

| Runtime concern | Editor equivalent |
|---|---|
| `qti-draggable`, `tabindex`, `aria-*`, `cursor: grab` — make a static element interactive for SortableJS / keyboard / SR | The editor decides what's interactive; it doesn't need these on its fake elements |
| `data-has-drop` — runtime signal that the target is filled | The editor knows its own state — no signal needed |
| `data-slot-index` / `data-drop-slot` | Editor-only, kept where the PendingSelectionController reads them |
| Placement of dropped clone *inside* the drop slot | **Yes — mirror this.** Same DOM nesting → same theme CSS applies, same visual result |

So phase 6 is: get the **structure** right (drag goes inside the drop), expose a `part` on the editor's fake-drag element, and lift the relevant `qti-theme` rules onto that part selector.

### 6.A — Canonical filled DOM per interaction

**associate** (drop-list lives in interaction shadow, choice cloned inside):
```html
<div part="drop-list" class="dl" name="left0" identifier="droplist0_left">
  <qti-simple-associable-choice
    identifier="A" match-max="1"
    part="qti-simple-associable-choice"
    slot="qti-simple-associable-choice"
    qti-draggable="true" tabindex="0"
    aria-disabled="false" aria-readonly="false">Antonio</qti-simple-associable-choice>
</div>
```

**order** (drop-list lives in interaction shadow, choice cloned inside):
```html
<drop-list role="region" part="drop-list" identifier="droplist0">
  <qti-simple-choice
    identifier="DriverA"
    part="qti-simple-choice"
    qti-draggable="true" tabindex="0"
    aria-disabled="false" aria-readonly="false">Rubens Barrichello</qti-simple-choice>
</drop-list>
```
Note: `<drop-list>` is a generic custom-name element (no JS class registered) — it works as a styling/role hook.

**match** (target lives in light DOM as 2nd `qti-simple-match-set`'s associable choices; clone slotted into the target's `dropslot`):
```html
<qti-simple-match-set>
  <qti-simple-associable-choice
    identifier="M" match-max="4"
    slot="qti-simple-associable-choice" part="qti-simple-associable-choice"
    data-has-drop="true">A Midsummer-Night's Dream
    <qti-simple-associable-choice
      identifier="C" match-max="1"
      slot="qti-simple-associable-choice" part="qti-simple-associable-choice"
      qti-draggable="true" tabindex="0">Capulet</qti-simple-associable-choice>
  </qti-simple-associable-choice>
</qti-simple-match-set>
```
The dropped clone is appended as a **light child** of the target, carrying `slot="qti-simple-associable-choice"` so it projects into the target's shadow `<slot part="dropslot" name="qti-simple-associable-choice">`. Target gains `data-has-drop="true"`.

**gap-match** (gap is light DOM inline; clone appended as light child):
```html
<qti-gap identifier="G1" tabindex="0">
  <qti-gap-text identifier="W" match-max="1"
    slot="drags" qti-draggable="true" tabindex="0">winter</qti-gap-text>
</qti-gap>
```

### 6.B — Where the fake-drag sits

The editor already uses its own light/shadow custom elements for the interactions. The change is purely about where the fake-drag node is placed and what `part` it exposes for styling.

| Interaction | Runtime places drag in… | Editor today places fake-drag in… | After Phase 6 |
|---|---|---|---|
| order | shadow `<drop-list>` (clone) | `<qti-edit-drop-slot>` wrapping a `<span class="qti-edit-chip">` | fake-drag node directly inside the drop slot, with `part="drag"` (or `part="placed-drag"`) |
| associate | shadow `<div part="drop-list">` (clone) | `<qti-edit-drop-slot>` wrapping a chip span | fake-drag inside the drop slot, `part="drag"` |
| match | light-DOM target choice (clone slotted via `dropslot`) | currently a fake-drag is rendered in some form — verify | place fake-drag **inside** the editor's target node (light), `part="drag"` |
| gap-match | light-DOM `<qti-gap>` (clone, `slot="drags"`) | gap is rendered as a light element; fake-drag rendering needs confirming | place fake-drag **inside** `qti-gap` (light), `part="drag"` |

The editor's fake-drag element is something like `<qti-fake-drag part="drag" identifier="X">label</qti-fake-drag>` (or whatever name fits — point is **one tag**, **one part name**, used in all four interactions).

### 6.C — Implementation steps

1. **Pick a single editor element + part name** for the fake-drag. Reuse the editor's existing fake-drag element if one exists already (e.g. whatever `match-drag-drop.ts` clones), otherwise add a small `<qti-fake-drag part="drag">` light-DOM custom element. The crucial bit: `part="drag"` exposes it for styling from outside the interaction's shadow.

2. **Place the fake-drag inside the drop slot** for all four interactions:
   - **order** — replace `<qti-edit-drop-slot>` + chip-span with `<drop-list part="drop-list">` (or keep the editor's wrapper if it's needed for `:state()` plumbing) and render `<qti-fake-drag part="drag">label</qti-fake-drag>` directly inside. No more `renderEditChip` here.
   - **associate** — same: drop slot contains the fake-drag, not a chip-span.
   - **match** — confirm `match-drag-drop.ts` places the fake-drag *inside* the target light element (mirror the runtime's `appendChild` into the target). It already clones; verify the placement parent.
   - **gap-match** — place the fake-drag inside `<qti-gap>` (light), `part="drag"`.

3. **Copy the relevant light-DOM "drag" styles from qti-theme onto the part selector** in `qti.css`. The `@apply drag` rule from [qti-theme/.../qti-match-interaction.css](/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-theme/src/styles/qti-theme/interactions/qti-match-interaction.css) and [qti-gap-match-interaction.css](/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-theme/src/styles/qti-theme/interactions/qti-gap-match-interaction.css) resolves to a concrete set of declarations in `qti-theme`'s `drag` mixin — read that mixin and inline the resolved declarations onto:

   ```css
   ::part(drag) {
     /* paste resolved `@apply drag` declarations here:
        background, border, padding, border-radius, font-size,
        whatever the theme's `drag` mixin produces. */
   }

   ::part(drag):hover { /* `@apply hov` resolved */ }
   ::part(drag):focus { /* `@apply foc` resolved */ }
   ```

   The selector is intentionally part-based and global — every interaction's fake-drag exposes the same `part="drag"`, so one rule block styles all four. Authors can override per-interaction via `qti-match-interaction::part(drag) { … }` if needed.

4. **Phase 3 chip helper (`renderEditChip`) becomes unnecessary** for the placed-inside-drop case — delete it (or keep only for the hover-× button if that pattern still applies). The fake-drag element's own rendering is the chip.

5. **Hover-× remove button** (from Phase 4) lives *inside* the fake-drag element (`part="chip-remove"`), shown on `::part(drag):hover` or `:focus-within`.

### 6.D — Find the `drag` mixin

Before writing the CSS in step 3, locate the `@apply drag` mixin source in `qti-theme`. Likely candidates:
```
/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-theme/src/styles/qti-theme/*.css
```
Grep: `grep -rn "@layer.*drag\|^\.drag\|@define-mixin.*drag\|@utility drag" packages/qti-theme/src`. The mixin defines `drag`, `drop`, `dropping`, `act`, `dis`, `hov`, `foc` — they're shared between interactions. Inline the resolved values into the editor's `qti.css` rather than @apply'ing (the editor's PostCSS pipeline likely doesn't share the same `@apply` resolver).

### 6.E — Verification

- DevTools on each filled interaction: the fake-drag is a child of the drop slot element (not a sibling, not wrapped in an extra span).
- Computed style on the fake-drag (`::part(drag)`) matches the runtime drag's computed style: same background, border, padding, font-size.
- `grep -rn "qti-edit-chip\|fake-drag-remove\|\\.fake-drag\b" packages/prose-qti/src apps/qti-prosemirror-item/src` returns zero hits.
- Visually diff against `https://qti.citolab.nl/preview` filled state for each interaction.

**Anti-pattern guards:**
- Do NOT replicate `qti-draggable`/`tabindex`/`aria-*`/`data-has-drop` onto the fake-drag. The editor doesn't need them and they'd be misleading.
- Do NOT register `<drop-list>` as a custom element (runtime doesn't either).
- Do NOT split styling into per-interaction `::part(chip)` rules — one shared `::part(drag)` rule applies to all four.
- Do NOT @apply runtime mixins from the editor — inline the resolved declarations, since the editor's CSS pipeline may not see qti-theme's mixin definitions.

### 6.F — Effort

Editor fake-drag element + part name: ~30 min. Re-parent fake-drag inside drop slot in all four interactions: ~1 hour. Find + inline the `drag`/`hov`/`foc` declarations from qti-theme: ~30 min. CSS cleanup (drop `.qti-edit-chip`, per-interaction chip rules): ~15 min. Visual verify: ~30 min. **Total: ~2.5 hours.**

This phase **supersedes** Phase 3 (chip helper). Phase 1.5's `<qti-edit-drop-slot>` may still be useful as the editor's drop-slot wrapper for `:state()` plumbing — keep it if it carries pending/filled state, drop it if pending/filled moves up to the interaction host.

---

## Follow-on — `qti-graphic-gap-match-interaction`

Inventory of `qti-components` drag-drop consumers (via the `drag-drop-slotted` mixin / SortableJS / `qti-draggable`): **associate, match, order, gap-match, graphic-gap-match**. The four covered in this plan are the non-graphic set; `graphic-gap-match-interaction` uses the same mixin but drops onto `<qti-hotspot>` regions overlaid on an image.

Not in this plan, but the Phase 6 contract should extend cleanly to it when authored in the editor:

- Drop target = `<qti-hotspot>` (light-DOM, positioned over `<img>`).
- Filled state = `<qti-gap-text>` clone appended as a light child of the hotspot.
- Same `part="drag"` styling rule applies to the placed fake-drag.
- Pending/filled `:state()` plumbing moves onto `<qti-hotspot>` (needs `ElementInternals` if the editor's hotspot doesn't already have it).

`graphic-associate-interaction` and `graphic-order-interaction` exist as directories but currently have no drag-drop wiring — out of scope until they grow one.

## Out of scope

- Behavioral changes to the pending state machine (that's in `PendingSelectionController`, untouched).
- Runtime rendering of qti-components (this is editor-only styling; runtime DOM contracts like `qti-simple-associable-choice::part(dropslot)` are preserved).
- Changing part names on already-shipped components (e.g. `dropslot` stays).
- Adding chip support to interactions that don't currently have a fake-drag concept (e.g. inline-choice).
- Migrating the legacy `:state(--checked)` usage in [correct-response-click.mixin.ts](packages/prose-qti/src/components/shared/mixins/correct-response-click.mixin.ts) and [qti-inline-choice.ts](packages/prose-qti/src/components/inline-choice/components/qti-inline-choice-interaction/qti-inline-choice.ts) to the modern `:state(checked)` syntax — that's a separate cleanup. **This plan adds only modern-syntax states.**

## Estimated effort

Phase 1 (split css + vars): ~30 min. Phase 1.5 (internals + qti-edit-drop-slot + state controller): ~2 hours. Phase 2 (shared :state rules + remove data attrs from render): ~1 hour. Phase 3 (chip helper + refactor 4 renders): ~1–2 hours. Phase 4 (hover-only ×): ~30 min. Phase 5 (verify): ~30 min. **Total: ~5–6 hours** — a full day with breaks.

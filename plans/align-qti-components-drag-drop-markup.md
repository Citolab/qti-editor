# Align drag-drop markup across qti-components interactions

Sibling to [align-drag-drop-affordances.md](./align-drag-drop-affordances.md). That plan targets the **editor**; this one targets **qti-components** itself — unifying the shadow/light DOM contract across the five drag-drop interactions (`associate`, `match`, `order`, `gap-match`, `graphic-gap-match`).

This is a **breaking** change for any third-party theme or host CSS that targets the existing part names or slot names. Treat as semver-major. Coordinate with the editor's Phase 6 — once part names converge, the editor's `::part(drag)` rules in Phase 6 can extend to the runtime's drop slot too without per-interaction branches.

---

## Current inconsistencies (verified against source on `refactor-drag-drop-editor-affordance` checkout of QTI-Components)

| Concern | associate | match | order | gap-match | graphic-gap-match |
|---|---|---|---|---|---|
| Drop-slot tag | `<div class="dl">` | `<qti-simple-associable-choice>` (light) | `<drop-list>` (bare tag) | `<qti-gap>` (light) | `<qti-hotspot>` (light) |
| Drop-slot `part` | `drop-list` | `dropslot` (inner shadow slot) | `drop-list` | — | — |
| Drop-slot `role` | — | — | `region` | — | — |
| Source-pool slot | `<slot part="associable-choices" name="qti-simple-associable-choice">` | (no shadow slot) | `<slot part="drags">` unnamed | `<slot part="drags" name="drags">` | `<slot part="drags" name="drags">` |
| Drag `slot=` attr | `qti-simple-associable-choice` | — | — | `drags` | `drags` |
| Outer wrapper | `drop-container` + `associables-container` | — | `container` + `drops` | — | — |
| Validation message | `part="message"` | `part="message"` | **missing** | `part="message"` | `part="message"` |

---

## Proposed canonical contract

| Element | Tag | `part` | Notes |
|---|---|---|---|
| Source-pool projector | `<slot>` | `drags` | `name="drags"` everywhere; drag elements carry `slot="drags"` |
| Outer interaction wrapper | `<div>` | `container` | Single optional wrapper; drop the second-level `drop-container`/`drops` distinction |
| Drop-slot (shadow drop-list interactions) | `<div>` | `drop-slot` | Hyphenated to match `drop-` prefix; same name as light-DOM drop CEs expose conceptually |
| Drop-slot inner slot (light-DOM target CEs) | `<slot>` | `drop-slot` (was `dropslot`) | Aligns naming |
| Drops container (multi-slot interactions) | `<div>` | `drops` | Optional grouping wrapper |
| Validation message | `<div role="alert">` | `message` | Present on **every** interaction (fixes order's gap) |
| Drag element (light DOM) | existing CE | `drag` | New addition — every draggable exposes `part="drag"` for cross-interaction styling. Mirrors the editor's Phase 6 contract. |

Drop the `<drop-list>` bare tag in order — replace with `<div part="drop-slot" role="region">` (keep the `role` since it's semantically correct; add it to associate's drop slots too for consistency).

Drop synthetic identifiers (`droplistN`, `droplistN_left/right`) — they're shadow-only and never authored. Use plain `data-index` if the mixin needs to map a slot to an index.

---

## Phase A — Renames (mechanical, breaking)

1. **`part="dropslot"` → `part="drop-slot"`** in [qti-simple-associable-choice.ts:57](packages/interactions/core/src/elements/qti-simple-associable-choice/qti-simple-associable-choice.ts#L57).
2. **`part="drop-list"` → `part="drop-slot"`** in [qti-associate-interaction.ts:80-81](packages/interactions/associate-interaction/src/qti-associate-interaction.ts#L80-L81) and [qti-order-interaction.ts:60](packages/interactions/order-interaction/src/qti-order-interaction.ts#L60).
3. **Source-pool slot name `qti-simple-associable-choice` → `drags`** in [qti-associate-interaction.ts:74](packages/interactions/associate-interaction/src/qti-associate-interaction.ts#L74) and corresponding `slot="qti-simple-associable-choice"` on the choices.
4. **Add `name="drags"` to order's `<slot part="drags">`** in [qti-order-interaction.ts:57](packages/interactions/order-interaction/src/qti-order-interaction.ts#L57) and `slot="drags"` on the `<qti-simple-choice>` sources.
5. **`<drop-list>` → `<div part="drop-slot" role="region">`** in [qti-order-interaction.ts:60](packages/interactions/order-interaction/src/qti-order-interaction.ts#L60).
6. **Add `role="region"` to associate's drop slots** for consistency.
7. **Add `<div role="alert" part="message" id="validation-message">` to order's render** (currently missing).
8. **Drop `name="leftN|rightN"` and synthetic `identifier="droplistN_..."`** in associate — replace with `data-index="N"` + `data-side="left|right"` (purely positional, no authored identifier).

## Phase B — Wrapper-name alignment

Pick **one** vocabulary for outer wrappers:

- `associate`: `drop-container` + `associables-container` → `container` + `drops`
- `order`: `container` + `drops` (already matches the target) — no change

This collapses to: every interaction's shadow render is `<slot name="drags"/> <div part="drops">…drop-slots…</div> <div role="alert" part="message">…</div>`, with `<div part="container">` as the outer wrapper when multi-region (associate's pair-of-pair layout still needs an inner `<div>` per pair — name it `part="associables"` consistently).

## Phase C — Add `part="drag"` to every draggable

In the qti-theme's `@apply drag` rule (light DOM):
```css
qti-simple-associable-choice, qti-simple-choice, qti-gap-text { … }
```

Replace with a single part-based rule once the source elements expose `part="drag"`:
```css
::part(drag) { … }
```

This requires updating the qti-component source elements (`qti-simple-associable-choice`, `qti-simple-choice`, `qti-gap-text`) to add `part="drag"` to themselves (host element). Each is a light-DOM CE so it's `:host { part: drag; }` — i.e. set on the constructor with `this.setAttribute('part', 'drag')` or via `static get partName() { return 'drag'; }` (Lit pattern).

Note: a host element can't have a `part` attribute as such — `part` only applies to elements *inside* a shadow tree from the parent's perspective. The right move is for the **interaction's shadow** to expose `<slot part="drags">` (the projected children become accessible from outside via that slot's part), and host CSS targets `qti-X-interaction::part(drags) > *` or uses the qti-theme's existing tag-based selectors. Pragmatically: keep theme rules tag-based (`qti-simple-associable-choice`, `qti-gap-text`, …) since these are light-DOM CEs and tag selectors work directly.

→ Phase C is therefore **scoped to the editor's `qti-fake-drag` element** (Phase 6 of the editor plan), not qti-components. Strike Phase C; rely on Phases A+B alone.

---

## Light-DOM selector impact

Every name change in Phase A breaks light-DOM selectors in:

1. **qti-theme** — [packages/qti-theme/src/styles/qti-theme/interactions/*.css](packages/qti-theme/src/styles/qti-theme/interactions). Search-and-replace:
   - `qti-associate-interaction::part(drop-list)` → `::part(drop-slot)`
   - `qti-order-interaction::part(drop-list)` → `::part(drop-slot)`
   - `qti-simple-associable-choice::part(dropslot)` → `::part(drop-slot)`
   - `slot="qti-simple-associable-choice"` references in associate's themed selectors
2. **The drag-drop mixin's selectors** — [packages/interactions/core/src/mixins/drag-drop/drag-drop-api.ts:266](packages/interactions/core/src/mixins/drag-drop/drag-drop-api.ts#L266) currently queries `slot[part="dropslot"]`. Update to `slot[part="drop-slot"]`.
3. **Stories / examples** — any `*.stories.ts` setting `slot="qti-simple-associable-choice"` on a choice needs updating to `slot="drags"`.
4. **Saved QTI XML in tests/fixtures** — sources currently carrying `slot="qti-simple-associable-choice"` need migration. This is the biggest cost.
5. **Third-party integrators** — anyone who themes against `::part(drop-list)`, `::part(dropslot)`, or relies on `slot="qti-simple-associable-choice"` semantics in their authored items.

## Migration strategy

- **Authored XML**: write a tiny codemod that walks every `<qti-simple-associable-choice>` inside `<qti-associate-interaction>` and renames `slot="qti-simple-associable-choice"` → `slot="drags"`. Run against the test corpus and any consumer's library.
- **Backwards-compatibility shim** (optional, one minor cycle before the major bump): the interaction's shadow render projects both `<slot name="drags"></slot>` AND `<slot name="qti-simple-associable-choice"></slot>` so old XML still works. Drop the legacy slot in the major release after migration.
- **Part-name aliases** are NOT a thing in CSS — old `::part(drop-list)` selectors will simply stop matching. There's no graceful shim; integrators must update their CSS.

## Coordination with the editor plan

Once Phase A lands in qti-components:
- The editor's [align-drag-drop-affordances.md Phase 6](./align-drag-drop-affordances.md) `::part(drag)` rule in `qti.css` aligns naturally — the editor's fake-drag and the runtime's drag share the part name.
- The editor's `part="drop-list"` references (in order/associate render) update to `part="drop-slot"` to match the runtime.
- The editor's match-target inner slot expectation updates from `part="dropslot"` to `part="drop-slot"`.

## Effort

- Phase A renames: ~2 hours across qti-components + qti-theme + stories + tests.
- Phase B wrapper alignment: ~1 hour.
- Codemod for authored XML + applying it: ~1 hour.
- Cross-package verification (qti-components tests, editor regression): ~1 hour.

**Total: ~5 hours** for the qti-components side. Land in a dedicated branch and ship as a single major-version bump.

## Out of scope

- The runtime drag/drop behavior itself (SortableJS wiring, the `drag-drop-slotted` mixin's lifecycle).
- `part="drag"` on light-DOM CEs — see strikethrough in Phase C; tag-based theme selectors are simpler.
- ARIA improvements beyond `role="region"` parity — separate accessibility pass.
- Tabular `qti-match-interaction` mode — different DOM shape entirely; not part of the drag-drop family.

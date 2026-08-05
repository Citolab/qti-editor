# Plan — Chip removal menu, and whether order joins the correction context

## Context

Two pieces of work are on the table. They are **independent** — neither blocks the other — but they were
raised together, so this records why they are sequenced the way they are.

1. **Make a placed chip removable by clicking it**, with a small popover offering the action in words,
   replacing the hover-revealed `×` in [dummy-drag.ts](../packages/prose-qti/src/components/shared/components/dummy-drag/dummy-drag.ts).
2. **Migrate `qti-order-interaction` onto `correctionContext`**, the way gap-match (`73083bf`) and match
   (`3f89d17`) already are.

### Recommendation: do (1) first

Not because (2) is unimportant, but because:

- **They do not depend on each other.** The menu's action is "dispatch `dummy-drag-remove`", which all three
  hosts already handle today. Order does not need the context for the menu to work in order.
- **Neither causes rework in the other.** The menu changes `dummy-drag` and the shell; order's context
  migration changes how order computes labels and state. They meet only at `renderEditChip`'s `onRemove`
  callback, which neither changes.
- **(2) has an unresolved design question** (see below) that deserves deciding on its own, not under
  pressure to unblock something else.
- (1) is the smaller piece and the one that is visible to an author.

---

## Part 1 — Chip removal menu

### Target behaviour

- The **whole chip** is the click target. It is the only interaction a placed chip has, so a 14px sub-target
  inside it is not worth the precision it demands.
- Clicking opens a **small popover anchored to the chip**, with the action as a **word**, not an icon.
- Hover does something non-destructive — cursor plus a subtle outline. It must **not** blur or hide the label:
  hovering is how a pointer crosses the screen, and hiding the label at exactly the moment it is pointed at
  is the wrong trade.
- Consistent across match, order and gap-match. One gesture, one look.

### Why the menu was "difficult" before, and why it is not now

The reverted shell derived **both** the menu's position and its actions from `state.selection`. Gap-match
worked because a `qti-gap` *is* a ProseMirror node. Match and order failed because their drops are not in
the document at all — order's slots are shadow `<drop-list>` divs addressed by index, match's chips live
inside the target choice's shadow root.

A popover does not need a document position. It needs a **rect**, and the component holding the chip has the
element. So the shell needs one more entry point:

```
createSelectionMenuPlugin(name, resolveActions)   // selection-driven (hottext, gap-match text selection)
menu.openAt(rect, actions)                        // component-driven (any chip, anywhere)
```

None of the machinery from the decorator investigation is needed for this — no `::part()` anchor names, no
per-instance part tokens, no CSS anchor positioning. Those were for anchoring *without* JS.

### The bug this fixes rather than works around

Verified earlier this session: with a source pending, clicking a placed chip **cleared it but did not commit
the replacement** — the drop ended up empty. "Click = remove immediately" and "click a filled drop to replace"
fight over the same pixels.

Opening a menu changes no document state, so nothing races. The rule becomes explicit and testable:

> If a drag is pending, the click **commits the replacement**. If nothing is pending, it **opens the menu**.

The component already knows `pendingSourceId`.

### What is recoverable rather than rewritten

`stash@{0}` holds the shell, the `.qti-selection-menu` CSS for `core-css`, and the i18n keys, from the
reverted work. New: `openAt`, the click handler on `dummy-drag` (~10 lines — the whole-chip click was
verified working in match and order before the revert), and one call site per host.

### Phases

| # | Step | Verify |
|---|---|---|
| 1 | Recover the shell + `core-css` rule + i18n keys from `stash@{0}` | tsc, lint |
| 2 | Add `openAt(rect, actions)` to the shell | unit |
| 3 | `dummy-drag`: whole chip clickable, `×` removed; emits a "chip activated" event carrying its rect | VRT — chip loses the reserved `×` width, baselines will move |
| 4 | Wire **match** first — it is where the pending-replace case actually exists | browser: remove, and replace-while-pending |
| 5 | Wire order, then gap-match | browser per item |
| 6 | Re-bless the baselines the narrower chip moves | inspect each diff by eye |

---

## Part 2 — Order onto the correction context

### Current state (measured)

[qti-order-interaction.ts](../packages/prose-qti/src/components/order/components/qti-order-interaction/qti-order-interaction.ts),
349 lines, still on the push model gap-match and match have left:

- `_labelCache` + `_getLabel` with an identifier fallback — the same staleness class that made a gap-match gap
  paint a raw `GAP_TEXT_<uuid>`
- a `MutationObserver` driving `_buildLabelCache`
- chips rendered by the interaction from its own state

### The open question: order's answer key is not directed pairs

`CorrectionState` models links as `{ drag, drop }`, which is exactly a QTI directed pair — the shape
gap-match and match both persist. Order does not:

```ts
private _order: (string | null)[] = [];        // positional
// emitted dense: "step_hypothese,step_data,step_conclusies"
```

It is an **ordered list**, and the position *is* the meaning. Three ways out:

1. **Synthesise positional drop ids** — `{ drag: 'step_data', drop: '1' }`. Mechanical, but the "identifier"
   is an index, so it renumbers whenever the pool changes, and `dropsOf(drag)` answers with a position
   rather than an identity. The shape would be lying about what it holds.
2. **Give `CorrectionState` an ordered variant.** Honest, but it grows the interface for one interaction.
3. **Migrate only what benefits.** Order's drops are shadow divs rendered by the interaction, so they can
   never be context *consumers* — the only consumers are the `qti-simple-choice` chips in the pool. Publish
   labels, roles and `linked`/`disabled` for the pool; leave the sequence where it is.

### Honest assessment of the payoff

Order gets **less** from the context than the other two did, for two structural reasons: its drops cannot
subscribe, and its answer key does not fit the shape. What it does get is real but smaller — the label cache
and its observer go, and pool chips self-paint `linked` — so this is worth doing, and worth doing
deliberately rather than by analogy.

**Recommendation: option 3.** It takes the part that is true for order and declines the part that is not.

### Phases

| # | Step | Verify |
|---|---|---|
| 1 | Decide 1 / 2 / 3 above | — |
| 2 | Publish labels + roles from order; drop `_labelCache`, `_getLabel`, the observer | browser: ITEM013, ITEM014 |
| 3 | `qti-simple-choice` consumes for `linked` / `disabled` | states present in order, unchanged in choice |
| 4 | Full suites + VRT | no baseline change expected — this is a mechanism change, not a visual one |

---

## Out of scope, recorded so it is not lost

- **Shadow-CSS slimming.** Audited this session: ~770 lines across 17 sheets, of which ~60–70 either fight
  upstream from the wrong side of the shadow boundary (three `!important`s that exist only because `:host`
  loses to a document rule), duplicate upstream, or are dead — `qti-gap`'s `gap: 4px` has no effect, the host
  has one shadow child. One hard constraint found: `::part(x):empty` is not a supported selector
  (`:hover` and `:state()` are), so `qti-simple-associable-choice`'s `[part='drop']:empty` pair cannot move.
- **`qti-hottext-interaction.styles.ts`** is 85 lines of *editor chrome* in a shadow root — the selection-menu
  popover. Part 1 deletes the reason for it to be there.
- **The two ProseKit apps still restate their schema topology** and will miss the next package schema change
  in the same silence `e8d728c` fixed for prosemirror-item.

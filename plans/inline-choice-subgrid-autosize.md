# Plan — Size the editor's inline-choice trigger from its menu, with grid + subgrid

**Status:** APPLIED and verified. The blocker is gone — qti-components `ac83402` deleted
`qti-config-test-provider`, and the deps here are already bumped to it, so
`item006-qti-inline-choice-interaction.regression` runs again (7/7 green).

**One correction to the CSS below.** The trigger rule must be written `button[part='trigger']`, not
`[part='trigger']`. Upstream styles the trigger through `button[part='trigger']` (0,2,1), which
outranks a bare attribute selector (0,1,0) — so as originally drafted the rule silently lost
`grid-template-columns` to upstream's `minmax(0, 1fr) auto`, the trigger kept private tracks, the
host's chevron column collapsed to 1px, and the subgrid never engaged. Measured with a long option:

| Trigger rule | Host, long option unselected | …selected | Reflow |
|---|---|---|---|
| `[part='trigger']` (inert) | 402.5px | 442.3px | **39.8px** |
| `button[part='trigger']` | 437.5px | 442.3px | 4.8px |

The 39.8px row is the exact bug this plan exists to prevent, and it survived the original draft
undetected because everything *else* — host sizing, zero-height row, option column — worked. The
menu rules needed no change: upstream's `[part='menu']` is the same specificity and ours comes later.

A 4.8px residual remains (trigger padding/border); left as is.

---

## The problem

The editor's inline-choice trigger does not grow to fit its longest option. Picking a long option
reflows the sentence around it.

Upstream (qti-components) solves this by measuring — `MenuAutoSizeMixin` opens the popover invisibly,
measures each row, and writes `--qti-inline-choice-width` as an inline style. The editor cannot reuse
that, and its own attempt at it is dead code: `#estimateOptimalWidth` in
`packages/prose-qti/src/components/inline-choice/components/qti-inline-choice-interaction/qti-inline-choice-interaction.ts`
is commented out in full.

**Why it was commented out.** Its one live statement was
`this.style.setProperty('--qti-calculated-min-width', …)` — a style attribute written onto the
**host**, which inside the editor is a ProseMirror-managed node. PM reverts an attribute its schema
does not know; the revert re-renders the node; the re-render re-runs the code that wrote it. That is
the freeze. Disabling the method was the workaround, and the trigger has been un-sized since.

## Why CSS can do it here and cannot do it upstream

The sizing has to come from an **in-flow box**. Measured in Chromium 148:

| Menu is… | Host width, closed | Host width, open |
|---|---|---|
| `[popover]` (upstream) | trigger width only | trigger width only |
| same div, no `popover` | grows to the menu | grows to the menu |

A popover is `display: none` when closed (no box at all) and in the **top layer** when open (out of
flow, not a grid item, contributes to no track). `grid-template-columns: subgrid` on a popover does
not even inherit its parent's tracks — with no parent grid, subgrid falls back to `none`.
`anchor-size()` refuses the same direction by design: the anchored box reads the anchor, never the
reverse.

**The editor's menu is not a popover.** It is `position: absolute` (see its styles file). It has
already given up the top layer, ancestor clipping, and automatic flipping, and already carries a
manual `z-index: 10`. Moving it from `absolute` to an in-flow zero-height grid row costs nothing it
has not already spent — and unlocks the sizing for free.

So the two implementations differ in sizing *source* because the popover forces them to, not because
of a design inconsistency. Markup and CSS stay shared: the editor already does
`import externalStyles from '@qti-components/inline-choice-interaction/styles'` and overrides only
the menu-positioning block.

## The skeleton

```
host          2 cols (value | chevron) x 2 rows (trigger | menu)
├ trigger     row 1, spans both, subgrid  → value and chevron land in the host's tracks
└ menu        row 2, spans both, subgrid  → option rows land in the host's tracks
```

Two details are load-bearing, both measured rather than reasoned:

**1. `grid-template-rows: auto 0` + `align-self: start` on the menu.** The menu keeps its natural
height — so its own background, border, `max-height` and `overflow: auto` all behave normally — while
the row it occupies is 0px, so it costs the host no height and the trigger stays on the text
baseline.

> Measured: host 28px tall with the menu absent, closed, and open. Menu box 54px, painting below the
> trigger, `overflow-y: auto` intact. No extra wrapper element needed, so markup stays identical to
> upstream.

**2. Option rows at `grid-column: 1`, NOT spanning `1 / -1`.** A spanning item's intrinsic
contribution is distributed across the tracks it spans, so the chevron's track eats part of it.

> Measured, short selected value + long options:
>
> | Row placement | Value track | Host | Longest option fits? |
> |---|---|---|---|
> | `grid-column: 1` | 242.8px | 262.8px | **yes** |
> | `grid-column: 1 / -1` | 222.8px | 242.8px | **no — 20px short** |
>
> 20px is exactly chevron + gap. Spanning would ellipsise the longest option the moment it was
> selected — the precise bug this whole exercise exists to prevent. Confining rows to the value track
> is what stops the chevron stealing from the option width, and is the reason this needs a *subgrid*
> rather than one shared column.

## The change

Two files, both in `QTI-Editor/packages/prose-qti/src/components/inline-choice/components/qti-inline-choice-interaction/`.

### `qti-inline-choice-interaction.styles.ts`

Replace the `[part='menu'] { position: absolute; … }` override with the grid skeleton:

```css
:host {
  white-space: nowrap;
  display: inline-grid;                        /* replaces upstream's inline-flex */
  grid-template-columns: minmax(0, 1fr) auto;  /* value | chevron */
  grid-template-rows: auto 0;                  /* trigger | menu (zero-height row) */
}

button[part='trigger'] {   /* the type selector is load-bearing — see the correction at the top */
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: subgrid;
}

[part='menu'] {
  grid-column: 1 / -1;
  grid-row: 2;
  align-self: start;          /* natural height in a zero-height row */
  display: grid;
  grid-template-columns: subgrid;
  position: relative;         /* in flow — `absolute` would stop it sizing anything */
  z-index: 10;
  inset: auto; top: auto; left: auto; min-width: 0;   /* neutralise upstream's anchor positioning */
  white-space: normal;
}

/* Closed: must still lay out, so `visibility`, never `display: none`. */
[part='menu']:not([data-open]) { visibility: hidden; pointer-events: none; }

[part='menu'] > *,
::slotted(qti-inline-choice) { grid-column: 1; }
```

### `qti-inline-choice-interaction.ts`

1. Render the menu **unconditionally** — a list that is not in the DOM sizes nothing. Open/closed
   becomes a paint toggle (`?data-open=${this._panelOpen}`) instead of the current
   `_panelOpen ? <div part="menu">…</div> : <slot hidden>`.
2. Delete `#estimateOptimalWidth` and its two call sites (`connectedCallback`, `#onChoicesSlotChange`).
3. Drop the now-unused `nothing` import.

## Risks / open questions

- **PM coordinate mapping into an invisible list.** Closed, the options move from `display: none` to
  `visibility: hidden` — they now have layout boxes. ProseMirror's `posAtCoords` could in principle
  land a caret inside an option nobody can see. `pointer-events: none` blocks the click path;
  keyboard/selection traversal is untested. **This is the main thing to exercise manually.**
- **`slotchange` timing.** The slot is no longer torn down and recreated on open/close, so
  `#onChoicesSlotChange` fires less often. `#syncSelectedChoices` is also driven from `updated()` on
  `correctResponse`, so this is expected to be fine — confirm.
- **Row backgrounds stop 20px short of the panel's right edge**, since rows occupy the value column
  only. Cosmetic; the alternative reintroduces the ellipsis bug above.

## Verification

1. `pnpm typecheck` in QTI-Editor — was clean on the working version, except a pre-existing
   unrelated `qti-gap.css?inline` module-declaration error.
2. `apps/e2e/stories/item006-qti-inline-choice-interaction.regression.*` — **currently cannot run**;
   see the blocker.
3. Manual, in this app: long option does not reflow the sentence; caret cannot be placed in the
   closed list; open menu paints above following content and scrolls past `max-height`.

## Explicitly NOT doing

**qti-components stays untouched.** `MenuAutoSizeMixin` keeps measuring. The CSS-only alternative
there needs a hidden second copy of the options (the popover forces it), which means any MathML,
MathJax or custom element inside an option is instantiated twice. A prototype of that passed the full
suite — 8/8 autosize spec, 16/16 stories, 502 unit tests — but every one of those tests uses
plain-text options, so "green" never exercised the actual risk. Not worth taking in an exam runtime
to replace machinery that already works.

## Where the work is

- Editor change, ready to apply: `git stash@{0}` in QTI-Editor, also exported to
  `scratchpad/editor-inline-choice-subgrid.patch`.
- The rejected qti-components experiment, for reference only:
  `scratchpad/inline-choice-css-autosize.patch`.

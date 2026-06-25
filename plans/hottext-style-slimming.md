# Hottext interaction — style slimming + state via `customStateSet`

Lean the editor's `qti-hottext-interaction` on the light-DOM styling from `@qti-components/theme` (already wired in via `apps/qti-prosemirror-item/src/app.css:2`) and remove every styling rule the theme already covers.

State is driven exclusively by `ElementInternals.states` (the `customStateSet` API) and matched in CSS via `:state(…)`. Drop the `[selected]` HTML attribute and the `data-correct-response` attribute affordances entirely — no attribute selectors anywhere.

We **mimic the runtime exactly**. The runtime uses `--checked` for the user-selected hottext state, set via `internals.states.add('--checked')` (and mirrored on `internals.ariaChecked` — which the editor skips, no a11y need in authoring UI). See `packages/interactions/core/src/mixins/choices/choices.mixin.ts:291-301` (the `_setChoiceChecked` helper) and `packages/interactions/core/src/mixins/active-element/active-element.mixin.ts:77` (`this.internals = this.attachInternals()`). The theme then paints the look via `qti-hottext-interaction qti-hottext:state(--checked)`.

Then, in `apps/qti-prosemirror-item/src/qti.css`, we add **one editor-only override** that gives the selected hottext a blue border — a small visual cue that this is "marked as correct in the editor," distinct from the runtime's checkbox/radio fill. The override follows the existing alias-theme-token convention already used by drop pending/idle in that file.

Visible affordances we keep in the editor element:
- The `×` button (`[part='remove']`) used to unwrap a hottext — the theme has no styling for it.

## Why "prosekit-only UI" stays

`[part='selection-menu']` + `[part='selection-action']` in `qti-hottext-interaction.ts` render a floating popup when the **author** selects text inside the interaction. It calls `HOTTEXT_WRAP_SELECTION_EVENT` so prosekit/ProseMirror can wrap the selection in a new `<qti-hottext>`. That UI only exists in the editor — the runtime never renders it — so the theme never styles it. Those two style blocks stay (still light-DOM-ish, but inside the interaction's shadow root, which is where the popup is rendered).

## Phase 0 — frozen findings

Files in scope:
- `packages/prose-qti/src/components/hottext/components/qti-hottext-interaction/qti-hottext-interaction.styles.ts`
- `packages/prose-qti/src/components/hottext/components/qti-hottext-interaction/qti-hottext-interaction.ts`
- `packages/prose-qti/src/components/hottext/components/qti-hottext/qti-hottext.ts`
- `packages/prose-qti/src/components/hottext/extensions/selected-decorations.ts`
- `packages/prose-qti/src/components/hottext/descriptor.ts`
- `packages/prose-qti/src/components/hottext/interaction-hottext.stories.ts`
- `apps/qti-prosemirror-item/src/app.css` — confirmed no hottext rules; left untouched.

Already-provided by the theme (do not duplicate) — `packages/qti-theme/src/styles/qti-theme/interactions/qti-hottext-interaction.css`:
- `qti-hottext-interaction qti-hottext` → `display: inline-flex; align-items: center;` + `@apply check`.
- `:hover` → `@apply hov`, `:focus` → `@apply foc`.
- `::part(ch)` (radio/checkbox circle) + `::part(cha)` (dot/check) keyed by `:state(radio)` / `:state(checkbox)` and `:state(--checked)`.
- The green-check correct-response indicator on `:state(correct-response)` — **we deliberately won't enter this state**, so the theme rule never matches the editor's hottext. Nothing to suppress.

Where the `[selected]` attribute comes from today (to be removed):
- `extensions/selected-decorations.ts` is a ProseMirror decoration plugin that walks the doc, finds `qti-hottext` children whose identifier is in the parent `qti-hottext-interaction`'s `correctResponse`, and emits `Decoration.node(…, { selected: '', 'aria-pressed': 'true' })`. After this plan it sets neither the attribute nor the aria-pressed (the element sets aria-pressed itself).
- `qti-hottext-interaction.styles.ts:22-25` styles `qti-hottext[selected]`.
- `qti-hottext.ts:58-64` styles `:host([selected]) [part='ch'|'cha']`.
- `interaction-hottext.stories.ts:33-35` hard-codes `selected` on its fixture.

State name we will adopt: **`--checked`** — identical to the runtime. It is set/unset via `ElementInternals.states.add('--checked') / .delete('--checked')` and mirrored on `internals.ariaChecked`. The theme's existing `qti-hottext-interaction qti-hottext:state(--checked)` rules then paint the look automatically. We do **not** enter the theme's `correct-response` state (which renders the green ✔ on the right of the chip) — that's reserved for the runtime's "show the correct answer to the test-taker" affordance, not for the editor's "this is in the correct response" mode. Reusing `--checked` means the author sees the radio/checkbox dot fill exactly the way a test-taker would when picking that hottext.

## Phase 1 — Push state ownership into `qti-hottext` and out of the decoration plugin

Edit `packages/prose-qti/src/components/hottext/components/qti-hottext/qti-hottext.ts`:

1. In the class body, attach internals:
   ```ts
   #internals = this.attachInternals();
   ```
2. Add a public method (state only — no ARIA, this is authoring UI):
   ```ts
   setChecked(checked: boolean): void {
     if (checked) {
       this.#internals.states.add('--checked');
     } else {
       this.#internals.states.delete('--checked');
     }
   }
   ```
   Same state name as the runtime's mixin so the theme rule matches — without the ARIA mirroring, which the editor doesn't need.
3. Replace the `static styles` block as described in Phase 4 (one combined edit; listed there for readability).

Edit `packages/prose-qti/src/components/hottext/extensions/selected-decorations.ts`:

- The plugin only existed to emit the `selected` attribute (and `aria-pressed`, which the editor doesn't need). Delete the file entirely. Remove the export from `extensions/index.ts` and the import + plugin-array entry in `descriptor.ts`. If `descriptor.test.ts` references the plugin, drop that assertion.

Verification:
- `grep -rn "[selected]\|selected=''\|setAttribute.*selected" packages/prose-qti/src/components/hottext/` returns nothing.
- `grep -n "createHottextSelectedDecorationsPlugin" packages/prose-qti/src/components/hottext/` returns nothing.
- `pnpm --filter @citolab/prose-qti exec tsc --noEmit` is clean.

Anti-patterns:
- Don't fall back to `setAttribute('selected', '')` "for compatibility." There is no compatibility consumer — `[selected]` is only read by CSS we're rewriting and by the decoration plugin we're removing.
- Don't expose the internals object publicly. Keep `#internals` private and route through `setSelected()`.

## Phase 2 — Drive state from the interaction

Edit `packages/prose-qti/src/components/hottext/components/qti-hottext-interaction/qti-hottext-interaction.ts`:

1. Add a private method:
   ```ts
   #syncHottextStates(): void {
     const selectedIds = new Set(parseCorrectResponse(this.correctResponse));
     this.querySelectorAll('qti-hottext').forEach(el => {
       const id = el.getAttribute('identifier');
       (el as QtiHottextEdit).setChecked(!!id && selectedIds.has(id));
     });
   }
   ```
   (`QtiHottextEdit` imported from `../qti-hottext/qti-hottext.js`; `parseCorrectResponse` is already used in this file.)
2. Call `#syncHottextStates()`:
   - In `connectedCallback`, after `super.connectedCallback()` and at microtask time so light-DOM children are slotted (e.g. `queueMicrotask(() => this.#syncHottextStates())`).
   - At the end of `#handleClick`, after assigning `this.correctResponse`.
   - From a Lit `updated(changedProperties)` lifecycle hook whenever `changedProperties.has('correctResponse')` — this catches external updates (ProseMirror node-view re-syncs, attribute changes).
3. Also wire to `<slot>`: in `render()`, add `<slot @slotchange=${this.#syncHottextStates}></slot>` so a freshly mounted `qti-hottext` child gets its state on insertion.

Verification:
- Mark a hottext via the existing UI → the wrapped element's CustomStateSet contains `--checked` (visible in DevTools under the element).
- Edit the `correctResponse` attribute directly on the DOM → state propagates.
- Insert a new `<qti-hottext identifier="X">` whose id is already in `correctResponse` → it gains the state immediately via `slotchange`.
- The chip's radio dot / checkbox check fills exactly as in the runtime story (theme-provided).

Anti-patterns:
- Don't read identifiers off the prosekit/decoration plugin path. The interaction owns `correctResponse`; that's the single source of truth.
- Don't store a duplicate `selectedSet` on the interaction. Compute on sync.

## Phase 3 — Slim `qti-hottext-interaction.styles.ts`

Edit the file. After this phase it should look like:

```ts
import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/hottext-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    [part='selection-menu'] {
      position: fixed;
      z-index: 50;
      padding: 6px 8px;
      background: var(--qti-bg, #f8fafc);
      border: 1px solid var(--qti-border, #e2e8f0);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: left;
    }

    [part='selection-action'] {
      border-radius: 4px;
      background: var(--qti-bg, #f8fafc);
      border: 1px solid var(--qti-border, #e2e8f0);
      cursor: pointer;
      font: inherit;
      text-align: center;
      transition: opacity 120ms ease;
    }

    [part='selection-action']:hover {
      opacity: 0.85;
    }
  `,
];

export default styles;
```

Removed: `:host { … }`, `qti-hottext { … }`, `qti-hottext[selected] { … }`. The interaction-level light-DOM look (chip border, background, radio circle, hover, focus, check state) is now entirely the theme's job.

Verification:
- `grep -n ":host\|qti-hottext\[" packages/prose-qti/src/components/hottext/components/qti-hottext-interaction/qti-hottext-interaction.styles.ts` returns nothing.

Anti-patterns:
- Don't move the deleted blocks into `app.css` "just in case." The theme handles them.
- Don't introduce token re-mappings (`--qti-bg-selected` etc.). Use the theme's own tokens directly if a knob is ever needed.

## Phase 4 — Slim `qti-hottext.ts` shadow styles

Edit `packages/prose-qti/src/components/hottext/components/qti-hottext/qti-hottext.ts`. The `static styles` block should reduce to the `×` button only:

```ts
static override styles = css`
  [part='remove'] {
    opacity: 0.65;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 12%, white);
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 0.8em;
    line-height: 1;
    transition:
      opacity 120ms ease,
      background 120ms ease;
  }

  :host(:hover) [part='remove'],
  :host(:focus-within) [part='remove'],
  [part='remove']:hover,
  [part='remove']:focus-visible {
    opacity: 1;
  }

  [part='remove']:hover {
    background: color-mix(in srgb, #dc2626 18%, white);
  }
`;
```

Removed: `:host` (chip background/border/padding), `:host(:hover)` (chip hover), `[part='ch']`, `[part='cha']`, `:host([selected]) [part='ch']`, `:host([selected]) [part='cha']`, `:host(:focus-within)` host outline. The theme covers all of these via `qti-hottext-interaction qti-hottext { @apply check; &:hover { @apply hov } &:focus { @apply foc } }` plus its `::part(ch)` / `::part(cha)` / `:state(--checked)` rules — including the dot-fill on selection.

No editor-side `:state(--checked)` override is added inside `qti-hottext`. The editor-specific blue border is added in Phase 5 in app CSS, where it can be tuned without rebuilding the package.

Verification:
- Hover over a hottext in the editor → chip look comes from the theme (matches the runtime story).
- Author marks a hottext as correct → the theme's `:state(--checked)` styling kicks in (radio/checkbox dot fills).
- `×` button still fades in on hover and removes the hottext.
- `grep -n "selected\]\|#f59e0b\|#16a34a" packages/prose-qti/src/components/hottext/components/qti-hottext/qti-hottext.ts` returns nothing.

Anti-patterns:
- Don't keep the orange `#f59e0b` chip as a fallback. The theme is the source of truth now.
- Don't add `data-correct-response='true'` — the state is the entire mechanism.
- Don't add a `:host(:state(--checked))` rule in the editor element. Whatever override is wanted lives in app CSS, where it can be tuned without rebuilding the package.

## Phase 5 — Editor-only override in `apps/qti-prosemirror-item/src/qti.css`

Add (next to the existing drop-pending/idle blocks) a hottext-selected alias + rule, following the convention already in the file:

```css
:root {
  /* Hottext — marked as correct response in the editor */
  --qti-edit-hottext-checked-border: var(--qti-border-color-focus, #2563eb);
}

/* ─── Hottext — author marked as correct response ──────────────────────────
   Editor-only signal that this hottext is part of the correct response.
   Runtime visual (the radio/checkbox fill via theme's :state(--checked))
   stays intact; we only add an extra blue outline so authors can scan a
   block of text and pick out the "scoring" hottexts at a glance. */
qti-hottext-interaction qti-hottext:state(--checked) {
  outline: 2px solid var(--qti-edit-hottext-checked-border);
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

Token choice: `--qti-border-color-focus` first (theme's focus-border token, which is the closest "interactive-blue" semantic). Hex fallback `#2563eb` is the same `--accent` already in `apps/qti-prosemirror-item/src/app.css:7`, so the editor reads consistently even if the theme variable is absent.

Verification:
- `grep -n "qti-hottext:state(--checked)" apps/qti-prosemirror-item/src/qti.css` returns the new rule.
- In the editor, marking a hottext shows the blue outline on top of the theme's checked fill. Removing it clears both.

Anti-patterns:
- Don't inline the hex without going through `--qti-edit-hottext-checked-border`. The whole point of `qti.css` is the alias indirection.
- Don't override the theme's check-fill (the dot inside the radio circle) — keep the runtime visual visible underneath, the outline is additive.

## Phase 6 — Fixture / story update

Edit `packages/prose-qti/src/components/hottext/interaction-hottext.stories.ts`:

- Remove the `selected` attribute from `<qti-hottext identifier="hottext-b" selected>` and `<qti-hottext identifier="hottext-c" selected>`.
- Set `correct-response="hottext-b,hottext-c"` on the surrounding `<qti-hottext-interaction>` so the interaction's `#syncHottextStates()` derives `--selected` on those two on connect.
- Fixture comment update: "block hottext fixture with multiple selected phrases" → still accurate.

Verification:
- Story renders identically to before (blue outline on those two phrases) without any `selected` attribute in the DOM.

## Phase 7 — Final verification

```
pnpm --filter @citolab/prose-qti exec tsc --noEmit
pnpm vitest run --project unit packages/prose-qti/src/components/hottext/
```

Both green.

Grep guards (all should return nothing):
- `grep -rn "qti-hottext\[selected\]\|\[selected\]" packages/prose-qti/src/components/hottext/`
- `grep -rn "data-correct-response" packages/prose-qti/src/components/hottext/`
- `grep -rn "createHottextSelectedDecorationsPlugin" packages/prose-qti/src/components/hottext/`
- `grep -rn "#f59e0b\|#16a34a" packages/prose-qti/src/components/hottext/`

Manual checks in the running editor / preview:
- Idle hottext chip looks the same (theme drives it).
- Click on a hottext to add to correct response → the chip enters the runtime's `:state(--checked)` look (dot/check fills via theme) AND gains the editor-only blue outline from `qti.css`.
- Click again to remove → both clear.
- Hover → `×` fades in. Click `×` → hottext unwraps.
- Save and reload an item → hottexts whose identifiers are in the saved `correct-response` light up on first paint (slotchange path).

## Out of scope

- Runtime `qti-hottext-interaction` (in QTI-Components). Unchanged.
- Other interactions' `:host` styles. Untouched.
- `app.css`. Confirmed no hottext rules; nothing to delete or add.
- The Lit element behavior outside state plumbing (radio click, remove event). Unchanged.

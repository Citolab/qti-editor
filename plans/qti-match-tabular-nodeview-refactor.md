# Plan: Refactor `qti-match-interaction-tabular` editor — slot-based, marks-aware

## Goal

Replace the current Lit web component (`QtiMatchInteractionTabularEdit`) with a clean ProseMirror-native rendering that:

1. **Keeps the QTI markup as authored** — two `<qti-simple-match-set>` blocks each containing `<qti-simple-associable-choice>` elements, all editable as ProseMirror content (with `strong` / `em` marks).
2. **Renders the checkbox grid in a shadow root** owned by a small custom element, using **slots** to project the source/target labels into table cells. No `cloneNode` snapshots — slot projection keeps cells live as the user edits.
3. **Free design freedom** — do *not* mirror qti-components' lightdom `<table>` / `part="..."` shape. Build whatever DOM is convenient. Whatever wins here can be ported back to `qti-components` as a follow-up experiment.

Drop from the previous plan: the `::part(...) → [part~="..."]` mirror stylesheet, the textarea widgets, the "byte-for-byte qti-components parity" constraint.

---

## Phase 0 — Confirmed facts (Documentation Discovery)

From the investigation:

- **Choice schema already supports inline marks.** `qtiSimpleAssociableChoice` content = `'qtiSimpleAssociableChoiceParagraph | qtiMedia'` ([qti-simple-associable-choice.schema.ts:3-6](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice.schema.ts#L3-L6)); paragraph content = `'inline*'` ([qti-simple-associable-choice-paragraph.schema.ts:3-9](packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice-paragraph.schema.ts#L3-L9)); marks come from `prosemirror-schema-basic` ([apps/qti-prosemirror-item/src/schema.ts:14,54-55](apps/qti-prosemirror-item/src/schema.ts#L14)) → `strong`, `em`, `code`, `link` available **today** with no schema change.
- **Match-set schema:** `content: 'qtiSimpleAssociableChoice+'` ([qti-simple-match-set.schema.ts:3-14](packages/prose-qti/src/components/shared/components/qti-simple-match-set/qti-simple-match-set.schema.ts#L3-L14)).
- **Tabular schema:** `content: 'qtiPrompt? qtiSimpleMatchSet{2}'` — unchanged in this refactor ([qti-match-interaction-tabular.schema.ts:23-96](packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.schema.ts#L23-L96)).
- **Editor only registers editor-side custom elements** — `customElements.define('qti-match-interaction-tabular', QtiMatchInteractionTabularEdit)` ([packages/prose-qti/src/components/match/register.ts](packages/prose-qti/src/components/match/register.ts)). qti-components runtime elements are **not** registered in the editor. Theme CSS *is* imported via `@import '@qti-components/theme/item.css'` ([apps/qti-prosemirror-item/src/style.css:2](apps/qti-prosemirror-item/src/style.css#L2)), but those `::part()` rules don't apply because the runtime element isn't upgraded.

### Patterns to copy

| Pattern | Source | Use for |
|---|---|---|
| Plain-DOM nodeView with `applyAttrs` + `ignoreMutation` | [packages/prose-qti/src/components/gap-match/extensions/node-view.ts:1-73](packages/prose-qti/src/components/gap-match/extensions/node-view.ts) | The tabular nodeView (if we need one — see Phase 1 decision) |
| `pluginFactories` registration | [packages/prose-qti/src/components/match/descriptor.ts:25-65](packages/prose-qti/src/components/match/descriptor.ts) | Hooking new plugins in |
| `nodeAttrsSyncPlugin` reacting to a custom event from inside a web component | [packages/prose-extensions/src/prosemirror/node-attrs-sync/node-attrs-sync-plugin.ts:49-89](packages/prose-extensions/src/prosemirror/node-attrs-sync/node-attrs-sync-plugin.ts) | If the host element captures cell clicks and needs to push `correctResponse` back into PM attrs |

### Anti-patterns

- ❌ Lit, `@property`, `html` template literals, `MutationObserver` over self.
- ❌ `cloneNode(true)` of choice content into table cells — kills live editing. Use **slot projection** instead.
- ❌ Re-creating the host element on every PM `update()`. Mutate in place.
- ❌ Mirroring qti-components' `part="..."` attributes. Use whatever class/structure makes sense here.

---

## Phase 1 — Pick the rendering shape

Two equivalent architectures; both meet the goals. Pick one before Phase 2.

### Option A — Rewrite the existing element with shadow DOM + slots (recommended)

Keep the tag name `<qti-match-interaction-tabular>` and its registration in [register.ts](packages/prose-qti/src/components/match/register.ts). **Replace the class body** in [qti-match-interaction-tabular.ts](packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts): drop `LitElement`, `@property`, `html` templates, the `MutationObserver` self-watch, `emitChange`, `onClick`, `renderMatrix`. The new class extends `HTMLElement` directly and owns a shadow root.

```html
<qti-match-interaction-tabular>
  <!-- lightdom: ProseMirror's contentDOM — fully editable -->
  <qti-simple-match-set slot="sources">
    <qti-simple-associable-choice identifier="C" match-max="1">
      <p>Capulet</p>
    </qti-simple-associable-choice>
    …
  </qti-simple-match-set>
  <qti-simple-match-set slot="targets">
    <qti-simple-associable-choice identifier="M" match-max="4">
      <p>A Midsummer-Night's Dream</p>
    </qti-simple-associable-choice>
    …
  </qti-simple-match-set>

  <!-- shadowRoot, rendered by the element itself: -->
  #shadow-root
    <style>…grid CSS, scoped automatically…</style>
    <table>
      <tr>
        <th></th>
        <th><slot name="t-M"></slot></th>
        <th><slot name="t-R"></slot></th>
        <th><slot name="t-T"></slot></th>
      </tr>
      <tr>
        <th><slot name="s-C"></slot></th>
        <td><input type="radio" data-pair="C M" /></td>
        <td><input type="radio" data-pair="C R" /></td>
        <td><input type="radio" data-pair="C T" /></td>
      </tr>
      …
    </table>
</qti-match-interaction-tabular>
```

How slots stay live:

- The element observes `<qti-simple-associable-choice>` children, and for each one **assigns its content** into a uniquely-named slot. Two strategies — pick one:
  - **A1.** Move each choice's *children* (the `<p>…</p>`) into a slot wrapper: not viable, would corrupt PM's view of the document.
  - **A2.** Don't move anything. Add per-choice `slot="s-<identifier>"` / `slot="t-<identifier>"` attributes to the choice elements themselves, and add matching `<slot name="…">` inside the shadow's table cells. The slot then projects the entire `<qti-simple-associable-choice>` into the cell. CSS in the shadow root hides everything inside the projected element except the paragraph text (or restyles the choice element to look like a label). **This is the preferred path.**
- The element manages slot assignment on every change. It does **not** need to observe text edits — slot projection is automatic; PM's edits inside the choice immediately re-render in the table cell.
- The element only needs to react to **structural** changes: choices added/removed/reordered, or `identifier` attribute changes. Use a narrow `MutationObserver` (`childList: true` on each match-set, `attributes: ['identifier']` on each choice) — this is fine; it is **not** the old self-observation anti-pattern, it watches well-defined children for well-defined changes only.
- The element's table layout (rows × columns × checkbox/radio types) is rebuilt when structural changes fire.

ProseMirror nodeView for this element:

```ts
return {
  dom,                        // <qti-match-tabular-grid>
  contentDOM: dom,            // PM renders qtiPrompt + 2 qtiSimpleMatchSet INTO dom as lightdom
  update(newNode) {           // attrs changed
    applyAttrs(dom, newNode.attrs);
    return true;
  },
  ignoreMutation(rec) {
    // Mutations inside the shadow root never bubble to ProseMirror — done.
    // Mutations on dom's own attributes (we update them in applyAttrs): ignore.
    return rec.type === 'attributes' && rec.target === dom;
  },
};
```

Plus a tiny shim before contentDOM is wired: when the element receives a new choice child (PM inserts one), set `child.slot = 's-<identifier>'` (or `t-`, depending on which match-set it sits inside) so the shadow's `<slot name="s-…">` picks it up. Identifier renames → reassign the slot.

**Why this is clean:** PM owns the choices; shadow DOM owns the table; slots wire them up; there's no cloning, no separate textarea widget, and bold/italic just work because the slotted choices are PM-editable paragraphs.

### Option B — Plain nodeView, table in lightdom alongside contentDOM

Same idea but no shadow root. NodeView returns `dom = <div>` wrapper, `contentDOM = <qti-match-interaction class="qti-match-tabular">` containing the editable match-sets, and a `<table>` rendered as a sibling under `dom`. The table cells contain **clones** of choice content updated on every `update()` and `ignoreMutation` filters the table subtree.

Drawbacks: cloning means table cells lag PM by one transaction tick (and can flicker on partial updates); no automatic projection; more `ignoreMutation` complexity. Acceptable but inferior to A.

**Decision: Option A.** Phases below assume it.

---

## Phase 2 — Rewrite `<qti-match-interaction-tabular>` as a plain HTMLElement with shadow DOM

### File

Same path: [packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts](packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts). Same export name kept where convenient (or rename `QtiMatchInteractionTabularEdit` → `QtiMatchInteractionTabularElement` — update [register.ts](packages/prose-qti/src/components/match/register.ts) to match).

### Skeleton

```ts
export class QtiMatchInteractionTabularElement extends HTMLElement {
  static observedAttributes = ['data-first-column-header', 'correct-response'];

  private root: ShadowRoot;
  private structureObserver?: MutationObserver;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = `<style>${GRID_CSS}</style><div class="grid"></div>`;
  }

  connectedCallback() {
    this.observeStructure();
    this.renderGrid();
  }

  disconnectedCallback() {
    this.structureObserver?.disconnect();
  }

  attributeChangedCallback() {
    this.renderGrid();
  }

  /** Called by the nodeView when PM signals an update. */
  rerender() {
    this.assignChoiceSlots();
    this.renderGrid();
  }

  private observeStructure() {
    this.structureObserver = new MutationObserver(() => {
      this.assignChoiceSlots();
      this.renderGrid();
    });
    this.structureObserver.observe(this, {
      childList: true,
      subtree: true,
      attributeFilter: ['identifier', 'match-max'],
    });
  }

  /** Tag each <qti-simple-associable-choice> with slot="s-<id>" or "t-<id>". */
  private assignChoiceSlots() { … }

  /** (Re)build the table inside the shadow root from current children. */
  private renderGrid() { … }
}

// Registration stays in register.ts — keep the existing tag name.
```

### `renderGrid` contract

Reads:
- `sources = this.querySelectorAll('qti-simple-match-set:first-of-type qti-simple-associable-choice')`
- `targets = this.querySelectorAll('qti-simple-match-set:last-of-type qti-simple-associable-choice')`
- `correctResponse = JSON.parse(this.getAttribute('correct-response') ?? '[]')`
- `firstColumnHeader = this.getAttribute('data-first-column-header') ?? ''`

Writes a shadow-DOM `<table>` whose:
- Top-left `<th>` contains `firstColumnHeader` text.
- Top row `<th>` per target contains `<slot name="t-${target.identifier}"></slot>`.
- Each row `<th>` contains `<slot name="s-${source.identifier}"></slot>`.
- Each cell `<td>` contains a single `<input>` whose `type` is `radio` if the source's `match-max === 1` else `checkbox`, `name="<sourceId>"`, `value="<sourceId> <targetId>"`, `checked` iff the pair is in `correctResponse`.

### Style scope

CSS lives **inside** the shadow root — fully scoped. Free to design however you like (CSS grid or `<table>`; whatever looks like the screenshot). Suggested: simple `<table>` with class-based selectors (`.grid`, `.cell`, `.cell--checked`), `:host` to react to attrs.

### Slot projection of choice content

The projected `<qti-simple-associable-choice>` will visually contain its whole structure (a paragraph element). In the shadow CSS, add:

```css
::slotted(qti-simple-associable-choice) {
  display: block;
  /* the paragraph inside renders inline-block by default; let it flow */
}
```

PM's bold/italic marks just render as `<strong>` / `<em>` inside the projected `<p>` — they show up live in the table cells.

### Click → correctResponse

When the user clicks an `<input>` in the shadow:

1. Read all currently-checked inputs, build the new pairs array.
2. Dispatch the existing `qti-prosemirror-node-attrs-change` custom event so [nodeAttrsSyncPlugin](packages/prose-extensions/src/prosemirror/node-attrs-sync/node-attrs-sync-plugin.ts) translates it into a `tr.setNodeMarkup`:

```ts
this.dispatchEvent(new CustomEvent('qti-prosemirror-node-attrs-change', {
  bubbles: true, composed: true,
  detail: {
    nodeType: 'qtiMatchInteractionTabular',
    tagName: 'qti-match-interaction-tabular',
    attrs: { correctResponse: pairs.length ? JSON.stringify(pairs) : null },
  },
}));
```

This is the **one** sanctioned use of the custom-event sync — for a host element that owns user input not represented by an editable PM child. It's not the old anti-pattern (self-mutation loop) because the event is fired in response to a discrete user click, not a re-render.

### Verification

- `customElements.get('qti-match-interaction-tabular')` is still defined (registration unchanged); the upgraded class is the new plain-DOM one.
- Editing a choice's text shows live in both the lightdom choice **and** the projected table cell.
- Adding `**bold**` via the toolbar renders bold in the cell.
- Clicking a cell dispatches the change event; PM's doc has the new `correctResponse` attr.

---

## Phase 3 — Replace the Lit component with a slim nodeView plugin

### Files

- Phase 2 already rewrote [qti-match-interaction-tabular.ts](packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.ts) (Lit removed, plain `HTMLElement` with shadow DOM).
- [register.ts](packages/prose-qti/src/components/match/register.ts) — **no change** to the `customElements.define('qti-match-interaction-tabular', …)` line; if the class export was renamed, update the import only.
- **Add** `packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/qti-match-interaction-tabular.node-view.ts`:

```ts
export function createQtiMatchTabularNodeViewPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey('qtiMatchInteractionTabular.nodeView'),
    props: {
      nodeViews: {
        qtiMatchInteractionTabular: (node) => {
          const dom = document.createElement('qti-match-interaction-tabular') as QtiMatchInteractionTabularElement;
          applyAttrs(dom, node.attrs);
          return {
            dom,
            contentDOM: dom, // PM renders qtiPrompt + 2x qtiSimpleMatchSet here
            update(newNode) {
              if (newNode.type.name !== 'qtiMatchInteractionTabular') return false;
              applyAttrs(dom, newNode.attrs);
              dom.rerender();
              return true;
            },
            ignoreMutation(record) {
              // Attribute mutations on the host (we set them) — ignore.
              if (record.type === 'attributes' && record.target === dom) return true;
              // Shadow-root mutations don't bubble; nothing else to filter.
              return false;
            },
          };
        },
      },
    },
  });
}

function applyAttrs(el: HTMLElement, attrs: Record<string, unknown>) {
  const set = (name: string, val: unknown) =>
    val == null ? el.removeAttribute(name) : el.setAttribute(name, String(val));
  set('response-identifier', attrs.responseIdentifier);
  set('max-associations',    attrs.maxAssociations);
  set('min-associations',    attrs.minAssociations);
  set('shuffle',             attrs.shuffle ? '' : null);
  set('class',               (attrs.class as string | null) ?? 'qti-match-tabular');
  set('data-first-column-header', attrs.dataFirstColumnHeader);
  set('correct-response',    attrs.correctResponse);
}
```

- **Update** [packages/prose-qti/src/components/match/descriptor.ts](packages/prose-qti/src/components/match/descriptor.ts) — add `createQtiMatchTabularNodeViewPlugin` to the tabular variant's `pluginFactories`.
- **Leave the schema unchanged.** `parseDOM` still matches `qti-match-interaction[class~="qti-match-tabular"]` and the legacy editor tag; `toDOM` still emits `<qti-match-interaction-tabular>`. The nodeView is the source of truth for the editing DOM; serialisation paths are untouched.

### Verification

- `grep -R "QtiMatchInteractionTabularEdit" packages/prose-qti/src/` → no hits (if renamed). If kept, ensure the class no longer extends Lit `Interaction`.
- `grep -R "MutationObserver" packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/` → only the narrow structural observer inside the rewritten class.
- No imports of `lit` in `components/qti-match-interaction-tabular/`.

---

## Phase 4 — Styles

- No CSS mirror, no `[part~="…"]` rewrite. The element's shadow root carries its own CSS. Write whatever matches the screenshot (simple table, light borders, rounded checkboxes).
- If the host element renders a too-empty appearance outside the shadow root (slotted choice elements normally show their own paragraph), add a few rules in the editor's existing component CSS to keep the lightdom looking sensible while it lives next to the table. (Optional: hide the lightdom match-sets with `:host > qti-simple-match-set { display: none }` *only after* confirming PM can still find the contentDOM children for editing — slotting handles visibility for the projected nodes anyway, so this is likely unnecessary.)

### Verification

- The rendered editor looks like the screenshot the user pasted (header row + row labels + checkboxes/radios).
- Inspector shows the shadow root with `<table>` and `<slot>`s; the lightdom has the unmodified QTI markup.

---

## Phase 5 — Tests + (optional) qti-components experiment

### Tests

Model on the existing browser tests in the folder:

- `qti-match-tabular-grid.browser.test.ts` — mount the element with lightdom children, assert shadow-root table dimensions, slot names, input types per `match-max`, checked state per `correct-response`.
- `qti-match-interaction-tabular.node-view.browser.test.ts` — wire the nodeView into a minimal editor, dispatch text edits inside a choice, assert the projected slot updates live; click a checkbox, assert PM's `correctResponse` attr updates.
- Keep the existing `*.schema.browser.test.ts` and `*.compose.browser.test.ts` green (no schema/compose changes).

### qti-components experiment (follow-up, optional)

If the slot-projection approach feels right in the editor, port the same idea into qti-components' runtime element:

- Replace the current `cloneNode` snapshot of choice content with `<slot name="s-<id>">` projection.
- Replace the part-soup with the simpler shadow-scoped CSS.
- File the change as a draft PR against `/Users/patrickklein/Projects/Edtech/QTI/QTI-Components` so the runtime and editor share the rendering pattern.

This is **not** in scope for the editor PR — note it in the PR description as a follow-up.

### Final verification checklist

- [ ] `grep -R "QtiMatchInteractionTabularEdit" packages/prose-qti/src/` returns no results.
- [ ] `grep -R "lit" packages/prose-qti/src/components/match/components/qti-match-interaction-tabular/` returns no `import` lines.
- [ ] Live edit: typing inside a choice updates the cell label without any visible re-mount.
- [ ] Bold/italic via toolbar inside a choice render bold/italic in the projected cell.
- [ ] Clicking a checkbox/radio updates `correctResponse` in PM state (verify via the PM doc JSON in devtools).
- [ ] Export → reimport round-trip preserves choices, marks, correctResponse, and `data-first-column-header`.

---

## Open question (small)

The `data-first-column-header` text currently lives in the schema attr (not an editable PM node). It's rendered as a plain text label in the top-left cell. Options:

- **Keep as attr** (current plan) — minimal change, edited via a small inline `<input>` rendered inside the shadow (which fires the same `qti-prosemirror-node-attrs-change` event on commit).
- **Promote to a schema node** — most consistent with the "everything inline-editable" direction, but adds schema/migration work.

Default: keep as attr + tiny shadow-input editor in the top-left cell. Flag for revisit if it feels awkward.

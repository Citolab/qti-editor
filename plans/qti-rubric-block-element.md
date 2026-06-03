# Plan: Standalone `qti-rubric-block` element

## Goal

Add a user-authorable, block-level `<qti-rubric-block>` PM node so authors can drop instruction/scoring/navigation rubrics anywhere in the item body. Required attrs: `use` (instructions | scoring | navigation), `view` (author | candidate | proctor | scorer | testConstructor | tutor). Body content lives inside a wire-level `<qti-content-body>` wrapper. **Out of scope:** the `qti-rubric-discretionary-placement` / `qti-rubric-inline` shared classes, `<qti-catalog-info>`, `ext:*` use values.

Disambiguation from existing rubric-block code: today a `<qti-rubric-block view="scorer" use="scoring">` is **synthesized** by [packages/prosemirror/interaction-extended-text/.../qti-extended-text-interaction.compose.ts:22-39](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.compose.ts#L22-L39) when an extended-text interaction has a `data-rubric-block` value. That stays. This plan adds a **separate, standalone, user-inserted** rubric-block node — a different code path.

---

## Phase 0 — Facts established

### Existing rubric-block references (NOT a PM node yet)
- [packages/prosemirror/interaction-extended-text/.../qti-extended-text-interaction.compose.ts:22-39](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.compose.ts#L22-L39) — synthesizes scorer/scoring rubric on export from extended-text.
- [packages/qti/qti3-item-import/src/roundtrip-extended-text/index.ts:20-43](packages/qti/qti3-item-import/src/roundtrip-extended-text/index.ts#L20-L43) — on foreign-QTI import, copies a scorer/scoring rubric's text back onto the (single) extended-text interaction. **Does not remove the block.**
- [packages/qti/roundtrip-import/src/index.ts:314-320](packages/qti/roundtrip-import/src/index.ts#L314-L320) — `stripGeneratedRubricBlocks` removes ALL `view="scorer" use="scoring"` blocks during ZIP/package import. Only runs on the package import path (not single-item).
- [apps/editor/src/lib/importXml.ts:88](apps/editor/src/lib/importXml.ts#L88) — `preserve.elementTags: ['qti-rubric-block']` — the migration pipeline already preserves the tag.
- [packages/prosemirror/extensions/src/compatibility/dom.browser.test.ts:32-48](packages/prosemirror/extensions/src/compatibility/dom.browser.test.ts#L32-L48) — confirms `qti-rubric-block` survives the HTML-fragment migration as raw HTML (no PM node).

### Reference shape — `qti-item-divider` package
Mirror this layout 1:1:
- [packages/prosemirror/qti-item-divider/package.json](packages/prosemirror/qti-item-divider/package.json) — name, deps, exports.
- [packages/prosemirror/qti-item-divider/src/index.ts](packages/prosemirror/qti-item-divider/src/index.ts) — barrel.
- [packages/prosemirror/qti-item-divider/src/qti-item-divider.schema.ts](packages/prosemirror/qti-item-divider/src/qti-item-divider.schema.ts) — `NodeSpec`.
- [packages/prosemirror/qti-item-divider/src/qti-item-divider.ts](packages/prosemirror/qti-item-divider/src/qti-item-divider.ts) — Lit custom element.
- [packages/prosemirror/qti-item-divider/src/qti-item-divider.commands.ts](packages/prosemirror/qti-item-divider/src/qti-item-divider.commands.ts) — insert command.
- [packages/prosemirror/qti-item-divider/src/descriptor.ts](packages/prosemirror/qti-item-divider/src/descriptor.ts) — `InteractionDescriptor`.

### Registry / wiring points
- Descriptor registry: [packages/qti/core/src/interactions/composer.ts:11,32](packages/qti/core/src/interactions/composer.ts#L11-L32) — add the new descriptor.
- Slash menu label map: [apps/editor/src/components/blocks/slash-menu/slash-menu.ts:36-48](apps/editor/src/components/blocks/slash-menu/slash-menu.ts#L36-L48) — add `'qti-rubric-block': 'interactionInsert.rubricBlock'`.
- App i18n: [apps/editor/src/i18n.ts](apps/editor/src/i18n.ts).
- Shared i18n (panel labels): [packages/prosemirror/interaction-shared/src/i18n/messages.ts](packages/prosemirror/interaction-shared/src/i18n/messages.ts).
- App dep list: [apps/editor/package.json](apps/editor/package.json) — add `@qti-editor/qti-rubric-block`.

### Attribute panel input types
The renderer at [packages/prosemirror/attributes-ui/src/index.ts:207-220](packages/prosemirror/attributes-ui/src/index.ts#L207-L220) infers `input: 'select'` when a field declares `options: [...]`. So no new UI work — declare both `use` and `view` with `options` arrays.

### Composer pass-through
[packages/qti/core/src/composer/index.ts:199](packages/qti/core/src/composer/index.ts#L199) `buildAssessmentItemXml` imports the entire `<qti-item-body>` subtree via `xmlDoc.importNode(sourceBodyRoot, true)` and then `composeAndNormalizeItemBody` walks interactions only. Non-interaction qti-* elements (like the synthesized rubric-block today) pass through unchanged. **No composer changes needed.**

### Round-trip collision matrix
| Path | Behavior | Concern |
|---|---|---|
| Lossless XML export (`xmlFromNode`) | PM `toDOM` emits `<qti-rubric-block><qti-content-body>…</qti-content-body></qti-rubric-block>` | None — symmetric with parseDOM. |
| Lossless XML import (`importRoundtripXml`) | `xmlToHTML` → `jsonFromHTML` uses parseDOM | None. |
| Single-item QTI3 export (`exportItem`) | Element flows through `buildAssessmentItemXml` unchanged | None — `composeAndNormalizeItemBody` doesn't touch non-interaction qti-* nodes. |
| Single-item QTI3 import (`Import QTI XML`) — **editor-origin** | `isEditorOriginXml` → skip `roundtripQtiItem` → parseDOM picks up the block | None. |
| Single-item QTI3 import — **foreign** | `roundtripQtiItem` runs (`roundtripExtendedText` etc.) → then parseDOM | **Edge case:** if the foreign file has both a `view="scorer" use="scoring"` block **and** exactly one extended-text interaction, the block's text gets copied onto the interaction's `data-rubric-block` **and** the block remains as a standalone PM node — duplicated content. Document; do not fix in v1. |
| Package (`.zip`) import | `stripGeneratedRubricBlocks` removes ALL scorer/scoring blocks unconditionally | **Edge case:** user-authored scorer/scoring block in a package would be silently stripped. The user has stated tests/packages will never be imported — acceptable. |

### Anti-patterns to avoid
- Don't model the rubric-block as an `atom: true` node. Authors must edit body text inline — content is `block+`.
- Don't model `<qti-content-body>` as its own PM node. It's a wire-format wrapper only; declare it via NodeSpec `toDOM`/`parseDOM` `contentElement` and skip it in PM's content model.
- Don't add interaction-recovery to `composerHandler` — the rubric is not an interaction. Leave `composerHandler: undefined` (same as divider).
- Don't `setSelection(...)` after insert (divider does, but it's an atom). For rubric-block, after insert place selection inside the new node's first paragraph.
- Don't try to delete the scorer/scoring synthesis from extended-text. It's the only place `data-rubric-block` becomes QTI-native; ripping it out is a separate plan.
- Don't add a runtime "warn if user picks view=scorer/use=scoring" guard. Spec allows it; round-trip collision only bites foreign imports. Note in docs.
- Don't add `qti-catalog-info` parseDOM. The migration's `preserve` list doesn't cover it; if it appears in foreign QTI it'll be silently dropped by `xmlToHTML`. Acceptable for v1.
- Don't allow interactions inside the rubric-block content. PM enforces this via the `content:` spec (use a content group that excludes interactions — see Phase 2).

---

## Phase 1 — Create the package

Mirror [packages/prosemirror/qti-item-divider/](packages/prosemirror/qti-item-divider/) at [packages/prosemirror/qti-rubric-block/](packages/prosemirror/qti-rubric-block/). New files:

```
packages/prosemirror/qti-rubric-block/
  package.json
  tsconfig.json                 (copy from divider)
  src/
    index.ts                    barrel
    qti-rubric-block.schema.ts  NodeSpec
    qti-rubric-block.ts         Lit element (visual wrapper)
    qti-rubric-block.commands.ts insert command
    descriptor.ts               InteractionDescriptor
```

`package.json` — copy divider's, change `name` → `@qti-editor/qti-rubric-block`, `version` → `1.0.0`, `description` → "QTI rubric block element for instructions, scoring, or navigation rubrics."

`src/index.ts`:
```ts
export { qtiRubricBlockNodeSpec } from './qti-rubric-block.schema.js';
export { QtiRubricBlock } from './qti-rubric-block.js';
export { insertRubricBlock, createInsertRubricBlockCommand } from './qti-rubric-block.commands.js';
export { qtiRubricBlockDescriptor } from './descriptor.js';
```

### Verification
- `pnpm install` resolves the new workspace package.
- `pnpm --filter @qti-editor/qti-rubric-block build` succeeds.

---

## Phase 2 — Schema (`qti-rubric-block.schema.ts`)

**Content model:** non-atom block, **paragraphs and lists only** — no headings, no images, no tables, no interactions. Marks allowed inside paragraphs: `bold` and `italic` (the project's standard text marks). Hard breaks are disallowed.

Use `content: '(paragraph | bulletList | orderedList)+'`. Hard-coded but contained; no other packages need to know about rubric-block. Marks are controlled at the paragraph/text level — bold + italic come for free because they're the only marks the project's schema defines (see [apps/editor/src/extensions/basic-extension.ts:67-68](apps/editor/src/extensions/basic-extension.ts#L67-L68)).

A future iteration can tighten further (e.g., disallow nested lists) once the editing experience is validated.

```ts
import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const USE_VALUES = ['instructions', 'scoring', 'navigation'] as const;
const VIEW_VALUES = ['author', 'candidate', 'proctor', 'scorer', 'testConstructor', 'tutor'] as const;

export const qtiRubricBlockNodeSpec: NodeSpec = {
  group: 'block',
  content: '(paragraph | bulletList | orderedList)+',
  defining: true,
  attrs: {
    use: { default: 'instructions' },
    view: { default: 'author' },
  },
  parseDOM: [
    {
      tag: 'qti-rubric-block',
      contentElement: (dom) => {
        if (!(dom instanceof Element)) return dom as Element;
        return dom.querySelector('qti-content-body') ?? dom;
      },
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        const use = dom.getAttribute('use') ?? 'instructions';
        const view = dom.getAttribute('view') ?? 'author';
        return { use, view };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'qti-rubric-block',
      { use: node.attrs.use, view: node.attrs.view, class: 'qti-rubric-block' },
      ['qti-content-body', {}, 0],
    ];
  },
};
```

**Notes:**
- `defining: true` keeps selections from accidentally splitting the rubric-block on Enter at its edges.
- `contentElement` is a function (DOM-level pulled-out container) so both `<qti-rubric-block><qti-content-body>…</qti-content-body></qti-rubric-block>` and legacy `<qti-rubric-block>direct content</qti-rubric-block>` parse.
- `toDOM` always emits the `<qti-content-body>` wrapper — symmetric on round-trip.
- Verify `bulletList` / `orderedList` are the correct node names in this project's schema (check via `grep -n "name: 'bulletList'" packages/`) — adjust if different.
- The content expression intentionally **excludes** headings, images, tables, hardBreak, and all interactions. Authors get plain text (with bold/italic) and lists only.

### Verification
- Unit test: round-trip a tiny rubric-block (use="scoring" view="scorer" with two `<p>` children) through `xmlFromNode` → `xmlToHTML` → `jsonFromHTML` → `nodeFromJSON`; assert PM JSON equivalence.
- Unit test: parsing `<qti-rubric-block>` without `<qti-content-body>` wrapper still works (foreign QTI may emit either).

---

## Phase 3 — Lit element, command, descriptor

### `qti-rubric-block.ts` (visual wrapper, copy divider's shape)

LitElement, `createRenderRoot()` returns `this` (light DOM — PM needs to manage children). Render two reactive properties (`use`, `view`) reflected as attributes; visual style: a dashed/colored border + a small badge in the corner showing "📋 {view} · {use}" so the user can see which rubric is which. Slot the content via `<slot></slot>` — but since we use light DOM, ProseMirror renders content directly inside the element. So the Lit `render()` should be a wrapping `<div>` plus a header badge — keep it simple and accept that PM appends/manages children.

**Caveat:** with light DOM + ProseMirror, the Lit component shouldn't render children — PM owns them. The element is purely a *styling host* via attributes/CSS. Cleanest implementation: NodeSpec `toDOM` returns plain `['qti-rubric-block', attrs, ['qti-content-body', 0]]` and the visual badge comes from CSS only — **skip the Lit element entirely** for v1 if it complicates content rendering. Mirror `qti-item-divider`'s decision to render via Lit only because it's an atom; for content nodes the simpler path is CSS-on-the-wire-element.

**Decision:** v1 ships *without* a Lit element. The NodeSpec emits the tags; styling is added via a CSS file imported by the editor app (or inlined into the package as a stylesheet export). A future iteration can introduce a Lit element with light-DOM rendering and a header bar.

### `qti-rubric-block.commands.ts`

```ts
import { TextSelection } from 'prosemirror-state';
import type { Command, EditorState, Transaction } from 'prosemirror-state';

export function insertRubricBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { schema, tr } = state;
  const rubricType = schema.nodes.qtiRubricBlock;
  const paragraphType = schema.nodes.paragraph;
  if (!rubricType || !paragraphType) return false;

  const { $from } = state.selection;
  const insertPos = $from.after();
  if (dispatch) {
    const empty = paragraphType.create();
    const node = rubricType.create(undefined, empty);
    tr.insert(insertPos, node);
    // Place selection inside the new paragraph
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export const createInsertRubricBlockCommand = (): Command => insertRubricBlock;
```

### `descriptor.ts`

```ts
import type { InteractionDescriptor } from '@qti-editor/interfaces';
import { qtiRubricBlockNodeSpec } from './qti-rubric-block.schema.js';
import { insertRubricBlock } from './qti-rubric-block.commands.js';

const USE_VALUES = ['instructions', 'scoring', 'navigation'];
const VIEW_VALUES = ['author', 'candidate', 'proctor', 'scorer', 'testConstructor', 'tutor'];

export const qtiRubricBlockDescriptor = {
  tagName: 'qti-rubric-block',
  nodeTypeName: 'qtiRubricBlock',
  nodeSpecs: [{ name: 'qtiRubricBlock', spec: qtiRubricBlockNodeSpec }],
  insertCommand: insertRubricBlock,
  keyboardShortcut: 'Mod-Shift-r',
  composerMetadata: {
    tagName: 'qti-rubric-block',
    nodeTypeName: 'qtiRubricBlock',
    responseProcessing: { templateUri: '', internalSourceXml: '' },
    nonQtiAttributes: [],
    userEditableAttributes: ['use', 'view'],
  },
  composerHandler: undefined,
  attributePanelMetadata: {
    qtirubricblock: {
      nodeTypeName: 'qtiRubricBlock',
      editableAttributes: ['use', 'view'],
      fields: {
        use: { label: 'Use', input: 'select', options: USE_VALUES },
        view: { label: 'View', input: 'select', options: VIEW_VALUES },
      },
    },
  },
} satisfies InteractionDescriptor;
```

**Note on the panel-metadata key:** the panel resolver lowercases `nodeTypeName`; confirm against [packages/ui/src/components/composer-metadata-form/composer-metadata-form.ts](packages/ui/src/components/composer-metadata-form/composer-metadata-form.ts) or the resolver call site. Key must be `qtirubricblock` (all-lowercase). Verify with `grep -rn "qtiitemdivider" packages/` and confirm the convention.

### Verification
- TypeScript compiles the package: `pnpm --filter @qti-editor/qti-rubric-block exec tsc --noEmit`.

---

## Phase 4 — Wire into the editor

### 4a. Add to descriptor registry
[packages/qti/core/src/interactions/composer.ts](packages/qti/core/src/interactions/composer.ts):
- After line 11: `import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';`
- In `registeredDescriptors` (after `qtiItemDividerDescriptor` at line 32): `qtiRubricBlockDescriptor,`

### 4b. Add app dependency
[apps/editor/package.json](apps/editor/package.json), after `"@qti-editor/qti-item-divider"`: `"@qti-editor/qti-rubric-block": "workspace:*"`.

Then: `pnpm install`.

### 4c. Add core dependency
[packages/qti/core/package.json](packages/qti/core/package.json) — must already include `qti-item-divider`; add the rubric-block sibling.

### 4d. Slash menu label
[apps/editor/src/components/blocks/slash-menu/slash-menu.ts:36-48](apps/editor/src/components/blocks/slash-menu/slash-menu.ts#L36-L48), add:
```ts
'qti-rubric-block': 'interactionInsert.rubricBlock',
```

### 4e. CSS (optional v1 polish)
Add a stylesheet (e.g., `apps/editor/src/styles/rubric-block.css` or extend an existing global) that gives `qti-rubric-block` a visible boundary so authors can see where it begins/ends. Example:
```css
qti-rubric-block {
  display: block;
  border-left: 3px solid #6366f1;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
  background: #eef2ff;
  border-radius: 0.25rem;
}
qti-rubric-block::before {
  content: 'Rubric — view: ' attr(view) ' · use: ' attr(use);
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #4338ca;
  margin-bottom: 0.25rem;
}
qti-rubric-block > qti-content-body {
  display: block;
}
```

### Verification
- App typecheck: `pnpm --filter @qti-editor/app exec tsc --noEmit`.
- Start dev server, slash menu now shows "Rubric block".
- After insert, attribute panel shows two `<select>` fields with the documented option lists.

---

## Phase 5 — i18n

### 5a. App-level (slash menu label)
[apps/editor/src/i18n.ts](apps/editor/src/i18n.ts) — locate the `interactionInsert.*` block (or wherever the divider key lives) and add:
- `en`: `interactionInsert.rubricBlock: 'Rubric block'`
- `nl`: `interactionInsert.rubricBlock: 'Rubricblok'`

Re-grep the file for existing convention before assuming the path — keys may be nested.

### 5b. Shared (attribute panel labels — optional)
If panel field labels go through i18n, add `composerMetadata.rubricBlockUse` / `composerMetadata.rubricBlockView` to [packages/prosemirror/interaction-shared/src/i18n/messages.ts](packages/prosemirror/interaction-shared/src/i18n/messages.ts) and reference them from the descriptor `fields[…].label`. If labels are plain strings (as the divider's are), skip this.

### Verification
- `rg -n "interactionInsert.rubricBlock" apps/editor/src/i18n.ts` returns hits in both `en` and `nl` blocks.

---

## Phase 6 — Tests + verification

### 6a. Schema round-trip test
New file: `packages/prosemirror/qti-rubric-block/src/qti-rubric-block.schema.browser.test.ts` (mirror an existing schema test). Cases:
1. Parse `<qti-rubric-block use="scoring" view="scorer"><qti-content-body><p>hi</p></qti-content-body></qti-rubric-block>` → PM JSON with the two attrs and a paragraph child containing "hi".
2. Serialize a constructed PM rubric-block node → DOM tree with the `<qti-content-body>` wrapper.
3. Round-trip identity: parse → serialize matches input.
4. Foreign-style input *without* the inner `<qti-content-body>` wrapper still parses.
5. **Rejection tests:** for each of (a) `qti-choice-interaction`, (b) `heading`, (c) `image` — attempt to place it inside a rubric-block via PM transaction; assert the transaction is invalid (PM rejects because the content expression only allows `paragraph | bulletList | orderedList`).
6. **Marks test:** a paragraph inside the rubric-block accepts bold and italic marks and serializes them as `<strong>` / `<em>` (or whatever the project's mark `toDOM` emits).

### 6b. Editor-origin round-trip test
Extend [apps/editor/src/lib/importXml.browser.test.ts](apps/editor/src/lib/importXml.browser.test.ts) (or new file): export an item containing a rubric-block via `qtiItemFromProsemirror`, re-import via `importXmlFromText` (marker-aware path), assert the resulting PM JSON contains the rubric-block with original attrs and body text.

### 6c. Foreign-import test
A fixture without `data-lab-editor-version` containing:
```xml
<qti-item-body>
  <qti-rubric-block use="instructions" view="tutor">
    <qti-content-body><p>Help the candidate…</p></qti-content-body>
  </qti-rubric-block>
  <p>Body text</p>
</qti-item-body>
```
Assert `roundtripQtiItem` is called (no marker) and the resulting PM doc has the rubric-block node, body intact.

### 6d. Composer snapshot
Re-run `pnpm vitest run packages/qti/core/src/composer -u` if any snapshots involving foreign rubric-blocks already exist (they shouldn't — current snapshots cover only the synthesized scorer/scoring case). Manually inspect the diff if any new snapshots emerge.

### 6e. Grep guards
```sh
rg -n "qti-rubric-block" packages/prosemirror/qti-rubric-block/   # new package present
rg -n "qtiRubricBlockDescriptor" packages/qti/core/                # registered
rg -n "interactionInsert.rubricBlock" apps/editor/                 # i18n + slash menu wired
rg -n "qti-catalog-info" packages/ apps/                           # expect: zero (verifies we did NOT add support)
```

### 6f. Manual smoke test
1. Start app → slash menu → "Rubric block" → inserts an empty rubric-block with `use=instructions view=author`.
2. Click the rubric-block → attribute panel shows two `<select>` dropdowns.
3. Change to `use=scoring view=scorer`, type a paragraph inside.
4. `Export qti3 item` → open the `.xml` → confirm `<qti-rubric-block use="scoring" view="scorer"><qti-content-body><p>…</p></qti-content-body></qti-rubric-block>` inside the item body, with the editor-origin marker still on `qti-item-body`.
5. `Import QTI XML` of that same file → editor restores the rubric-block losslessly (no `roundtripQtiItem` runs).
6. Attempt to drop a choice interaction inside the rubric-block via slash menu — confirm it inserts *outside* the block (PM content-model enforcement).

### 6g. Documented edge cases
Add a note (in this plan or a CHANGELOG) listing:
- v1 does NOT support the shared classes `qti-rubric-discretionary-placement` / `qti-rubric-inline`.
- v1 does NOT support `<qti-catalog-info>` inside rubric-blocks.
- v1 does NOT support `ext:*` custom `use` values.
- Foreign QTI files containing both a `view="scorer" use="scoring"` block and a single extended-text interaction will duplicate the rubric text (once on the interaction, once as a standalone block). Workaround: edit one of the two in the editor before re-exporting.

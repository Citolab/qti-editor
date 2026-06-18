# Plan: Pure-ProseMirror QTI Roundtrip Regression Story

## Goal

Two coupled outcomes:

1. **Refactor** `xmlFromNode` and `qtiFromNode` so the logic lives in a pure-ProseMirror module, and `@qti-editor/prosekit-integration` becomes a thin wrapper that only injects `ListDOMSerializer`. No duplication.
2. **Rewrite** `packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts` to a **single minimal story** that:
   - Loads `/qti/kennisnet/ITEM001.xml` via `qtiTransformItem().load(...)`
   - Converts the QTI XML → roundtrip HTML via `roundtripQtiItem` from `@citolab/prose-qti/qti3-item-import`
   - Imports the roundtrip HTML into a pure-ProseMirror `EditorView`
   - Exports the PM doc back to QTI 3 XML via the new pure-PM `qtiFromNode` and `console.log`s it

Strictly **no ProseKit imports** in the story or in the new pure-PM module.

---

## Phase 0 — Documentation Discovery (DONE)

### Allowed APIs (verified against source)

| API | Source | Signature |
|---|---|---|
| `qtiTransformItem()` | `@qti-components/transformers` | `() => { load(uri, signal?): Promise<api>; parse(xml): api; xml(): string; htmlDoc(): DocumentFragment; ... }` ([qti-transform-item.ts:45](/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-transformers/src/qti-transform-item.ts#L45)) |
| `roundtripQtiItem(xmlString)` | `@citolab/prose-qti/qti3-item-import` | `(xml: string) => string` — hoists correct-response/score onto interactions ([roundtrip-qti-item.ts:13](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/qti3-item-import/src/roundtrip-qti-item.ts#L13)) |
| `buildSingleAssessmentItemXml(ctx)` | `@qti-editor/core/composer` | `(ctx?: ComposerItemContext) => string` ([core/composer/index.ts:401](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/core/src/composer/index.ts#L401)) |
| `buildMultipleAssessmentItemsXml`, `formatXml`, `countItemFragments`, `getItemFragmentXmls` | `@qti-editor/core/composer` | as currently used by `save-qti/index.ts` |
| `DOMSerializer.fromSchema(schema)` | `prosemirror-model` (pure PM) | `.serializeFragment(content) => DocumentFragment` |
| `ListDOMSerializer.fromSchema(schema)` | `prosekit/extensions/list` | subclass of `DOMSerializer` — only used at the prosekit wrapper boundary |

### Surface area of prosekit in the two files (sole real coupling)

- [save-xml/index.ts:8](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/prosekit-integration/src/save-xml/index.ts#L8) — `ListDOMSerializer.fromSchema(...)` (the one runtime call)
- [save-xml/index.ts:10](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/prosekit-integration/src/save-xml/index.ts#L10) — `import type { ProseMirrorNode } from 'prosekit/pm/model'` (pure type alias for `prosemirror-model`'s `Node`)
- [save-qti/index.ts:22](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/prosekit-integration/src/save-qti/index.ts#L22) — same type re-export

Everything else (`htmlToXmlString`, `htmlToXmlCompatible`, `formatXml`, `DOMParser`, composer calls in `save-qti`) is plain DOM + `@qti-editor/core/composer`.

### Confirmed facts

- **Static serving**: `.storybook/main.ts` has `staticDirs: ['../public']`. ITEM001 is at [public/qti/kennisnet/ITEM001.xml](public/qti/kennisnet/ITEM001.xml). URL: `/qti/kennisnet/ITEM001.xml`.
- **`@citolab/prose-qti/qti3-item-import`** has zero prosemirror/prosekit deps.
- **`@qti-editor/core`** has no prosekit deps.

---

## Phase 1A — Extract pure-PM core (refactor, no behavior change)

### Files to add

#### `packages/qti/roundtrip-export/src/pm-xml.ts` (NEW)

Port the entire body of [save-xml/index.ts](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/prosekit-integration/src/save-xml/index.ts) verbatim, with two changes:

- `import type { ProseMirrorNode } from 'prosekit/pm/model'` → `import type { Node as ProseMirrorNode } from 'prosemirror-model'`
- Add `DOMSerializer` import from `prosemirror-model`
- Add an **optional serializer parameter** to `xmlFromNode` so the prosekit wrapper can inject `ListDOMSerializer`:

```ts
import { DOMSerializer, type Node as ProseMirrorNode } from 'prosemirror-model';

export function xmlFromNode(
  node: ProseMirrorNode,
  serializer: DOMSerializer = DOMSerializer.fromSchema(node.type.schema),
): string {
  const fragment = serializer.serializeFragment(node.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return htmlToXmlString(wrapper.innerHTML);
}

// htmlToXmlCompatible, htmlToXmlString, formatXml, cleanEmptyNamespaces, xmlToHTML — copied verbatim
export { /* same exports as before */ };
```

Keep `xmlToHTML` here too — it has no prosekit dependency and belongs with its sibling.

#### `packages/qti/roundtrip-export/src/pm-qti.ts` (NEW)

Port the entire body of [save-qti/index.ts](/Users/patrickklein/Projects/Editor/QTI-Editor/packages/qti/prosekit-integration/src/save-qti/index.ts) verbatim, with the same `ProseMirrorNode` type swap and an optional `serializer` parameter threaded through to `xmlFromNode`:

```ts
import { type Node as ProseMirrorNode, type DOMSerializer } from 'prosemirror-model';
import {
  buildMultipleAssessmentItemsXml,
  buildSingleAssessmentItemXml,
  countItemFragments,
  getItemFragmentXmls,
  formatXml,
  type ComposerItemContext,
} from '@qti-editor/core/composer';
import { xmlFromNode } from './pm-xml.js';

export type QtiComposeMode = 'single' | 'multiple';
export interface QtiComposeContext { /* unchanged */ }
export interface QtiItemFragment { /* unchanged */ }

export function qtiFromNode(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  mode: QtiComposeMode = 'multiple',
  serializer?: DOMSerializer,
): string {
  const xml = xmlFromNode(node, serializer);
  // … rest verbatim from save-qti/index.ts qtiFromNode body
}

export function countQtiItems(node: ProseMirrorNode, serializer?: DOMSerializer): number { /* … */ }
export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext, serializer?: DOMSerializer): QtiItemFragment[] { /* … */ }
```

#### `packages/qti/roundtrip-export/package.json` — export the new subpaths

```jsonc
{
  "exports": {
    ".": { "...": "..." },
    "./pm-xml": { "types": "./dist/pm-xml.d.ts", "default": "./dist/pm-xml.js" },
    "./pm-qti": { "types": "./dist/pm-qti.d.ts", "default": "./dist/pm-qti.js" }
  },
  "dependencies": {
    "@qti-editor/core": "workspace:*",
    "prosemirror-model": "^1.25.4"
  }
}
```

(`prosemirror-model` is a peer dep already used across the workspace — confirm what convention the workspace uses, dependency vs peerDependency, and match it.)

### Files to shrink

#### `packages/qti/prosekit-integration/src/save-xml/index.ts` (rewrite as thin wrapper)

```ts
import { ListDOMSerializer } from 'prosekit/extensions/list';
import type { ProseMirrorNode } from 'prosekit/pm/model';
import { xmlFromNode as xmlFromNodePure } from '@qti-editor/qti-roundtrip-export/pm-xml';

export function xmlFromNode(node: ProseMirrorNode): string {
  return xmlFromNodePure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export { xmlToHTML } from '@qti-editor/qti-roundtrip-export/pm-xml';
```

#### `packages/qti/prosekit-integration/src/save-qti/index.ts` (rewrite as thin wrapper)

```ts
import { ListDOMSerializer } from 'prosekit/extensions/list';
import type { ProseMirrorNode } from 'prosekit/pm/model';
import {
  qtiFromNode as qtiFromNodePure,
  countQtiItems as countQtiItemsPure,
  getQtiItems as getQtiItemsPure,
  type QtiComposeContext,
  type QtiComposeMode,
  type QtiItemFragment,
} from '@qti-editor/qti-roundtrip-export/pm-qti';

export type { QtiComposeContext, QtiComposeMode, QtiItemFragment };

export function qtiFromNode(node: ProseMirrorNode, ctx?: QtiComposeContext, mode: QtiComposeMode = 'multiple'): string {
  return qtiFromNodePure(node, ctx, mode, ListDOMSerializer.fromSchema(node.type.schema));
}
export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node, ListDOMSerializer.fromSchema(node.type.schema));
}
export function getQtiItems(node: ProseMirrorNode, ctx?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, ctx, ListDOMSerializer.fromSchema(node.type.schema));
}
```

Result: the prosekit-integration files drop from ~140 lines + ~100 lines to ~10 lines each. The editor app keeps its current import paths and runtime behavior (list-aware serialization) unchanged.

### Verification checklist (Phase 1A)

- [ ] `pnpm -F @qti-editor/qti-roundtrip-export typecheck && pnpm -F @qti-editor/prosekit-integration typecheck` pass.
- [ ] Editor app build/typecheck unchanged: `pnpm -F editor typecheck` (or whatever the app's package name is — locate via `apps/editor/package.json`).
- [ ] Existing roundtrip-export tests still pass: `pnpm -F @qti-editor/qti-roundtrip-export test` (`index.test.ts`, `contract.test.ts`, `non-qti-mirror-regex.snapshot.test.ts`).
- [ ] `grep -R "prosekit" packages/qti/roundtrip-export/src` returns nothing.
- [ ] The prosekit wrappers still expose the same export names — no caller in `apps/` or elsewhere needs changing. Confirm with `grep -R "from '@qti-editor/prosekit-integration" apps packages | grep -v node_modules`.

### Anti-pattern guards

- ❌ Don't introduce duplication: every byte of logic lives in `pm-xml.ts`/`pm-qti.ts`; the wrappers only inject the serializer.
- ❌ Don't change function signatures of the *wrapper* exports (the editor app calls them today; behavior must be byte-identical).
- ❌ Don't move `xmlToHTML` — it has zero prosekit dep but is widely imported; keep it re-exported from both paths during the refactor so callers don't churn.

---

## Phase 1B — Write the regression story

### File to rewrite

`packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts` — replace both existing stories with one `RoundtripItem001`.

```ts
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { Schema, DOMParser } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes, marks } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';

import { qtiTransformItem } from '@qti-components/transformers';
import { roundtripQtiItem } from '@citolab/prose-qti/qti3-item-import';
import { qtiFromNode } from '@qti-editor/qti-roundtrip-export/pm-qti';

import { blockSelectPlugin } from '../../extensions/src/block-select/block-select-plugin';
import { choiceInteractionDescriptor } from './descriptor';

import './components/qti-choice-interaction/qti-choice-interaction';
import '../../interaction-shared/src/components/qti-prompt/qti-prompt';
import '../../interaction-shared/src/components/qti-simple-choice/qti-simple-choice';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  choiceInteractionDescriptor.nodeSpecs.map(({ name, spec }) => [name, spec])
);
const schema = new Schema({ nodes: { ...nodes, ...qtiNodes }, marks });

const plugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap({ Enter: choiceInteractionDescriptor.enterCommand }),
  keymap(baseKeymap),
  ...choiceInteractionDescriptor.pluginFactories.map(f => f()),
  blockSelectPlugin,
];

const meta: Meta = { title: 'QTI ProseMirror/Roundtrip Regression', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

export const RoundtripItem001: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const init = async (container: HTMLElement) => {
      // 1. Load QTI XML from /public
      const loaded = await qtiTransformItem().load('/qti/kennisnet/ITEM001.xml');
      const sourceXml = loaded.xml();

      // 2. QTI → roundtrip HTML (attributes hoisted onto interactions)
      const roundtripXml = roundtripQtiItem(sourceXml);

      // 3. Pull item-body content out and parse into PM doc
      const itemDoc = new window.DOMParser().parseFromString(roundtripXml, 'application/xml');
      const body = itemDoc.querySelector('qti-item-body');
      const tempEl = document.createElement('div');
      tempEl.innerHTML = body ? body.innerHTML : roundtripXml;
      const pmDoc = DOMParser.fromSchema(schema).parse(tempEl);

      if (currentView) currentView.destroy();
      currentView = new EditorView(container, {
        state: EditorState.create({ doc: pmDoc, schema, plugins }),
        dispatchTransaction(tr) {
          if (!currentView) return;
          currentView.updateState(currentView.state.apply(tr));
        },
      });

      logExport();
    };

    const logExport = () => {
      if (!currentView) return;
      // 4. PM doc → QTI XML via the pure-PM exporter
      const xml = qtiFromNode(
        currentView.state.doc,
        { identifier: 'ITEM001', title: 'ITEM001 roundtrip' },
        'single',
      );
      // eslint-disable-next-line no-console
      console.log('[Roundtrip Export]\n' + xml);
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; font-family: system-ui;">
        <h3>QTI Roundtrip: load → import → edit → export</h3>
        <button @click=${() => logExport()}>Export current PM doc → console</button>
        <div class="editor-container" ${ref(el => { if (el) init(el as HTMLElement); })}></div>
        <p style="color:#666;font-size:0.9rem">
          Loads <code>/qti/kennisnet/ITEM001.xml</code>, runs <code>roundtripQtiItem</code>,
          imports into ProseMirror, and exports back to QTI XML. See console.
        </p>
      </div>
    `;
  },
};
```

### `packages/prosemirror/interaction-choice/package.json` (devDependencies)

Add (story-only, devDeps):

```jsonc
{
  "devDependencies": {
    "@qti-components/transformers": "<match version used elsewhere — check root pnpm-lock>",
    "@citolab/prose-qti/qti3-item-import": "workspace:*",
    "@qti-editor/qti-roundtrip-export": "workspace:*"
  }
}
```

### Verification checklist (Phase 1B)

- [ ] `pnpm -F @qti-editor/interaction-choice typecheck` passes.
- [ ] `pnpm storybook` (locate root script) → open `QTI ProseMirror / Roundtrip Regression / RoundtripItem001`.
- [ ] Editor renders ITEM001's prompt + 4 simple choices.
- [ ] On load AND on button click, DevTools console shows `[Roundtrip Export]` followed by a valid `<qti-assessment-item identifier="ITEM001" ...>` XML containing `<qti-choice-interaction>` with 4 `<qti-simple-choice>` and `correct-response="choice3"`.
- [ ] `grep "prosekit" packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts` returns nothing.
- [ ] Edit the prompt in the editor → click the button → exported XML reflects the edit.

### Anti-pattern guards

- ❌ Don't import from `@qti-editor/prosekit-integration` in the story (would re-introduce the prosekit dep transitively at build time).
- ❌ Don't import from `prosekit/*` in the story.
- ❌ Don't reach into `roundtrip-export/src/...` directly — go through the published subpath exports `./pm-xml` / `./pm-qti`.
- ❌ Don't build response declarations by hand — `buildSingleAssessmentItemXml` (called inside `qtiFromNode`) derives them from `correct-response`/`score` attributes that `roundtripQtiItem` hoisted onto `<qti-choice-interaction>`.

---

## Phase 2 — Verify end-to-end

1. `pnpm -F @qti-editor/qti-roundtrip-export typecheck && pnpm -F @qti-editor/prosekit-integration typecheck && pnpm -F @qti-editor/interaction-choice typecheck`
2. Run all existing tests for `roundtrip-export` and the editor app — confirm no regression.
3. `pnpm storybook` → open `RoundtripItem001` → DevTools console.
4. Confirm: (a) editor shows 4 choices + prompt, (b) console XML has the same 4 `identifier`s as the source ITEM001, (c) the choice interaction in the export has `correct-response="choice3"`.
5. Type into the prompt → click "Export" → verify the edit is reflected in the exported XML.

---

## What stays intact

- `descriptor.ts`, `commands/*`, `components/*`, schema specs in `interaction-choice` — **untouched**.
- `@citolab/prose-qti/qti3-item-import` — **untouched**.
- `@qti-editor/core/composer` — **untouched**.
- Public API of `@qti-editor/prosekit-integration` — same export names, same signatures, same runtime behavior. The editor app needs **zero changes**.

## What changes

- `roundtrip-export` gains two new pure-PM modules (`pm-xml.ts`, `pm-qti.ts`) and exports them as subpaths.
- `prosekit-integration/save-xml` and `/save-qti` shrink to ~10-line wrappers that inject `ListDOMSerializer`.
- The regression story is rewritten (one `RoundtripItem001` story).
- `interaction-choice/package.json` gains 3 dev-only deps.

## Why this is better than the original plan

- **One source of truth** for the export pipeline — no inline serializer copy in the story, no duplicated `htmlToXmlString` logic.
- **Story is import-only** — every line of logic is reusable code, not test scaffolding.
- **List-aware behavior preserved** for the editor app via the prosekit wrapper, automatically.
- **Reversible**: if the split causes any surprise, revert the two wrapper files and delete the new modules; story can fall back to importing the prosekit-integration version.

---

## Open questions (none blocking)

- Story title — `QTI ProseMirror/Roundtrip Regression` is the current draft; rename if a convention exists.
- Should `xmlToHTML` (the inverse direction) also get a subpath export, or keep it only on `./pm-xml` and re-export from the wrapper for legacy callers? Current plan: keep on both.
- `prosemirror-model` placement — dependency vs peerDependency in `roundtrip-export/package.json`. Match whatever convention `packages/prosemirror/*` uses.

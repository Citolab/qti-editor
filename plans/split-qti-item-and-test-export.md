# Plan: Split `qtiFromNode` into two packages — `qti-item-export` and `qti-test-export`

## Why

Today, a single function `qtiFromNode(node, context, mode)` exports both items and tests depending on a `'single' | 'multiple'` mode argument. This conflates two distinct artifacts:

- An **item** is a self-contained QTI assessment item.
- A **test** is a container that holds N items.

The mode-arg API is ugly at call sites (`qtiFromNode(doc, ctx, 'single')`) and the conceptual mixing leaks: a consumer that only authors items still pulls in test-composition code, and the dependency direction (test depends on item) is invisible.

This refactor splits the export surface into two dedicated packages with a clean dependency edge (test → item), mirrored by two new entry points in the prosekit-integration wrapper.

**Breaking change.** No deprecated shim is kept. All 5 call sites are migrated in this plan.

## Scope guardrails

- This refactor only restructures the **export** side (ProseMirror → QTI XML). Import, ingest, response processing, and schemas are untouched.
- The pure packages must NOT depend on prosekit. The `serializer` param exists exactly so the prosekit wrapper can inject `ListDOMSerializer` from outside. Do not inline that serializer into the pure layer.
- `xmlFromNode` / `pm-xml.ts` are shared low-level utilities and stay in their current location (`qti-roundtrip-export` or a shared spot — see Phase 1).
- Do not modify `countItemFragments` / `getItemFragmentXmls` / `buildSingleAssessmentItemXml` / `buildMultipleAssessmentItemsXml` in `@qti-editor/core/composer`. Those are the building blocks the new packages call into.

---

## Phase 0 — Facts established (do not re-discover)

### Current source of truth

- **Pure impl** (with mode branching): [packages/qti/roundtrip-export/src/pm-qti.ts:39-60](packages/qti/roundtrip-export/src/pm-qti.ts#L39-L60)
- **Mode type**: `QtiComposeMode = 'single' | 'multiple'` at [pm-qti.ts:23](packages/qti/roundtrip-export/src/pm-qti.ts#L23)
- **Context type**: `QtiComposeContext` at [pm-qti.ts:25-30](packages/qti/roundtrip-export/src/pm-qti.ts#L25-L30)
- **Fragment type**: `QtiItemFragment` at [pm-qti.ts:32-37](packages/qti/roundtrip-export/src/pm-qti.ts#L32-L37)
- **Shared helper block** (lines 45–53): `xmlFromNode → DOMParser → ComposerItemContext` — needed by both new packages, lives in item package.
- **Sibling utilities** in the same file:
  - `countQtiItems(node, serializer?)` at [pm-qti.ts:62-66](packages/qti/roundtrip-export/src/pm-qti.ts#L62-L66) — scans for item fragments in a *test-shaped* doc. **Belongs in test package.**
  - `getQtiItems(node, context, serializer?)` at [pm-qti.ts:68-87](packages/qti/roundtrip-export/src/pm-qti.ts#L68-L87) — extracts item fragments from a *test-shaped* doc. **Belongs in test package.**
- **Prosekit wrapper**: [packages/qti/prosekit-integration/src/save-qti/index.ts](packages/qti/prosekit-integration/src/save-qti/index.ts)
- **Barrel export**: [packages/qti/prosekit-integration/src/index.ts:24](packages/qti/prosekit-integration/src/index.ts#L24)

### Call sites (5 total — all in QTI-Editor, none in QTI-Components/QTI-Convert)

| Call site | Current call | Target |
|---|---|---|
| [packages/ui/src/components/composer/composer.ts:194](packages/ui/src/components/composer/composer.ts#L194) | `qtiFromNode(doc, context, 'single')` | `qtiItemFromProsemirror(doc, context)` |
| [packages/ui/src/components/composer/composer.ts:184-185](packages/ui/src/components/composer/composer.ts#L184-L185) | `countQtiItems(doc)`, `getQtiItems(doc, context)` | unchanged names, new import path |
| [packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts:107-111](packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts#L107-L111) | `qtiFromNode(..., 'single')` | `qtiItemFromProsemirror(...)` |
| [apps/site/src/editor/qti-editor-app.ts:158](apps/site/src/editor/qti-editor-app.ts#L158) | `qtiFromNode(doc, { identifier, lang, title })` (defaults to test) | `qtiTestFromProsemirror(...)` |
| [apps/qti-minimal/src/qti-minimal-app.ts:50](apps/qti-minimal/src/qti-minimal-app.ts#L50) | `qtiFromNode(doc, { identifier, title })` | `qtiTestFromProsemirror(...)` |
| [apps/editor/src/lib/exportXml.ts:24](apps/editor/src/lib/exportXml.ts#L24) | `qtiFromNode(node, { identifier, lang, title, items })` | `qtiTestFromProsemirror(...)` |

### Final target shape

```
@qti-editor/qti-item-export             (NEW)
  exports:
    qtiItemFromProsemirror(node, context?, serializer?): string
    buildItemBodyContext(node, context?, serializer?): ComposerItemContext  // shared helper
    type QtiComposeContext

@qti-editor/qti-test-export             (NEW, depends on qti-item-export)
  exports:
    qtiTestFromProsemirror(node, context?, serializer?): string
    countQtiItems(node, serializer?): number
    getQtiItems(node, context?, serializer?): QtiItemFragment[]
    type QtiItemFragment

@qti-editor/qti-roundtrip-export        (DELETE)
  All consumers migrated; no aggregator kept.

@qti-editor/prosekit-integration        (existing, updated)
  ./save-qti-item   (NEW) — wraps qti-item-export, injects ListDOMSerializer
  ./save-qti-test   (NEW) — wraps qti-test-export, injects ListDOMSerializer
  ./save-qti        (DELETE)
```

### What about `pm-xml.ts`?

Currently at [packages/qti/roundtrip-export/src/pm-xml.ts](packages/qti/roundtrip-export/src/pm-xml.ts) and re-exported via the `./pm-xml` package entry. Three options for where it lives after `qti-roundtrip-export` is deleted:

- **Option A (recommended):** Move into `qti-item-export` as an internal module + public `./pm-xml` entry. The item package is the bottom of the dependency chain; test-export imports from it transitively. Justifies "item-export owns the prosemirror-to-XML bridge."
- Option B: Move into `@qti-editor/core` (it's framework-neutral XML emission).
- Option C: New micro-package `@qti-editor/pm-xml`.

**Decide in Phase 1.** Default to Option A unless a reason emerges.

---

## Phase 1 — Create `@qti-editor/qti-item-export`

### Files to create

```
packages/qti/item-export/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── pm-qti-item.ts        # qtiItemFromProsemirror + buildItemBodyContext + QtiComposeContext
    └── pm-xml.ts             # moved from qti-roundtrip-export (Option A)
```

### `package.json`

Copy the shape of [packages/qti/roundtrip-export/package.json](packages/qti/roundtrip-export/package.json). Changes:

- `"name": "@qti-editor/qti-item-export"`
- `"version": "0.1.0"`
- `"description": "ProseMirror → QTI 3.0 single assessment item export."`
- `exports` map:
  - `"."` → `dist/index.{d.ts,js}`
  - `"./pm-qti-item"` → `dist/pm-qti-item.{d.ts,js}`
  - `"./pm-xml"` → `dist/pm-xml.{d.ts,js}`
- `dependencies`: `@qti-editor/core` (workspace), `prosemirror-model` (^1.25.4). **Do NOT include prosekit.** Drop `@qti-editor/qti-roundtrip-import` and `jszip` unless `pm-xml.ts` actually uses them (it doesn't — verify by reading the file).

### `tsconfig.json`

Copy from `qti-roundtrip-export`.

### `src/pm-qti-item.ts`

```ts
import {
  buildSingleAssessmentItemXml,
  formatXml,
  type ComposerItemContext,
} from '@qti-editor/core/composer';

import { xmlFromNode } from './pm-xml.js';

import type { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

export interface QtiComposeContext {
  identifier?: string;
  lang?: string;
  title?: string;
  items?: Array<{ identifier?: string; title?: string }>;
}

/**
 * Internal — shared between item and test export.
 * Parses the PM node to an itemBody XML document and assembles ComposerItemContext.
 * Exported so @qti-editor/qti-test-export can reuse it.
 */
export function buildItemBodyContext(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): ComposerItemContext {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  return {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    items: context?.items,
    itemBody,
  };
}

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): string {
  return formatXml(buildSingleAssessmentItemXml(buildItemBodyContext(node, context, serializer)));
}
```

### `src/pm-xml.ts`

Move file verbatim from [packages/qti/roundtrip-export/src/pm-xml.ts](packages/qti/roundtrip-export/src/pm-xml.ts). Re-read its imports to confirm no `jszip` / `qti-roundtrip-import` dependency. If clean, copy as-is.

### `src/index.ts`

```ts
export { qtiItemFromProsemirror, buildItemBodyContext, type QtiComposeContext } from './pm-qti-item.js';
export { xmlFromNode } from './pm-xml.js';
```

### Workspace registration

- Confirm `packages/qti/item-export` is picked up by the root `pnpm-workspace.yaml` glob (likely already covered by `packages/qti/*`).
- Run `pnpm install` after the package.json is written.

### Phase 1 verification

- [ ] `pnpm --filter @qti-editor/qti-item-export typecheck` passes.
- [ ] `pnpm --filter @qti-editor/qti-item-export build` produces `dist/`.
- [ ] `grep -rn "prosekit" packages/qti/item-export/src` → 0 hits (pure package, no prosekit).

---

## Phase 2 — Create `@qti-editor/qti-test-export`

### Files to create

```
packages/qti/test-export/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── pm-qti-test.ts        # qtiTestFromProsemirror + countQtiItems + getQtiItems + QtiItemFragment
```

### `package.json`

Same shape as item-export. Changes:

- `"name": "@qti-editor/qti-test-export"`
- `"description": "ProseMirror → QTI 3.0 assessment test export (multiple items)."`
- `exports` map:
  - `"."` → `dist/index.{d.ts,js}`
  - `"./pm-qti-test"` → `dist/pm-qti-test.{d.ts,js}`
- `dependencies`: `@qti-editor/core` (workspace), `@qti-editor/qti-item-export` (workspace), `prosemirror-model` (^1.25.4).

### `src/pm-qti-test.ts`

```ts
import {
  buildMultipleAssessmentItemsXml,
  countItemFragments,
  getItemFragmentXmls,
  formatXml,
} from '@qti-editor/core/composer';

import {
  buildItemBodyContext,
  type QtiComposeContext,
} from '@qti-editor/qti-item-export/pm-qti-item';

import { xmlFromNode } from '@qti-editor/qti-item-export/pm-xml';

import { DOMParser } from 'prosemirror-model'; // only if needed — likely not, see below

import type { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

export interface QtiItemFragment {
  identifier: string;
  title: string;
  xml: string;
  formattedXml: string;
}

export function qtiTestFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): string {
  return formatXml(buildMultipleAssessmentItemsXml(buildItemBodyContext(node, context, serializer)));
}

export function countQtiItems(node: ProseMirrorNode, serializer?: DOMSerializer): number {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new globalThis.DOMParser().parseFromString(xml, 'application/xml');
  return countItemFragments({ itemBody });
}

export function getQtiItems(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): QtiItemFragment[] {
  const composerContext = buildItemBodyContext(node, context, serializer);
  return getItemFragmentXmls(composerContext).map(fragment => ({
    ...fragment,
    formattedXml: formatXml(fragment.xml),
  }));
}
```

Note: the original `countQtiItems` calls `new DOMParser()` from `globalThis` (the browser global), not from `prosemirror-model`. Keep that behavior — match the original.

### `src/index.ts`

```ts
export {
  qtiTestFromProsemirror,
  countQtiItems,
  getQtiItems,
  type QtiItemFragment,
} from './pm-qti-test.js';

// Re-export from item-export for convenience so consumers of the test package
// don't need to take a second dependency just for the context type.
export { type QtiComposeContext } from '@qti-editor/qti-item-export';
```

### Phase 2 verification

- [ ] `pnpm --filter @qti-editor/qti-test-export typecheck` passes.
- [ ] `pnpm --filter @qti-editor/qti-test-export build` produces `dist/`.
- [ ] `grep -rn "prosekit" packages/qti/test-export/src` → 0 hits.
- [ ] `grep -n "QtiComposeMode\|qtiFromNode" packages/qti/test-export/src` → 0 hits (no leftovers).

---

## Phase 3 — Update `@qti-editor/prosekit-integration`

### Files to create

```
packages/qti/prosekit-integration/src/
├── save-qti-item/
│   └── index.ts
└── save-qti-test/
    └── index.ts
```

### `save-qti-item/index.ts`

```ts
/**
 * Save QTI item — prosekit wrapper.
 * Injects ListDOMSerializer for list-aware serialization.
 */
import { ListDOMSerializer } from 'prosekit/extensions/list';
import {
  qtiItemFromProsemirror as qtiItemFromProsemirrorPure,
  type QtiComposeContext,
} from '@qti-editor/qti-item-export/pm-qti-item';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext };

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiItemFromProsemirrorPure(
    node,
    context,
    ListDOMSerializer.fromSchema(node.type.schema),
  );
}
```

### `save-qti-test/index.ts`

```ts
/**
 * Save QTI test — prosekit wrapper.
 * Injects ListDOMSerializer for list-aware serialization.
 */
import { ListDOMSerializer } from 'prosekit/extensions/list';
import {
  qtiTestFromProsemirror as qtiTestFromProsemirrorPure,
  countQtiItems as countQtiItemsPure,
  getQtiItems as getQtiItemsPure,
  type QtiComposeContext,
  type QtiItemFragment,
} from '@qti-editor/qti-test-export/pm-qti-test';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext, QtiItemFragment };

export function qtiTestFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiTestFromProsemirrorPure(
    node,
    context,
    ListDOMSerializer.fromSchema(node.type.schema),
  );
}

export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, context, ListDOMSerializer.fromSchema(node.type.schema));
}
```

### `package.json` edits

[packages/qti/prosekit-integration/package.json](packages/qti/prosekit-integration/package.json):

- In `exports`:
  - **Remove** `"./save-qti": "./src/save-qti/index.ts"`.
  - **Add** `"./save-qti-item": "./src/save-qti-item/index.ts"`.
  - **Add** `"./save-qti-test": "./src/save-qti-test/index.ts"`.
- In `dependencies`:
  - **Remove** `"@qti-editor/qti-roundtrip-export": "workspace:*"`.
  - **Add** `"@qti-editor/qti-item-export": "workspace:*"`.
  - **Add** `"@qti-editor/qti-test-export": "workspace:*"`.

### Barrel update

[packages/qti/prosekit-integration/src/index.ts:24](packages/qti/prosekit-integration/src/index.ts#L24):

Replace the single `qtiFromNode` re-export line with:

```ts
export {
  qtiItemFromProsemirror,
  type QtiComposeContext,
} from './save-qti-item/index.js';

export {
  qtiTestFromProsemirror,
  countQtiItems,
  getQtiItems,
  type QtiItemFragment,
} from './save-qti-test/index.js';
```

### Delete the old wrapper

- Delete the file [packages/qti/prosekit-integration/src/save-qti/index.ts](packages/qti/prosekit-integration/src/save-qti/index.ts).
- Delete the now-empty `packages/qti/prosekit-integration/src/save-qti/` directory.

### Phase 3 verification

- [ ] `pnpm install` (to wire the new workspace deps).
- [ ] `pnpm --filter @qti-editor/prosekit-integration typecheck` passes.
- [ ] `grep -rn "qtiFromNode\|QtiComposeMode\|save-qti'" packages/qti/prosekit-integration` → 0 hits.

---

## Phase 4 — Migrate the 5 call sites

For each site, change the import path AND the call expression per the table in Phase 0.

### 4.1 — `packages/ui/src/components/composer/composer.ts`

Current import at line 6:
```ts
import { qtiFromNode, countQtiItems, getQtiItems, type QtiItemFragment, type QtiComposeMode } from '@qti-editor/prosekit-integration/save-qti';
```

Replace with:
```ts
import { qtiItemFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-item';
import { countQtiItems, getQtiItems, type QtiItemFragment } from '@qti-editor/prosekit-integration/save-qti-test';
```

At line 194 replace `qtiFromNode(doc, context, 'single')` → `qtiItemFromProsemirror(doc, context)`.

Lines 184–185 (`countQtiItems`, `getQtiItems`) keep their call sites; only the import path changed.

`QtiComposeMode` import was unused or only used as a type annotation — search the file and remove any remaining references. If a local variable was typed `QtiComposeMode`, change to a literal string union or remove the annotation (it's no longer meaningful).

### 4.2 — `packages/prosemirror/interaction-choice/src/qti-choice-interaction.regression.stories.ts`

Replace the import of `qtiFromNode` (find with grep) with:
```ts
import { qtiItemFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-item';
```

At lines 107–111:
```ts
const xml = qtiItemFromProsemirror(
  currentView.state.doc,
  { identifier: 'ITEM001', title: 'ITEM001 roundtrip' },
);
```

### 4.3 — `apps/site/src/editor/qti-editor-app.ts`

Replace `qtiFromNode` import with:
```ts
import { qtiTestFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-test';
```

At line 158: `qtiFromNode(...)` → `qtiTestFromProsemirror(...)`.

### 4.4 — `apps/qti-minimal/src/qti-minimal-app.ts`

Same shape as 4.3 — import `qtiTestFromProsemirror`, rename call at line 50.

### 4.5 — `apps/editor/src/lib/exportXml.ts`

Same shape — import `qtiTestFromProsemirror`, rename call at line 24.

### Phase 4 verification

- [ ] `grep -rn "qtiFromNode\|QtiComposeMode\|@qti-editor/prosekit-integration/save-qti'" apps packages` → 0 hits.
- [ ] `pnpm -r typecheck` clean.

---

## Phase 5 — Delete `@qti-editor/qti-roundtrip-export`

Once Phases 1–4 are merged and all consumers point at the new packages:

- [ ] `grep -rn "@qti-editor/qti-roundtrip-export" .` across the monorepo → 0 hits (except in the package being deleted).
- [ ] Delete the directory `packages/qti/roundtrip-export/` entirely.
- [ ] Search root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json` for any path mapping / project reference to `qti-roundtrip-export` and remove.
- [ ] Run `pnpm install` to refresh the lockfile.

### Phase 5 verification

- [ ] `grep -rn "qti-roundtrip-export\|qtiFromNode\|QtiComposeMode" .` → 0 hits.
- [ ] `pnpm -r typecheck` clean.
- [ ] `pnpm -r build` clean.

---

## Phase 6 — End-to-end verification

1. **Choice interaction regression story** — run the story and confirm item XML is emitted identically to before the refactor. Diff against a saved golden if available.
2. **Test export smoke test** — open `apps/qti-minimal` or `apps/site`, author a multi-item doc, export, and confirm the generated test XML opens correctly.
3. **Composer item count** — in `packages/ui` composer, confirm `#itemCount` updates correctly as items are added/removed (validates `countQtiItems` path through the new package).
4. **Build all** — `pnpm -r build` passes.
5. **Type-check all** — `pnpm -r typecheck` passes.

---

## Anti-pattern guards (each addresses a specific likely failure)

1. **Do not** keep `qtiFromNode` or `QtiComposeMode` anywhere as a deprecated shim. The ugly mode-arg API must be fully removed. (Reason: a shim preserves the exact ergonomics this refactor is meant to eliminate.)

2. **Do not** add `prosekit` to the dependencies of `qti-item-export` or `qti-test-export`. The two-layer design (pure + prosekit wrapper) only works if the pure packages stay prosekit-free. The `serializer` param is the seam — keep it. (Reason: collapsing the layers makes the pure packages unusable from non-prosekit consumers and silently couples the dependency graph.)

3. **Do not** duplicate `buildItemBodyContext` into the test package. The item package exports it; the test package imports it from `@qti-editor/qti-item-export/pm-qti-item`. (Reason: drift between two copies of itemBody parsing would silently desync single-item and multi-item exports.)

4. **Do not** keep `@qti-editor/qti-roundtrip-export` as a one-release re-export aggregator. User confirmed a hard break is fine. (Reason: aggregators delay the actual migration indefinitely and create a second source of truth for export naming.)

5. **Do not** change anything in `@qti-editor/core/composer` (`buildSingleAssessmentItemXml`, `buildMultipleAssessmentItemsXml`, `countItemFragments`, `getItemFragmentXmls`). They are the stable building blocks. (Reason: behavior parity with the pre-refactor exporter depends on those primitives being unchanged.)

6. **Do not** invent a new mode for `qtiItemFromProsemirror` that calls `buildMultipleAssessmentItemsXml`, or vice versa. Each new exporter calls exactly one builder. (Reason: re-introducing branching defeats the split.)

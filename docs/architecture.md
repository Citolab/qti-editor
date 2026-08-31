# QTI Editor Architecture

## Purpose

This document is the canonical architecture reference for this repository.

Its job is to keep the package structure stable as the codebase grows, especially when new code is scaffolded with AI. Before adding files, use this document to decide:

- whether the code belongs in `apps/*`
- whether it belongs in a reusable package
- which package layer owns it

If a generated change cannot be placed clearly using this document, stop and resolve the ownership question before writing more code.

## Core Rule

`apps/*` are examples, demos, the docs site and cross-package tests. **The main editor application
is no longer here** — it was extracted to its own repository (`qti-editor-full-assessment`) and
consumes these packages from npm. This repository is packages-first.

They are not the source of truth for reusable behavior, domain logic, editor primitives, or QTI composition logic.

When in doubt, prefer putting reusable logic in a package and letting the app consume it.

## Current Package Structure

```text
packages/
  prose-qti/           ← @citolab/prose-qti   (QTI core + interactions + integration)
  prose-qti-node/      ← @citolab/prose-qti-node  (Node-only re-bundle of prose-qti's conversion API)
  prose-extensions/    ← @citolab/prose-extensions  (generic ProseMirror/ProseKit extensions)
  prose-ai/            ← @citolab/prose-ai  (private, AI extensions vendored from @prosekit/ai)

apps/
  qti-prosemirror-item/ ← @qti-editor/prosemirror-item  (raw ProseMirror example)
  site/                ← @qti-editor/site  (Astro documentation site)
  e2e/                 (end-to-end tests)
```

## Layer Ownership

### `packages/prose-qti` (`@citolab/prose-qti`)

The main QTI package. Contains all QTI-specific logic and the integration layer for ProseKit.

`src/interfaces/` owns:
- Shared TypeScript contracts with no runtime dependencies
- `InteractionDescriptor` — the registration unit every interaction implements
- `InteractionNodeSpecEntry` — node spec entries within a descriptor
- `NodeAttributePanelMetadata`, `AttributeFieldDefinition`, `AttributeFieldOption`, `AttributeFriendlyEditorDefinition` — unified attribute panel types
- Composer types: `InteractionComposerMetadata`, `InteractionComposerHandler`, `InteractionComposeResult`, `ResponseProcessingKind`, `ComposerWarning`

`src/components/*` owns (one directory per interaction type):
- ProseMirror node specs, insert commands, enter commands
- Node views and authoring behavior
- Per-interaction QTI compose handler and metadata
- Per-interaction attribute panel metadata
- A `descriptor.ts` exporting a single object that `satisfies InteractionDescriptor`

Interaction components: `choice`, `extended-text`, `gap-match`, `hottext`, `inline-choice`, `match`, `order`, `rubric-block`, `select-point`, `text-entry`, plus `shared/` for cross-interaction schemas and helpers.

`src/components/shared/context/correction-context.ts` publishes a per-interaction `@lit/context` (`correctionContext`) carrying the answer key (`CorrectionLink[]`) plus derived role/label/limit/pending lookups. The drag-drop interactions (gap-match, match, order) provide it on their host element and their children subscribe to paint their own `:state(selected)`/`:state(linked)`/`:state(pending)` and labels, instead of the interaction sweeping and repainting its children on every change. `src/components/shared/extensions/chip-menu.ts` and `selection-menu.ts` are the ProseKit plugins built on top of it: clicking a placed chip opens a small popover (labelled via i18n, not an icon) that re-dispatches `dummy-drag-remove`, and a plugin instance is safe to contribute once per interaction descriptor because activation events are deduped.

`src/core/` owns:
- Descriptor registry: `listInteractionDescriptors()` — canonical list of all registered interactions
- Derived lookup helpers: `listInteractionSchemaNodeSpecs`, `listSelectedInteractionPluginFactories`, etc.
- XML composition engine, response declarations, identifier normalization
- Composer orchestration that drives per-interaction compose handlers via descriptors

`src/integration/` owns. `prosekit` is an optional peer dependency of this package, and `src/integration/index.ts` is reachable from the package root, so the barrel re-exports only the prosekit-free surfaces; the prosekit-dependent surfaces (`events`, `code`, `interactions/prosekit`) are published as their own subpaths and must be imported directly:
- `events` (subpath only, not re-exported from `./integration`) — `qtiEditorEventsExtension`, `onQtiContentChange`, `onQtiSelectionChange`
- `code` (subpath only, not re-exported from `./integration`) — `qtiCodePanelExtension`
- `item-context` (re-exported from `./integration`) — `itemContext`, `ItemContext`, `itemContextVariables`
- `save-xml` (re-exported from `./integration`) — `xmlFromNode`, `xmlToHTML`
- `save-qti-item` (re-exported from `./integration`) — `qtiItemFromProsemirror`
- `interactions/prosekit` (subpath only, not re-exported from `./integration`) — `defineQtiInteractionsExtension`, `defineQtiExtension`, `registerQtiInteractionElements` (deprecated no-op kept for backwards compatibility)
- Shared document types: `QtiDocumentJson`, `QtiNodeJson` (re-exported from `./integration`)

`src/item-export/`, `src/item-roundtrip/`, `src/qti3-item-import/` own QTI serialization and import transforms. `editorContext`/`qtiEditorContext` and multi-item/package-building support were moved out of this package and now live in the consuming application — this package's export surface is single-item only.

`src/core-css/core-css.css` — the mandatory stylesheet for rendering the editor's PM document, published as the `./core-css.css` subpath (`@citolab/prose-qti/core-css.css`). It is a compatibility entry point that `@import`s two split source files kept separate for review: `core-layout.css` (mandatory structural fixes — interaction backgrounds/spacing, the rubric-block boundary, the ProseKit placeholder fix) and `editor-states.css` (editor-only `:state(...)` hooks for gaps, choices and the order interaction — `pending`, `selected` and `linked` are the states this package owns, since they are affordances the runtime has no reason to know about; `drag`, `checked` and `disabled` stay qti-theme's. Only `pending` currently paints anything; `selected` and `linked` are documented but deliberately left unpainted until a rule for them is reviewed). Every app that renders the editor must import `core-css.css` alongside `@qti-components/theme`; nothing outside this package imports the two source files directly.

`src/qti-prose.css` — bundles `@qti-components/theme/item.css` then `core-css.css`, in that order, published as the `./qti-prose.css` subpath (`@citolab/prose-qti/qti-prose.css`). The order is load-bearing: a CSS cascade layer's position is fixed by its first mention, and `item.css` is what declares the whole layer order, so it must load first or `core-css.css` creates its override layer too early and silently loses the cascade. `@qti-components/theme` is a dependency of this package (via the catalog) specifically so this bundle resolves without the consumer declaring it. A host that only wants one stylesheet import (and never wants to know which `qti-components` build the editor is pinned to) imports this instead of the two files separately; a brand overlay still goes after it. Apps in this repo keep importing `@qti-components/theme` and `core-css.css` directly, since they already sit next to the catalog.

`src/transformers.ts` — re-exports all of `@qti-components/transformers` (`qtiTransformItem`, `qtiTransformTest`, …) under the `./transformers` subpath (`@citolab/prose-qti/transformers`), so a consuming host names only `@citolab/prose-qti` and never pins `@qti-components/transformers` itself.

`src/schema/` owns shared ProseMirror base-schema primitives for QTI hosts:
- `qtiBasicNodes` / `qtiBasicMarks` (`@citolab/prose-qti/schema`) are the canonical QTI-focused replacement for direct `prosemirror-schema-basic` usage in this repo.
- The `image` node in this module preserves `width` and `height` attributes on parse/serialize so QTI XML image dimensions survive import and roundtrip.
- Nothing is removed from the basic set. A `createQtiBasicNodes(...)` helper used to offer trimming and defaulted to dropping `blockquote`; it had no callers and its premise was wrong — QTI permits `blockquote`, `hr`, `pre` and `code` in an item body. A host wanting a narrower document builds its own `nodes` object.
- `qtiLayoutDivNodeSpec` (included in `qtiBasicNodes.qtiLayoutDiv`) models the author-written `<div class="qti-layout-row">`/`-colN` grid wrappers; `qtiLayoutDivLockPlugin` is the accompanying opt-in plugin that stops a transaction from adding or removing a wrapper, since nothing in either host editor can author a new one. Both used to live duplicated across the two host apps and moved here for the same reason `qtiBasicNodes` did — one definition instead of two that drift.

### `packages/prose-qti-node` (`@citolab/prose-qti-node`)

Published package. Re-bundles `prose-qti`'s six Node conversion functions (`qti3ToPm`, `pmToQti3`, `htmlToPm`, `pmToHtml`, `validateHtml`, `schemaToJson`) and `createQtiSchema` for plain Node, with a manifest sized for that: `linkedom` plus three `prosemirror-*` packages as dependencies, `prosemirror-model`/`prosemirror-state`/`prosemirror-commands` as peers, and no `@qti-components/*` or `lit`. See [node-api.md](node-api.md).

Built by `scripts/bundle-node.mjs`, which esbuild-bundles `prose-qti`'s `dist/node/index.js` (not `src/`, since Lit's decorators do not survive a generic transpiler) with the ProseMirror packages kept external. Its `workspace:*` devDependency on `@citolab/prose-qti` is what orders `pnpm -r --sort` so that dist exists first.

Does not own conversion logic — that stays in `packages/prose-qti/src/node/`. This package only owns the bundling and the manifest split that keeps a Node-only consumer from installing the browser component graph.

### `packages/prose-extensions` (`@citolab/prose-extensions`)

Generic ProseMirror and ProseKit extensions with no QTI-specific logic. `prosekit` is an optional peer dependency (`peerDependenciesMeta.prosekit.optional: true`) — feature subpaths (e.g. `./block-select`, `./node-attrs-sync`) export only plain ProseMirror plugins and never import `prosekit`, so raw-ProseMirror consumers don't need it installed.

Owns:
- `src/prosemirror/block-select` — block selection plugin
- `src/prosemirror/node-attrs-sync` — node attribute synchronization
- `src/prosemirror/paste-semantic-html` — paste HTML handling
- `src/prosemirror/prosekit-extensions.ts` — ProseKit extension wrappers (`blockSelectExtension`, `nodeAttrsSyncExtension`, `defineSemanticPasteExtension`) for the plugins above, published as the `./prosekit-extensions` subpath; importing from here requires the `prosekit` peer dependency
- `src/prosekit/` — ProseKit-specific wrappers for marks/lists (`defineEm`, `defineStrong`, `defineList`), plus `defineBasicExtension()` — the shared QTI-shaped ProseKit base (doc/text/paragraph/heading/list/image/table nodes, `em`/`strong` marks, base keymap/commands/history/gap cursor) that every app's own `basic-extension.ts` composes on top of with its own additions (hard break, virtual selection, AI, etc.) rather than redefining the base itself. Four of these (`doc`, `list`, the `em`/`strong` marks, `image`) are rebuilt rather than patched because ProseKit's own spec does not serialise to what QTI needs — see [prosekit-divergences.md](prosekit-divergences.md).

Does not own QTI composition logic, interaction-specific behavior, or app wiring.

The schema-version compatibility/migration pipeline (`compatibility`) and
local-storage doc persistence (`local-storage-doc-persistence-extension`)
used to live here but were moved into the editor application (now its own
repository, at `src/lib/compatibility` and
`src/extensions/local-storage-doc-persistence-extension`) — they're only
needed by the app that persists raw ProseMirror JSON, not by the public
extension surface. The `virtual-cursor` plugin was removed outright; it had
no consumers.

### `packages/prose-ai` (`@citolab/prose-ai`)

Private package. AI-related ProseKit extensions, vendored from upstream
`@prosekit/ai` (the installed `prosekit`/`@prosekit/extensions` version
doesn't yet export the `Commit` diffing helpers this package needs). Has no
dependency on `prose-qti` or `prose-extensions` — it only
peer-depends on `prosekit` and depends on `prosemirror-changeset`.

Owns:
- `src/ai-diff.ts` — track-changes-style accept/reject decorations and
  commands for an AI-produced `Commit`
- `src/commit-helpers.ts` — `Commit`/`ChangeSet` diffing helpers inlined from
  upstream `@prosekit/extensions` pending that export landing there
- `src/html-bridge.ts` — HTML ⇄ ProseMirror serialize/parse helpers for
  round-tripping content with an AI service
- `src/stream-content-command.ts` — incremental HTML-streaming insertion,
  buffering and flushing at safe tag boundaries

Does not own QTI composition logic or app-level AI wiring (toolbar UI,
prompt construction, model calls) — those belong to the consuming
application, in its own `ai-extension.ts` and
`ai-chat`/`ai-check`/`ai-create`/`ai-stream-content` components. No app in
this repository wires them up today.

### `apps/*`

Owns:
- Runnable demos, the docs site, and cross-package tests
- Integration references
- App shell behavior (toolbars, panels, persistence wiring) *in the demos*

The full authoring application is not here; it lives in its own repository and consumes the
published packages.

Does not own reusable editor primitives, interaction behavior, or canonical composition logic.

`@citolab/prose-qti/integration/interactions/prosekit` ships `defineQtiInteractionsExtension()` and
`defineQtiExtension()`, covering every registered interaction — that is the default an app should
reach for. An app wanting a curated subset assembles its own extension from
`listInteractionSchemaNodeSpecs({ include })` and `listSelectedInteractionPluginFactories({ include })`.

## Package Dependency Flow

```
@citolab/prose-qti          (QTI + interfaces + integration; depends on @qti-components/*)
         ↓
@citolab/prose-extensions   (generic ProseMirror/ProseKit extensions; depends on prose-qti)
         ↓
apps/*  +  external editor applications   (consume the published packages)

@citolab/prose-qti-node     (built from prose-qti's dist/node/ output at pack time; no
                              dependency on prose-extensions — consumed
                              directly by Node-only integrations, not by apps/*)

@citolab/prose-ai           (private; peer-depends on prosekit only, no
                              dependency on the chain above — consumed
                              directly by apps/*)
```

## Package Exports

`packages/prose-qti` and `packages/prose-extensions` are published to npm, so their `package.json` `exports` map (`main`, `types`, and every subpath) must resolve to built `dist/**` output, never raw `src/**/*.ts` — consumers do not compile this repo's TypeScript. Wildcard subpath entries (e.g. `"./components/choice/*": "./dist/components/choice/*"`) must map directly to the already-extensioned build output; do not append `.js`/`.d.ts` in the exports map yourself, since the glob match already includes the extension and doing so produces duplicate-extension paths that fail to resolve. Run each package's `build` script and spot-check `dist/` before changing its `exports` map.

`packages/prose-qti-node` is also published, but its rules differ: it has a single `.` export, an esbuild bundle of `prose-qti`'s `dist/node/index.js` (`scripts/bundle-node.mjs`), not a `tsc` mirror of `src/`. There is no subpath wildcard to keep in sync — only one entry point to rebuild whenever `prose-qti`'s node entry changes.

Cross-package dependencies within this repo (e.g. `prose-extensions` depending on `prose-qti`) use the pnpm `workspace:*` protocol rather than a pinned version — see [release-plan.md](release-plan.md#internal-package-dependencies).

## Placement Decision Rules

Use these rules before adding code.

### Rule 1: Is it reusable beyond one app?

- If no, it may belong in `apps/*`.
- If yes, it does not belong only in `apps/*`.

### Rule 2: Is it a shared contract, interface, or pure type?

- If yes, it belongs in `packages/prose-qti/src/interfaces/`.

Examples:
- `InteractionDescriptor`
- Attribute panel metadata types
- Composer types

### Rule 3: Is it generic editor behavior (not QTI-specific)?

- If yes, it belongs in `packages/prose-extensions/src/`.

Examples:
- Generic ProseMirror plugins
- Block selection
- Attribute syncing
- Schema compatibility migrations
- ProseKit wrappers for standard text extensions

### Rule 4: Is it QTI semantics, interaction behavior, or ProseKit assembly?

- If yes, it belongs in `packages/prose-qti/src/`.

Examples:
- XML composition
- Per-interaction compose handlers
- Response declaration generation
- Interaction node specs and commands
- Descriptor objects
- ProseKit integration surfaces (events, code panel, contexts)

### Rule 5: Is it only needed to demonstrate usage?

- If yes, prefer Storybook stories first and `apps/*` only when a full integration shell is necessary.

## AI Scaffolding Rules

Before generating code, answer these questions explicitly:

1. Is this reusable package code or app example code?
2. If it is a shared type or contract, does it belong in `packages/prose-qti/src/interfaces/`?
3. If it is generic editor behavior, does it belong in `packages/prose-extensions/`?
4. If it is QTI-specific, does it belong in `packages/prose-qti/`?
5. If it is app code, why is it not reusable package code?

### What AI should not do

- Do not add reusable logic only in `apps/*`.
- Do not add QTI-specific logic in `packages/prose-extensions/`.
- Do not add generic ProseMirror behavior in `packages/prose-qti/src/integration/`.
- Do not duplicate type definitions that belong in `packages/prose-qti/src/interfaces/`.
- Do not create new top-level architecture buckets without updating this document first.

## The Descriptor Pattern

Every interaction component in `packages/prose-qti/src/components/*/` exports exactly one descriptor:

```ts
// packages/prose-qti/src/components/choice/descriptor.ts
export const choiceInteractionDescriptor = {
  tagName: 'qti-choice-interaction',
  nodeTypeName: 'qtiChoiceInteraction',
  nodeSpecs: [
    { name: 'qtiChoiceInteraction', spec: qtiChoiceInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    // ...
  ],
  insertCommand: insertChoiceInteraction,
  keyboardShortcut: 'Mod-Shift-q',
  enterCommand: insertSimpleChoiceOnEnter,
  composerMetadata: choiceInteractionComposerMetadata,
  composerHandler: choiceComposerHandler,
  attributePanelMetadata: choiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
```

The `satisfies` operator validates the shape at compile time without widening the type.

Descriptors are registered in `packages/prose-qti/src/core/interactions/composer.ts`. After registration, they flow automatically to:

- `listInteractionDescriptors()` — usable by any consumer
- `listInteractionSchemaNodeSpecs()` — ProseKit node specs assembled from descriptors
- `getNodeAttributePanelMetadataByNodeTypeName()` — attribute panel metadata lookup
- The XML composer — compose handlers dispatched by tag name

Adding a new interaction means: write the component, export a descriptor, register it in core. No other files need updating.

Apps assemble the ProseKit extension by consuming descriptors:

```ts
// apps/*/src/extensions/qti-extension.ts
import { listInteractionDescriptors, listInteractionSchemaNodeSpecs } from '@citolab/prose-qti/core/interactions/composer';
import { defineKeymap, defineNodeSpec, definePlugin, union } from 'prosekit/core';

export function defineQtiInteractionsExtension(options?: { include?: string[] }): Extension {
  const descriptors = listInteractionDescriptors();
  const nodeSpecs = listInteractionSchemaNodeSpecs(options);
  // ... build keymap from descriptors, return union of extensions
}
```

## Storybook's Role

Primary documentation surface for:
- Isolated editor behavior
- Reusable UI states
- Regression fixtures
- Step-by-step editor assembly guidance

## Tests

Unit tests live next to package source. Integration tests cover cross-package contracts. App tests stay thin and cover only app shell behavior.

## Document Schema Versioning

The editor uses a single, monotonically increasing **schema version** for the ProseMirror document model. There is one source of truth:

```ts
// packages/prose-qti/src/interfaces/compatibility.ts (or compatibility.ts in interfaces)
export const CURRENT_SCHEMA_VERSION = 7;
```

### Where the version lives

- **Persisted JSON** — the version travels inside the document as a single top-level property: `{ "type": "doc", "schemaVersion": 7, ... }`. There is no separate storage envelope.
  - `stampSchemaVersion(doc)` adds the marker before writing.
  - `readPersistedDoc(value)` strips it, migrates, and reports what changed.
  - Never stamp a document before migrating it.
- **Roundtrip-QTI** — nowhere. The HTML/XML representation carries no version marker, and there is no HTML migration ladder to feed one to. There was, briefly: a `migrateHtmlFragment` pipeline whose single step renamed camelCase QTI attributes to hyphenated. It was removed on 2026-08-20 — nothing this editor ever exported was camelCase (every `toDOM` writes hyphenated, and no commit ever wrote otherwise), and its version detection could not work for an import anyway, since the caller has no way to know what wrote the file. Imported XML is normalised by the `qti3-item-import` transforms and checked against the schema by `findUnrepresentableElements` instead.

### The migration pipeline

Migrations live in the editor application's own repository, at `src/lib/compatibility/migrations/`, one file per transition, named `json-vN-to-vM.ts`. The chain is unbroken from 1 to `CURRENT_SCHEMA_VERSION`; `ladder.browser.test.ts` asserts that, because a gap would let a document at that version pass through untransformed.

| Step | Transition | What it does |
| --- | --- | --- |
| `json-v1-to-v2` | 1 → 2 | normalise legacy hyphenated attrs to camelCase |
| `json-v2-to-v3` | 2 → 3 | rename `correctResponse` → `rubricScoringBlock` on extended-text |
| `json-v3-to-v4` | 3 → 4 | lift `rubricScoringBlock` into a sibling `qtiRubricBlock` |
| `json-v4-to-v5` | 4 → 5 | flat prosekit list → prosemirror-schema-list (`bullet_list`/`ordered_list`) |
| `json-v5-to-v6` | 5 → 6 | `bold`/`italic` marks → `strong`/`em` |
| `json-v6-to-v7` | 6 → 7 | carry stored `image` width/height across the block → inline move |

To add a migration: bump `CURRENT_SCHEMA_VERSION`, add a `json-vN-to-vM.ts` file, register it in `compatibility/migrations/index.ts`, add a `schema/document-corpus/v<N>.json` fixture for the shape you left behind, and cover the new step's branches in `ladder.browser.test.ts`. Two suites, two questions: the corpus asks whether an old document still opens (real schema, frozen fixtures), the ladder test asks whether each step does what it says and reports what it did (no schema, hand-built shapes — a step's `warning` paths are unreachable from a single fixture).

### When the ladder is not enough

A schema change can outrun the migration ladder, and a document that cannot be loaded must not come back as silence. `@citolab/prose-qti/schema-recovery` is the layer for that case — pure ProseMirror, used by both editors:

- `findSchemaViolation` — the explicit `Node.check()` neither ProseMirror nor ProseKit performs on load
- `salvageJsonDocument` — unwrap unknown nodes keeping their children, drop unknown marks keeping the text, reset attribute values the schema rejects; everything removed is recorded *and* preserved verbatim
- `findUnrepresentableElements` — what a schema cannot match in DOM it is about to parse, which is the only moment `DOMParser`'s silent unwrapping can be observed
- `createRecoveryMarkerPlugin` — decorations at the places content was removed from

The ladder, storage keys, quarantine and wording stay in the app. What every removal says is replaceable without forking: see [compatibility-messages.md](compatibility-messages.md). The full account of the design, including what is still open, is in `plans/surface-silent-document-load-failures.md`.

## Roundtrip-QTI Format

The **roundtrip-QTI** format is a lossless XML serialization of the editor's ProseMirror document. It is produced by `xmlFromNode` (`@citolab/prose-qti/integration/save-xml`) and consumed on import via `xmlToHTML` → `jsonFromHTML`. It is an interchange format for export/import and is fully round-trippable.

## QTI Item Export / Import

`@citolab/prose-qti/item-export` and `@citolab/prose-qti/item-roundtrip/export` serialize the editor's ProseMirror tree to a single standard QTI 3.0 assessment item, and `@citolab/prose-qti/item-roundtrip/import` / `@citolab/prose-qti/qti3-item-import` read a QTI 3.0 item back. The output is interchange-friendly standard QTI with no `data-*` mirrors. There is currently no multi-item test/package-building surface in this package.

The non-QTI attribute set lives in each interaction's component directory within `packages/prose-qti/src/components/`.

## Verification Order

Run the narrowest useful check first:

1. Changed package typecheck
2. Affected package tests
3. Storybook story verification when UI or regressions are involved
4. App build if package behavior surfaces in app integration
5. Broader workspace typecheck only when multiple shared contracts moved

Typical commands:

- `pnpm --filter @citolab/prose-qti typecheck`
- `pnpm --filter @citolab/prose-extensions typecheck`
- `pnpm --filter @qti-editor/prosekit-item build`
- `pnpm -r --filter "./packages/**" run typecheck`

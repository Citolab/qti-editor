# QTI Editor Architecture

## Purpose

This document is the canonical architecture reference for this repository.

Its job is to keep the package structure stable as the codebase grows, especially when new code is scaffolded with AI. Before adding files, use this document to decide:

- whether the code belongs in `apps/*`
- whether it belongs in `packages/prose-qti-ui` (copyable UI components)
- whether it belongs in a reusable package
- which package layer owns it

If a generated change cannot be placed clearly using this document, stop and resolve the ownership question before writing more code.

## Core Rule

`apps/*` are examples, demos, and the main editor application.

They are not the source of truth for reusable behavior, domain logic, editor primitives, or QTI composition logic.

When in doubt, prefer putting reusable logic in a package and letting the app consume it.

## Current Package Structure

```text
packages/
  prose-qti/           ← @citolab/prose-qti   (QTI core + interactions + integration)
  prose-extensions/    ← @citolab/prose-extensions  (generic ProseMirror/ProseKit extensions)
  prose-qti-ui/        ← @citolab/prose-qti-ui  (private UI components, shadcn-registry style)

apps/
  qti-prosekit-app/    ← @qti-editor/prosekit-app  (full editor: Firebase + React)
  qti-prosekit-item/   ← @qti-editor/prosekit-item  (minimal ProseKit example)
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

Interaction components: `associate`, `choice`, `extended-text`, `gap-match`, `hottext`, `inline-choice`, `match`, `order`, `rubric-block`, `select-point`, `text-entry`, plus `shared/` for cross-interaction schemas and helpers.

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

`src/item-export/`, `src/item-roundtrip/`, `src/qti3-item-import/` own QTI serialization and import transforms. `editorContext`/`qtiEditorContext` and multi-item/package-building support were moved out of this package (see `packages/prose-qti-ui`) — this package's export surface is single-item only.

`src/core-css/core-css.css` — the mandatory stylesheet for rendering the editor's PM document (interaction element backgrounds/spacing plus the rubric-block boundary and ProseKit placeholder fix), published as the `./core-css.css` subpath (`@citolab/prose-qti/core-css.css`). Every app that renders the editor must import it alongside `@qti-components/theme`.

### `packages/prose-extensions` (`@citolab/prose-extensions`)

Generic ProseMirror and ProseKit extensions with no QTI-specific logic. `prosekit` is an optional peer dependency (`peerDependenciesMeta.prosekit.optional: true`) — feature subpaths (e.g. `./block-select`, `./node-attrs-sync`) export only plain ProseMirror plugins and never import `prosekit`, so raw-ProseMirror consumers don't need it installed.

Owns:
- `src/prosemirror/block-select` — block selection plugin
- `src/prosemirror/compatibility` — schema versioning and migration pipeline
- `src/prosemirror/local-storage-doc-persistence-extension` — local storage persistence
- `src/prosemirror/node-attrs-sync` — node attribute synchronization
- `src/prosemirror/paste-semantic-html` — paste HTML handling
- `src/prosemirror/virtual-cursor` — virtual cursor plugin
- `src/prosemirror/prosekit-extensions.ts` — ProseKit extension wrappers (`blockSelectExtension`, `nodeAttrsSyncExtension`, `defineSemanticPasteExtension`, `defineLocalStorageDocPersistenceExtension`) for the plugins above, published as the `./prosekit-extensions` subpath; importing from here requires the `prosekit` peer dependency
- `src/prosekit/` — ProseKit-specific wrappers for marks/lists (`defineEm`, `defineStrong`, `defineList`, etc.), published as the `./prosekit` subpath; like `./prosekit-extensions`, importing it requires the `prosekit` peer dependency

Does not own QTI composition logic, interaction-specific behavior, or app wiring.

### `packages/prose-qti-ui` (`@citolab/prose-qti-ui`)

Private package. Canonical source for copyable UI components distributed via the shadcn-style registry.

Owns:
- `src/components/attributes-panel/` — generic attributes panel web component, resolving each selected node's fields via `getNodeAttributePanelMetadataByNodeTypeName` (`@citolab/prose-qti/core/interactions/composer`)
- `src/components/choice-attributes-editor/` — choice interaction attribute editor
- `src/components/extended-text-attributes-editor/` — extended text attribute editor
- `src/components/text-entry-attributes-editor/` — text entry attribute editor
- `src/components/rubric-block-attributes-editor/` — rubric block attribute editor (not independently registry-published; bundled via this package's root entry)
- `src/components/interaction-insert-menu/` — interaction insertion UI
- `src/editor-context/` — `editorContext` (generic ProseKit editor context) and `qtiEditorContext` (`QtiEditorContextValue`), the Lit contexts the above components consume. This replaced `@citolab/prose-qti/integration/editor-context`, which no longer exists.

Does not own generic editor engine behavior or QTI composition logic.

### `apps/*`

Owns:
- Runnable demos and the main editor application
- Full authoring flows
- Integration references
- App shell behavior (toolbars, panels, persistence wiring)

Does not own reusable editor primitives, interaction behavior, or canonical composition logic.

`apps/qti-prosekit-item/src/extensions/qti-extension.ts` shows the canonical pattern for assembling the QTI interactions extension in an app using `listInteractionDescriptors()`.

## Package Dependency Flow

```
@citolab/prose-qti          (QTI + interfaces + integration; depends on @qti-components/*)
         ↓
@citolab/prose-extensions   (generic ProseMirror/ProseKit extensions; depends on prose-qti)
         ↓
@citolab/prose-qti-ui       (private UI; depends on both above)
         ↓
apps/*                      (consume all packages)
```

## Package Exports

`packages/prose-qti` and `packages/prose-extensions` are published to npm, so their `package.json` `exports` map (`main`, `types`, and every subpath) must resolve to built `dist/**` output, never raw `src/**/*.ts` — consumers do not compile this repo's TypeScript. Wildcard subpath entries (e.g. `"./components/choice/*": "./dist/components/choice/*"`) must map directly to the already-extensioned build output; do not append `.js`/`.d.ts` in the exports map yourself, since the glob match already includes the extension and doing so produces duplicate-extension paths that fail to resolve. Run each package's `build` script and spot-check `dist/` before changing its `exports` map.

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

### Rule 5: Is it copyable starter UI rather than a stable package API?

- If yes, it belongs in `packages/prose-qti-ui/src/`.

### Rule 6: Is it only needed to demonstrate usage?

- If yes, prefer Storybook stories first and `apps/*` only when a full integration shell is necessary.

## AI Scaffolding Rules

Before generating code, answer these questions explicitly:

1. Is this reusable package code, registry UI code, or app example code?
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

## Storybook And Registry Roles

### Storybook

Primary documentation surface for:
- Isolated editor behavior
- Reusable UI states
- Regression fixtures
- Step-by-step editor assembly guidance

### Registry

`packages/prose-qti-ui` is the registry source. Built via:
```
pnpm registry:build   # → pnpm --filter @citolab/prose-qti-ui registry:build
```

The registry exposes installable UI components for consumers who want to own and customize editor UI.

## Tests

Unit tests live next to package source. Integration tests cover cross-package contracts. App tests stay thin and cover only app shell behavior.

## Document Schema Versioning

The editor uses a single, monotonically increasing **schema version** for the ProseMirror document model. There is one source of truth:

```ts
// packages/prose-qti/src/interfaces/compatibility.ts (or compatibility.ts in interfaces)
export const CURRENT_SCHEMA_VERSION = 6;
```

### Where the version lives

- **Persisted JSON** — the version travels inside the document as a single top-level property: `{ "type": "doc", "schemaVersion": 6, ... }`. There is no separate storage envelope.
  - `stampSchemaVersion(doc)` adds the marker before writing.
  - `readPersistedDoc(value)` strips it, migrates, and reports what changed.
  - Never stamp a document before migrating it.
- **Roundtrip-QTI** — the HTML/XML representation does not carry the schema version inline. On import, `sourceVersion` is supplied programmatically to `migrateHtmlFragment`.

### The migration pipeline

Migrations live in `packages/prose-extensions/src/prosemirror/compatibility/migrations/`, one file per transition, named `json-vN-to-vM.ts` / `html-vN-to-vM.ts`:

| Step | Transition | What it does |
| --- | --- | --- |
| `json-v1-to-v2` | 1 → 2 | normalise legacy hyphenated attrs to camelCase |
| `json-v2-to-v3` | 2 → 3 | rename `correctResponse` → `rubricScoringBlock` on extended-text |
| `json-v3-to-v4` | 3 → 4 | lift `rubricScoringBlock` into a sibling `qtiRubricBlock` |
| `json-v4-to-v5` | 4 → 5 | flat prosekit list → prosemirror-schema-list (`bullet_list`/`ordered_list`) |
| `json-v5-to-v6` | 5 → 6 | `bold`/`italic` marks → `strong`/`em` |
| `html-v1-to-v2` | 1 → 2 | normalise legacy camelCase HTML attrs |

To add a migration: bump `CURRENT_SCHEMA_VERSION`, add a `json-vN-to-vM.ts` file, register it in `compatibility/migrations/index.ts`, and add a test.

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

# Package Topology Plan

This plan reflects the current structure of this repository.

## Target Topology

```text
packages/
  interfaces/               ← @qti-editor/interfaces (pure TypeScript contracts)

  prosemirror/
    attributes
    attributes-ui-prosekit
    extensions
    interaction-shared
    interaction-choice
    interaction-inline-choice
    interaction-match
    interaction-text-entry
    interaction-extended-text
    interaction-select-point

  qti/
    core
    prosekit-integration

  ui/
    src/components/editor/ui/*
    src/components/blocks/*
    src/lib/*
    src/hooks/*
    components.json
    registry.json

apps/
  editor/
```

## Ownership

### `packages/interfaces`

Pure TypeScript — no runtime dependencies, no framework imports.

Owns the shared contract types consumed by all other packages:

- `InteractionDescriptor` — the registration unit that every interaction package exports
- `InteractionNodeSpecEntry` — node spec entries within a descriptor
- `NodeAttributePanelMetadata`, `AttributeFieldDefinition`, `AttributeFieldOption`, `AttributeFriendlyEditorDefinition` — unified attribute panel types
- `InteractionComposerMetadata`, `InteractionComposerHandler`, `InteractionComposeResult`, `ResponseProcessingKind`, `ComposerWarning` — QTI composition contract types

### `packages/prosemirror/*`

Generic ProseMirror plugins, utilities, and all interaction-level packages.

Each interaction package (`interaction-choice`, `interaction-text-entry`, etc.) owns:
- ProseMirror node specs
- insert/enter commands
- node views and authoring behavior
- per-interaction attribute panel metadata
- per-interaction QTI compose handler
- a `descriptor.ts` exporting a single object that `satisfies InteractionDescriptor`

`attributes` owns the generic ProseMirror attributes engine (plugin, transactions, events).

`attributes-ui-prosekit` owns the ProseKit-oriented attributes panel UI component, built on `@qti-editor/interfaces` types.

`interaction-shared` owns shared schemas, commands, and helpers used across multiple interaction packages.

`extensions` owns generic ProseMirror extensions (block select, virtual cursor, node attrs sync, paste semantic HTML, local storage persistence).

### `packages/qti/core`

QTI composition and XML semantics.

- Descriptor registry: `listInteractionDescriptors()` — returns the canonical list of all registered `InteractionDescriptor` objects
- Derived lookup helpers: `getNodeAttributePanelMetadataByNodeTypeName`, `getComposerHandlerByTagName`, etc.
- XML composition engine, response declarations, identifier normalization
- Composer orchestration that drives per-interaction compose handlers via descriptors

### `packages/qti/prosekit-integration`

ProseKit integration layer for QTI editors.

- `defineQtiInteractionsExtension()` — builds ProseKit node spec extensions and keymap by iterating descriptors from `@qti-editor/core`
- `defineQtiExtension()` — full QTI ProseKit extension including basic editor features
- `qtiEditorEventsExtension` — ProseKit plugin emitting `qti:content:change` and `qti:selection:change` events
- `qtiCodePanelExtension` — ProseKit plugin emitting JSON/HTML/XML document snapshots
- `itemContext` / `ItemContext` — Lit context for QTI assessment item state
- `qtiEditorContext` — Lit context for coordinating editor view state across components
- Shared document types: `QtiDocumentJson`, `QtiNodeJson`

This package does not re-export interaction package internals. Consumers who need raw interaction commands or node specs import from the interaction packages directly.

### `packages/ui`

Canonical source for copyable UI and registry items.

- Vendored ProseKit/shadcn-style UI dependencies in `src/components/editor/ui/*`
- QTI-facing and app-facing blocks in `src/components/blocks/*`
- Registry metadata and build flow (`registry.json`, transform/build scripts)

### `apps/editor`

Real integration app and smoke surface.

- Consumes package APIs directly (especially `@qti-editor/ui/*`) instead of app-local copied registry source
- Provides a realistic end-to-end wiring reference

## The Descriptor Pattern

Every interaction package exports exactly one descriptor:

```ts
// packages/prosemirror/interaction-choice/src/descriptor.ts
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

The descriptor is registered in `packages/qti/core/src/interactions/composer.ts`. After registration, it flows automatically to:

- `listInteractionDescriptors()` — usable by any consumer
- `defineQtiInteractionsExtension()` — ProseKit node specs and keymap assembled from descriptors
- `getNodeAttributePanelMetadataByNodeTypeName()` — attribute panel metadata lookup
- the XML composer — compose handlers dispatched by tag name

Adding a new interaction means: write the interaction package, export a descriptor, register it in core. No other files need updating.

## Package Dependency Flow

```
@qti-editor/interfaces          (no deps)
        ↓
@qti-editor/interaction-*       (depend on interfaces, interaction-shared)
        ↓
@qti-editor/core                (depends on all interaction packages, interfaces)
        ↓
@qti-editor/prosekit-integration (depends on core, lit, prosekit)
        ↓
@qti-editor/ui                  (depends on prosekit-integration, interaction packages, core)
        ↓
apps/editor                     (depends on ui, prosekit-integration)
```

`@qti-editor/prosemirror-attributes` and `@qti-editor/prosemirror-attributes-ui-prosekit` sit alongside the interaction packages in the `prosemirror` layer and depend on `interfaces`.

## Registry Build/Hosting

- Registry source of truth: `packages/ui/registry.json`
- Registry build: `pnpm --filter @qti-editor/ui registry:build`
- Deploy staging:
  - app at `hosting/dist/`
  - storybook at `hosting/dist/storybook/`
  - registry JSON at `hosting/dist/r/`
- Firebase serves a single site with `/`, `/storybook/`, and `/r/`.

## Migration Notes

- The legacy top-level `registry/` workspace is removed.
- Any stale references to `registry/prosekit-core` or `registry/prosekit-ui` should be treated as historical and migrated to `packages/ui`.
- The old `@qti-editor/qti-editor-kit` package was renamed to `@qti-editor/prosekit-integration` and its barrel re-export of all interaction packages was removed. Consumers import interaction commands from the individual interaction packages directly.

# Package Topology

This document reflects the current structure of this repository.

## Current Topology

```text
packages/
  prose-qti/           ← @citolab/prose-qti
  prose-extensions/    ← @citolab/prose-extensions
  prose-qti-ui/        ← @citolab/prose-qti-ui (private)

apps/
  qti-prosekit-app/    ← @qti-editor/prosekit-app
  qti-prosekit-item/   ← @qti-editor/prosekit-item
  qti-prosemirror-item/ ← @qti-editor/prosemirror-item
  site/                ← @qti-editor/site
  e2e/
```

## Ownership

### `packages/prose-qti` (`@citolab/prose-qti`)

The main package. Owns all QTI logic, the descriptor registry, integration surfaces, and shared TypeScript contracts.

**`src/interfaces/`** — Pure TypeScript contracts, no runtime dependencies:
- `InteractionDescriptor` — the registration unit every interaction component exports
- `InteractionNodeSpecEntry` — node spec entries within a descriptor
- `NodeAttributePanelMetadata`, `AttributeFieldDefinition`, `AttributeFieldOption`, `AttributeFriendlyEditorDefinition` — unified attribute panel types
- `InteractionComposerMetadata`, `InteractionComposerHandler`, `InteractionComposeResult`, `ResponseProcessingKind`, `ComposerWarning` — QTI composition contract types

**`src/components/*`** — One directory per interaction type. Each owns:
- ProseMirror node specs, insert command, enter command
- Node views and authoring behavior
- Per-interaction QTI compose handler and metadata
- Per-interaction attribute panel metadata
- `descriptor.ts` exporting a single object that `satisfies InteractionDescriptor`

Interaction types: `associate`, `choice`, `extended-text`, `gap-match`, `hottext`, `inline-choice`, `item-divider`, `match`, `order`, `rubric-block`, `select-point`, `text-entry`, `shared`.

**`src/core/`** — Descriptor registry and composition orchestration:
- `listInteractionDescriptors()` — canonical list of all registered `InteractionDescriptor` objects
- `listInteractionSchemaNodeSpecs()` — node spec entries from selected descriptors
- `listSelectedInteractionPluginFactories()` — plugin factories from descriptors
- XML composition engine, response declarations, identifier normalization

**`src/integration/`** — ProseKit integration surfaces:
- `events` — `qtiEditorEventsExtension`, `onQtiContentChange`, `onQtiSelectionChange`
- `code` — `qtiCodePanelExtension`
- `item-context` — `itemContext`, `ItemContext`, `itemContextVariables`
- `editor-context` — `editorContext`
- `save-xml` — `xmlFromNode`, `xmlToHTML`
- `save-qti-item` — `qtiItemFromProsemirror`
- `save-qti-test` — `qtiTestFromProsemirror`, `countQtiItems`, `getQtiItems`
- `interactions` — `registerQtiInteractionElements`

**`src/item-export/`**, **`src/item-roundtrip/`**, **`src/qti3-item-import/`**, **`src/test-export/`**, **`src/package-builder/`** — QTI serialization, import transforms, and package building.

### `packages/prose-extensions` (`@citolab/prose-extensions`)

Generic ProseMirror and ProseKit extensions. No QTI-specific logic.

- `src/prosemirror/attributes` — generic attributes engine
- `src/prosemirror/attributes-ui` — ProseKit-oriented attributes panel UI
- `src/prosemirror/block-select` — block selection plugin
- `src/prosemirror/compatibility` — schema versioning and migration pipeline
- `src/prosemirror/local-storage-doc-persistence-extension`
- `src/prosemirror/node-attrs-sync`
- `src/prosemirror/paste-semantic-html`
- `src/prosemirror/virtual-cursor`
- `src/prosekit/` — ProseKit wrappers (`defineEm`, `defineStrong`, `defineList`, etc.)

Exports via subpaths:
- `@citolab/prose-extensions/prosemirror` — all ProseMirror extensions
- `@citolab/prose-extensions/prosekit` — ProseKit-specific extensions
- `@citolab/prose-extensions/compatibility` — migration pipeline
- `@citolab/prose-extensions/attributes`, `/attributes-ui`, `/block-select`, etc.

### `packages/prose-qti-ui` (`@citolab/prose-qti-ui`)

Private package. Canonical source for copyable UI components.

- `src/components/attributes-panel/`
- `src/components/choice-attributes-editor/`
- `src/components/extended-text-attributes-editor/`
- `src/components/text-entry-attributes-editor/`
- `src/components/interaction-insert-menu/`

Registry build: `pnpm --filter @citolab/prose-qti-ui registry:build`

### `apps/qti-prosekit-app`

Full editor: Firebase persistence, React panels, full toolbar. Primary end-to-end integration reference. Runs via `pnpm dev`.

### `apps/qti-prosekit-item`

Minimal ProseKit + QTI editor example. Shows the canonical pattern for assembling `defineQtiInteractionsExtension` from descriptors, wiring item context, and saving XML. Good starting point for new integrations.

### `apps/qti-prosemirror-item`

Raw ProseMirror editor with QTI roundtrip. No ProseKit. Demonstrates bare-minimum setup for QTI import/export without the ProseKit integration layer.

### `apps/site`

Astro documentation site, served alongside Storybook and the registry under Firebase.

## The Descriptor Pattern

Every interaction exports exactly one descriptor:

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

The descriptor is registered in `packages/prose-qti/src/core/interactions/composer.ts`. After registration, it flows automatically to:

- `listInteractionDescriptors()` — usable by any consumer
- `listInteractionSchemaNodeSpecs()` — node specs assembled from descriptors
- `getNodeAttributePanelMetadataByNodeTypeName()` — attribute panel metadata lookup
- The XML composer — compose handlers dispatched by tag name

Apps consume descriptors to assemble the ProseKit extension (see `apps/qti-prosekit-item/src/extensions/qti-extension.ts` for the canonical pattern). Adding a new interaction: write the component, export a descriptor, register it in core. No other files need updating.

## Package Dependency Flow

```
@citolab/prose-qti           (QTI + interfaces + integration)
        ↓
@citolab/prose-extensions    (generic ProseMirror/ProseKit; depends on prose-qti)
        ↓
@citolab/prose-qti-ui        (private UI; depends on both above)
        ↓
apps/*                       (consume all packages)
```

## Registry Build/Hosting

- Registry source of truth: `packages/prose-qti-ui/src/`
- Registry build: `pnpm registry:build` (delegates to `@citolab/prose-qti-ui`)
- Firebase hosting:
  - `hosting:site` → Astro site + Storybook + registry JSON under `/r/`
  - `hosting:editor` → `apps/qti-prosekit-app` build

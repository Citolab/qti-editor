# QTI Editor Architecture

## Purpose

This document is the canonical architecture reference for this repository.

Its job is to keep the package structure stable as the codebase grows, especially when new code is scaffolded with AI. Before adding files, use this document to decide:

- whether the code belongs in `apps/editor`
- whether it belongs in `packages/ui` (copyable UI registry source)
- whether it belongs in a reusable package
- which package layer owns it

If a generated change cannot be placed clearly using this document, stop and resolve the ownership question before writing more code.

## Core Rule

`apps/*` are examples and demos.

They are not the source of truth for reusable behavior, domain logic, editor primitives, or QTI composition logic.

When in doubt, prefer putting reusable logic in a package and letting the app consume it.

## Target Topology

```text
packages/
  interfaces/               ← shared TypeScript contracts (no runtime deps)

  prosemirror/
    extensions
    attributes
    attributes-ui
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

apps/
  editor/
```

This remains the intended end state even while the current codebase is still migrating toward it.

Deprecated umbrella surfaces such as `packages/qti-editor` and `packages/coco` are intentionally not part of this topology.

## Layer Ownership

### `packages/interfaces`

Owns:

- shared TypeScript contracts with no runtime dependencies
- `InteractionDescriptor` — the registration unit every interaction package implements
- `NodeAttributePanelMetadata`, `AttributeFieldDefinition`, `AttributeFriendlyEditorDefinition` — unified attribute panel types
- composer types: `InteractionComposerMetadata`, `InteractionComposerHandler`, etc.

Does not own:

- any runtime implementation
- framework-specific code
- anything with a dependency on ProseMirror, ProseKit, or Lit

All other packages depend on `@qti-editor/interfaces` for shared types. Nothing inside `interfaces` depends on any other `@qti-editor/*` package.

### `packages/prosemirror/*`

Owns:

- generic ProseMirror plugins and utilities
- interaction node specs
- commands
- node views and authoring behavior
- generic attributes engine
- framework-agnostic or ProseMirror-first editor behavior
- ProseKit-oriented attributes panel UI (`attributes-ui`)

Does not own:

- QTI XML composition orchestration
- app-specific wiring
- product/demo shell code

Each interaction package exports a descriptor (`descriptor.ts`) that `satisfies InteractionDescriptor` from `@qti-editor/interfaces`. The descriptor bundles everything the interaction contributes: node specs, commands, keyboard shortcut, enter command, composer metadata, composer handler, and attribute panel metadata.

### `packages/qti/*`

Owns:

- assessment item composition
- per-interaction QTI compose modules
- XML generation
- response declarations
- identifier normalization
- QTI metadata registries
- descriptor-driven interaction registry (`@qti-editor/core`)
- ProseKit integration layer (`@qti-editor/prosekit-integration`)

Does not own:

- generic ProseMirror behavior
- app-specific UI
- copyable scaffold code

#### Descriptor-driven registry (`@qti-editor/core`)

`@qti-editor/core` owns the canonical list of registered `InteractionDescriptor` objects and derives everything dynamically from them. Consumers call `listInteractionDescriptors()` to get the full list, or use the built map helpers (`getNodeAttributePanelMetadataByNodeTypeName`, etc.).

#### ProseKit integration layer (`@qti-editor/prosekit-integration`)

`@qti-editor/prosekit-integration` is the ProseKit-specific integration surface. It owns:

- `defineQtiInteractionsExtension()` — assembles ProseKit node spec extensions and keymap from descriptors
- `defineQtiExtension()` — full QTI ProseKit extension including basic editor features
- `qtiEditorEventsExtension` — ProseKit plugin emitting content/selection change events
- `qtiCodePanelExtension` — ProseKit plugin emitting JSON/HTML/XML document snapshots
- `itemContext` / `ItemContext` — Lit context for QTI assessment item state
- `qtiEditorContext` — Lit context for coordinating editor state across components

### `packages/ui/*`

Owns:

- copyable ProseKit-based UI and QTI-facing UI blocks for shadcn-style distribution
- vendored upstream ProseKit/shadcn-style UI dependencies used by those blocks
- code panel
- composer panel
- composer metadata form
- QTI-facing panel shells

Does not own:

- generic editor engine behavior
- QTI composition logic
- the only implementation of a reusable package contract

### `apps/*`

Owns:

- runnable demos
- full authoring flows
- realistic playgrounds
- end-to-end integration references
- app shell behavior

Does not own:

- reusable editor primitives
- reusable interaction behavior
- reusable attributes logic
- canonical composition logic
- the only copy of code intended for reuse elsewhere

## Installed Registry Code In Apps

Third-party consumer apps may contain code installed from the registry, but that code must be treated differently from app-local code.

First-party apps inside this monorepo should prefer direct imports from `packages/*` for canonical runtime behavior. The registry is the external distribution format, not the default internal runtime source.

First-party monorepo apps should import directly from package surfaces (for example `@qti-editor/ui/*`) instead of storing copied registry code in app source.

### Rules for installed registry code

- First-party monorepo apps should not keep copied registry code as their default runtime model.
- Do not mix installed registry code and app-local code in the same folder without an explicit reason.
- Do not silently customize copied registry code in place.
- If a copied registry file is changed for this app only, treat it as a fork and move or mark it under `overrides/*`.
- If a change should benefit other editors, update the registry source instead of only the installed app copy.

### Synced vs forked state

Installed registry files should have a visible state:

- `synced`
  still intended to track the shared registry scaffold
- `forked`
  intentionally diverged for this app instance

Recommended mechanisms:

- header comment in copied files that records the registry source
- registry build metadata that records canonical source files and install paths
- a check script or CI rule that flags divergence only in projects that intentionally keep copied registry installs

### What not to do

- Do not delete installed components on every app start to force a fresh install.
- Do not rely only on memory or convention to remember which files came from the registry.
- Do not leave copied registry files in a misleading location that makes them look like canonical shared code.

The goal is visibility and intentional divergence, not automatic destruction and reinstallation.

## Placement Decision Rules

Use these rules before adding code.

### Rule 1: Is it reusable beyond one app?

- If no, it may belong in `apps/*`.
- If yes, it does not belong only in `apps/*`.

### Rule 2: Is it a shared contract, interface, or pure type?

- If yes, it belongs in `packages/interfaces`.

Examples:

- `InteractionDescriptor`
- attribute panel metadata types
- composer types
- any type shared between two or more packages with no runtime dependency

### Rule 3: Is it editor behavior or document behavior?

- If yes, it belongs in `packages/prosemirror/*`.

Examples:

- commands
- node specs
- plugin state
- selection helpers
- transaction helpers
- block selection
- attribute syncing
- interaction `descriptor.ts` files (they implement `InteractionDescriptor`)

### Rule 4: Is it QTI semantics, export behavior, or ProseKit assembly?

- If yes, it belongs in `packages/qti/*`.

Examples:

- XML composition
- per-interaction compose handlers
- response declaration generation
- identifier normalization
- QTI metadata registries
- `defineQtiInteractionsExtension` and `defineQtiExtension`
- ProseKit plugins that are specific to QTI editing (events, code panel)
- Lit contexts for editor and item state

### Rule 5: Is it copyable starter code rather than a stable package API?

- If yes, it belongs in `packages/ui/src/*` and must be represented in `packages/ui/registry.json`.

### Rule 6: Is it only needed to demonstrate usage?

- If yes, prefer Storybook stories first and `apps/*` only when a full integration shell is necessary.
- Do not place demo-only code in reusable packages.

## AI Scaffolding Rules

These rules are specifically for future AI-assisted scaffolding.

Before generating code, answer these questions explicitly:

1. Is this reusable package code, registry scaffold code, or app example code?
2. If it is a shared type or contract, does it belong in `packages/interfaces`?
3. If it is package code, which layer owns it: `prosemirror`, `qti`, or `ui`?
4. If it is registry code, is it a ProseKit-core candidate or ProseKit UI?
5. If it is app code, why is it not reusable package or registry code?

If those questions are not answered, the change is not ready to scaffold.

### What AI should not do

- Do not add reusable logic only in `apps/editor`.
- Do not add canonical business logic in `packages/ui`.
- Do not add generic ProseMirror behavior in `packages/qti/*`.
- Do not add QTI composition logic in `packages/prosemirror/*`.
- Do not duplicate type definitions that belong in `packages/interfaces`.
- Do not create new top-level architecture buckets without updating this document first.
- Do not modify installed registry code in an app without deciding whether the change belongs in the registry source or is an intentional app-local fork.

Specifically:

- interaction node specs, commands, node views, and authoring behavior belong in `packages/prosemirror/*`
- each interaction package must export a `descriptor.ts` that `satisfies InteractionDescriptor`
- per-interaction QTI compose handlers belong in `packages/qti/core`
- the canonical attributes engine lives under the ProseMirror layer
- supported app-facing attributes UI is ProseKit-first
- if a feature is a thin ProseKit wrapper over ProseMirror primitives, expose both:
  - a ProseMirror-native entrypoint
  - a sibling `.../prosekit` entrypoint
- do not require dual entrypoints for app-facing UI surfaces like the package-owned attributes, code, or composer panels

### Promotion rules

Generated code may start in one of three places depending on maturity:

- `apps/*`
  if it is a demo-only integration
- `packages/ui/*`
  if it is copyable starter code still proving its shape
- `packages/*`
  if it is already a stable reusable surface

Promotion path:

- app experiment
  -> registry scaffold
  -> reusable package

or

- app experiment
  -> reusable package

depending on whether the code is intended to be copied or consumed as an API.

## Naming Rules

- Use `interaction-*` for editor-facing interaction packages.
- Use `qti-*` only for packages that primarily own QTI semantics or export behavior.
- Use `prosekit-*` for packages that are ProseKit-specific integration surfaces or ProseKit-oriented UI adapters.
- Keep package names stable once introduced unless there is an explicit migration plan.

## The Descriptor Pattern

Every interaction package exports exactly one descriptor object:

```ts
export const myInteractionDescriptor = {
  tagName: 'qti-my-interaction',
  nodeTypeName: 'qtiMyInteraction',
  nodeSpecs: [...],
  insertCommand: insertMyInteraction,
  keyboardShortcut: 'Mod-Shift-x',
  enterCommand: insertMyChoiceOnEnter,
  composerMetadata: myComposerMetadata,
  composerHandler: myComposerHandler,
  attributePanelMetadata: { qtiMyInteraction: myPanelMetadata },
} satisfies InteractionDescriptor;
```

The `satisfies` operator validates the shape at compile time without widening the type.

`@qti-editor/core` maintains the registry. When a new interaction is added, it is registered in `packages/qti/core/src/interactions/composer.ts` and automatically flows through to all consumers: `listInteractionDescriptors()`, the ProseKit extension assembly, the attribute panel metadata lookup, and the XML composer.

No parallel hard-coded lists. No synchronization burden across packages.

## Storybook And Registry Roles

### Storybook

Storybook is the primary documentation surface for:

- package documentation
- isolated editor behavior
- reusable UI states
- regression fixtures
- guided "build your editor" documentation

Storybook should document:

- how to start from a bare ProseMirror editor
- how to add interaction packages
- how to add styles
- how to add `block-select`
- how to add `sync-attributes`
- how to add the attributes engine
- how to add attribute, code, and composer panels
- how to add optional ProseKit-oriented pieces

### Registry

Registry is the primary distribution surface for:

- copyable UI components
- starter scaffolds
- scaffold-style example installs

The registry remains one service with one build/serve flow, even though it contains two organizational tracks:
- source and metadata in `packages/ui`
- generated JSON artifacts under `/r/*` during hosting build

## Tests

### Unit tests belong in packages

Unit tests should verify:

- commands
- node specs
- parsing and serialization
- plugin state transitions
- helper functions
- QTI composition helpers
- per-interaction compose handlers
- extension builder logic
- descriptor shape and completeness

These should live next to package source, not in app tests.

### Integration tests verify cross-package contracts

Integration tests should cover:

- real `EditorState` insertion flows
- attributes engine transaction updates
- interaction schema compatibility
- generated XML from realistic documents
- event wiring across prosekit-integration surfaces
- descriptor registry completeness

### App tests stay thin

App tests should only cover:

- app shell behavior
- full integration smoke paths
- demo-specific wiring

Apps must not become the only place where reusable behavior is verified.

## Verification Order

Run the narrowest useful check first:

1. changed package typecheck
2. affected package tests
3. Storybook story verification when UI or regressions are involved
4. app build if package behavior surfaces in app integration
5. broader workspace typecheck only when multiple shared contracts moved

Typical commands:

- `pnpm --filter <changed-package> typecheck`
- `pnpm --filter @qti-editor/app build`
- `pnpm -r --filter "./packages/**" run typecheck`

## QTI Item Export / Import

`packages/qti/item-export` and `packages/qti/package-builder` serialize the
editor's ProseMirror tree to **standard QTI 3.0**, and `packages/qti/qti3-item-import`
reads any QTI 3.0 item back. There are no `data-*` mirrors and no editor-origin
markers — the output is interchange-friendly standard QTI.

- Export folds editor authoring state into standard `qti-response-declaration` /
  `qti-response-processing`, and emits interactions carrying their authoring
  attributes (`correct-response`, `score`, …) as **canonical, unprefixed**
  attributes only in the editor's own *roundtrip item-body* representation. The
  packaged QTI strips those and keeps only standard QTI nodes.
- Import treats every item as third-party. `roundtripQtiItem`
  (`@qti-editor/qti3-item-import`) runs idempotent transforms that hoist
  `correct-response` / `score` from the native declarations back onto each
  interaction as canonical attributes. A generic fallback covers any interaction
  with a `response-identifier`; per-type transforms add type-specific behaviour.
- Editor-only hints with no standard-QTI source — text-entry `case-sensitive`,
  select-point `area-mappings` — are reconstructed only if the source item
  carried them.

The non-QTI attribute set lives in exactly one place — each interaction's
`nonQtiAttributes` declaration in `packages/prosemirror/interaction-*/src/composer/metadata.ts`
— exposed at runtime via `getNonQtiAttributeSources`
(in `@qti-editor/interaction-shared/composer/non-qti-attributes`) for the
compose/strip step.

For the conceptual overview of the itembody-as-source-of-truth subformat — what
non-QTI attributes the editor stores on interaction elements and how the final
export stays standard QTI 3.0 — see [Itembody-only QTI subformat](../apps/site/src/content/docs/packages/itembody-subformat.mdx) (published on the docs site under Package Reference).


## Document Schema Versioning

The editor uses a single, monotonically increasing **schema version** for the
ProseMirror document model. There is one source of truth:

```ts
// packages/interfaces/src/compatibility.ts
export const CURRENT_SCHEMA_VERSION = 6;
```

Both representations of a document — the persisted ProseMirror `NodeJSON` and
the roundtrip-QTI HTML/XML — are migrated up to this shared target version.

### Where the version lives

- **Persisted JSON** — the version travels *inside* the document as a single
  extra top-level property: `{ "type": "doc", "schemaVersion": 6, ... }`.
  There is no separate storage envelope.
  - `stampSchemaVersion(doc)` adds the marker before writing.
  - `readPersistedDoc(value)` strips it, migrates, and reports what changed.
  - Never stamp a document *before* migrating it — that marks stale content as
    current and prevents migration from ever running.
- **Roundtrip-QTI** — the HTML/XML representation does not carry the schema
  version inline. On import, the `sourceVersion` is supplied programmatically to
  `migrateHtmlFragment` so an item exported from an older editor build is
  migrated forward on the way back in.

### The migration pipeline

Migrations live in `packages/extensions/prosemirror/src/compatibility/migrations/`,
one file per transition, named `json-vN-to-vM.ts` / `html-vN-to-vM.ts`:

| Step | Transition | What it does |
| --- | --- | --- |
| `json-v1-to-v2` | 1 → 2 | normalise legacy hyphenated attrs to camelCase |
| `json-v2-to-v3` | 2 → 3 | rename `correctResponse` → `rubricScoringBlock` on extended-text |
| `json-v3-to-v4` | 3 → 4 | lift `rubricScoringBlock` into a sibling `qtiRubricBlock` |
| `json-v4-to-v5` | 4 → 5 | flat prosekit list → prosemirror-schema-list (`bullet_list`/`ordered_list`) |
| `json-v5-to-v6` | 5 → 6 | `bold`/`italic` marks → `strong`/`em` |
| `html-v1-to-v2` | 1 → 2 | normalise legacy camelCase HTML attrs |

The engine (`migrateDocument` in `compatibility/index.ts`) walks the chain in
version order. When no step bridges exactly from the current version it **skips
forward** to the next registered step, or to the target version if none remain.
This lets one representation stop early (HTML defines steps only up to v2) while
another keeps going (JSON to v6) under one shared target version.

To add a migration: bump `CURRENT_SCHEMA_VERSION`, add a `json-vN-to-vM.ts`
file, register it in `compatibility/migrations/index.ts`, and add a test.

## Roundtrip-QTI Format

The **roundtrip-QTI** format is a lossless XML serialization of the editor's
ProseMirror document. It is produced by `xmlFromNode`
(`packages/qti/item-export/src/pm-xml.ts`) and consumed on import via
`xmlToHTML` → `jsonFromHTML`. It is *not* persisted today — it is an
interchange format for export/import — but it is fully round-trippable.

The conversion rules are:

- Every ProseMirror node is serialized to its XML element form.
- The document root node becomes `<qti-item-body>`.
- **Non-QTI** attributes are written as **canonical, unprefixed** attributes
  (no `data-*` prefix). This applies to interaction nodes (via their
  `nonQtiAttributes`) **and** to the document root: the doc node's own
  `title` / `identifier` are written onto the body, so a document with
  `title`/`identifier` emits:

  ```xml
  <qti-item-body
    title="My Item"
    identifier="ITEM_001">
    ...
  </qti-item-body>
  ```

On import, an item exported from an older editor build is migrated forward via
`migrateHtmlFragment` (the `sourceVersion` is supplied programmatically rather
than read from an inline attribute).

## Migration Note


Some current source paths still reflect the old structure. During migration:

- preserve existing import contracts unless a rename is deliberate
- move logic toward the target layers described above
- do not treat current file locations as proof of correct ownership

When this document and the current implementation disagree, use the target ownership model as the decision guide for new work.

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
  prosemirror/
    core
    attributes
    attributes-ui-prosekit
    interaction-shared
    interaction-choice
    interaction-inline-choice
    interaction-match
    interaction-text-entry
    interaction-extended-text
    interaction-select-point

  qti/
    core
    editor-kit
  ui

apps/
  editor/
```

This remains the intended end state even while the current codebase is still migrating toward it.

Deprecated umbrella surfaces such as `packages/qti-editor` and `packages/coco` are intentionally not part of this topology.

## Layer Ownership

### `packages/prosemirror/*`

Owns:

- generic ProseMirror plugins and utilities
- interaction node specs
- commands
- node views and authoring behavior
- generic attributes engine
- framework-agnostic or ProseMirror-first editor behavior

Does not own:

- QTI XML composition orchestration
- app-specific wiring
- product/demo shell code

### `packages/qti/*`

Owns:

- assessment item composition
- per-interaction QTI compose modules
- XML generation
- response declarations
- identifier normalization
- QTI metadata registries
- supported QTI editor-kit assembly

Does not own:

- generic ProseMirror behavior
- app-specific UI
- copyable scaffold code

### `packages/prosekit/*`

Owns:

- stable reusable ProseKit package surfaces
- reusable integration primitives that are generic enough to maintain as package APIs
- supported ProseKit-oriented UI surfaces when they are part of the maintained editor-kit story

Does not own:

- domain-specific QTI business logic
- temporary starter code
- app-local experiments

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

### Rule 2: Is it editor behavior or document behavior?

- If yes, it belongs in `packages/prosemirror/*`.

Examples:

- commands
- node specs
- plugin state
- selection helpers
- transaction helpers
- block selection
- attribute syncing

### Rule 3: Is it QTI semantics or export behavior?

- If yes, it belongs in `packages/qti/*`.

Examples:

- XML composition
- per-interaction compose handlers
- response declaration generation
- identifier normalization
- QTI metadata registries
- QTI editor-kit assembly

### Rule 4: Is it stable reusable ProseKit infrastructure?

- If yes, it belongs in `packages/prosekit/*`.

Examples:

- richer attributes UI affordances
- icon-based class pickers
- curated choice UIs
- stable ProseKit-specific editor controls

### Rule 5: Is it copyable starter code rather than a stable package API?

- If yes, it belongs in `packages/ui/src/*` and must be represented in `packages/ui/registry.json`.

### Rule 6: Is it only needed to demonstrate usage?

- If yes, prefer Storybook stories first and `apps/*` only when a full integration shell is necessary.
- Do not place demo-only code in reusable packages.

## AI Scaffolding Rules

These rules are specifically for future AI-assisted scaffolding.

Before generating code, answer these questions explicitly:

1. Is this reusable package code, registry scaffold code, or app example code?
2. If it is package code, which layer owns it: `prosemirror`, `qti`, or `prosekit`?
3. If it is registry code, is it a ProseKit-core candidate or ProseKit UI?
4. If it is app code, why is it not reusable package or registry code?

If those questions are not answered, the change is not ready to scaffold.

### What AI should not do

- Do not add reusable logic only in `apps/editor`.
- Do not add canonical business logic in `packages/ui`.
- Do not add generic ProseMirror behavior in `packages/qti/*`.
- Do not add QTI composition logic in `packages/prosemirror/*`.
- Do not create new top-level architecture buckets without updating this document first.
- Do not modify installed registry code in an app without deciding whether the change belongs in the registry source or is an intentional app-local fork.

Specifically:

- interaction node specs, commands, node views, and authoring behavior belong in `packages/prosemirror/*`
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
- Use `prosekit-*` only for stable reusable ProseKit surfaces.
- Keep package names stable once introduced unless there is an explicit migration plan.

## Storybook And Registry Roles

### Storybook

Storybook is the primary documentation surface for:

- package documentation
- isolated editor behavior
- reusable UI states
- regression fixtures
- guided “build your editor” documentation

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

These should live next to package source, not in app tests.

### Integration tests verify cross-package contracts

Integration tests should cover:

- real `EditorState` insertion flows
- attributes engine transaction updates
- interaction schema compatibility
- generated XML from realistic documents
- event wiring across editor-kit surfaces

### App tests stay thin

App tests should only cover:

- app shell behavior
- full integration smoke paths
- demo-specific wiring

Apps must not become the only place where reusable behavior is verified.

## Verification Order

Run the narrowest useful check first:

1. changed package build
2. affected package tests
3. Storybook story verification when UI or regressions are involved
4. app build if package behavior surfaces in app integration
5. broader workspace build only when multiple shared contracts moved

Typical commands:

- `pnpm --filter <changed-package> build`
- `pnpm --filter @qti-editor/app build`
- `pnpm -r --filter "./packages/**" run build`
- `pnpm lint:check`

## Migration Note

Some current source paths still reflect the old structure. During migration:

- preserve existing import contracts unless a rename is deliberate
- move logic toward the target layers described above
- do not treat current file locations as proof of correct ownership

When this document and the current implementation disagree, use the target ownership model as the decision guide for new work.

# Package Topology Plan

This document is the concrete execution map for the package restructure. It turns the agreed architecture into exact move targets, package responsibilities, and initial PR boundaries.

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

  prosekit/
    core

registry/
  prosekit-core/
    block-handle
    toolbar
  prosekit-ui/
    attributes-panel
    code-panel
    composer-panel
    composer-metadata-form

This remains one registry service and one build/serve flow. The split is organizational only: two namespaces inside the same registry, not two separate registry servers.
```

## Ownership

`packages/prosemirror/*`
- Generic ProseMirror plugins and utilities
- Interaction node specs, commands, node views, authoring behavior
- Generic attribute inspection and update engine
- ProseMirror-native primitives that may also have sibling `.../prosekit` adapter entrypoints

`packages/qti/*`
- QTI composer registry and orchestration
- Per-interaction QTI composition modules
- Assessment item XML generation
- Response declarations and identifier normalization
- QTI metadata needed for composition and editor-kit assembly

`packages/prosekit/*`
- Stable reusable ProseKit package surfaces
- ProseKit integration primitives that are generic enough to publish and maintain as package APIs

`registry/prosekit-core/*`
- Copyable ProseKit-oriented scaffolds that may eventually belong in ProseKit itself
- Staging area for generic editor infrastructure patterns before they graduate into `packages/prosekit/*` or upstream ProseKit
- Examples: block handles and similar editor-primitive integrations

`registry/prosekit-ui/*`
- Copyable ProseKit-based UI components that are useful in this ecosystem but do not belong in ProseKit core
- Home for domain-facing panels and forms built on top of ProseKit
- Examples: code panel, composer panel, composer metadata form, QTI-specific panel shells
- Never the source of truth for business logic or generic editor engine behavior

## Naming Rules

- Use `interaction-*` for editor-facing interaction packages.
- Use `qti-*` only when a package owns QTI semantics or export behavior.
- Keep package names stable once moved unless there is a deliberate breaking-release plan.

## Current To Target Package Map

### ProseMirror layer

- `packages/prosemirror`
  -> `packages/prosemirror/core`
  Notes:
  keep this as the canonical source of generic PM utilities.

- `packages/prosemirror/interaction-shared`
  -> `packages/prosemirror/interaction-shared`
  Notes:
  shared prompt/simple-choice building blocks and common command helpers stay with the authoring layer.

- `packages/prosemirror/interaction-choice`
  -> `packages/prosemirror/interaction-choice`

- `packages/prosemirror/interaction-inline-choice`
  -> `packages/prosemirror/interaction-inline-choice`

- `packages/prosemirror/interaction-match`
  -> `packages/prosemirror/interaction-match`

- `packages/prosemirror/interaction-text-entry`
  -> `packages/prosemirror/interaction-text-entry`

- `packages/prosemirror/interaction-extended-text`
  -> `packages/prosemirror/interaction-extended-text`

- `packages/prosemirror/interaction-select-point`
  -> `packages/prosemirror/interaction-select-point`

### QTI layer

- `packages/core`
  -> split into:
  - `packages/qti/core`
  - `packages/qti/editor-kit`
  Notes:
  `core` currently mixes composition, interaction aggregation, event extensions, attributes, code panel support, and editor context. The target is to separate pure QTI composition from supported editor-kit assembly. Per-interaction compose handlers should move into `packages/qti/core` under per-interaction folders instead of remaining inside the ProseMirror interaction packages.

- `packages/extensions`
  -> fold into `packages/qti/editor-kit` unless it becomes a real preset package
  Recommendation:
  remove as a standalone package.

- `packages/qti-editor`
  -> retired
  Notes:
  removed in favor of direct canonical imports from `packages/qti/*`, `packages/prosemirror/*`, and `registry/`.

- `packages/coco`
  -> retired
  Notes:
  removed from the workspace; use `apps/*` and registry scaffolds instead of a bundled single-tag editor surface.

### ProseKit layer

- `registry`
  -> keep as `registry/` with two sub-registries
  Notes:
  use `registry/prosekit-core` for ProseKit-core candidates such as block-handle-style infrastructure. Use `registry/prosekit-ui` for ProseKit-based UI that should remain outside ProseKit itself. Keep one registry package, one registry server, and one published index.

- `packages/lit`
  -> retired
  Notes:
  the remaining compatibility wrapper is removed rather than kept as a public package.

## Source File Move Checklist

### PR 1: establish topology in writing and make workspace ready

- Update `pnpm-workspace.yaml`
  - from `packages/*`
  - to include `packages/*` and `packages/*/*`
- Add this document as the migration source of truth
- Update architecture references that still describe interaction packages as `interactions-qti-*`

### PR 2: canonicalize the ProseMirror utility layer

- Canonical source lives in:
  - `packages/prosemirror/core/src/block-select/*`
  - `packages/prosemirror/core/src/node-attrs-sync/*`
  - `packages/prosemirror/core/src/virtual-cursor/*`
- Canonical imports are:
  - `@qti-editor/prosemirror/block-select`
  - `@qti-editor/prosemirror/node-attrs-sync`
  - `@qti-editor/prosemirror/virtual-cursor`
- Legacy standalone wrapper packages are removed once consumers migrate.

### PR 3: rename the interaction layer to interaction packages

- Move:
  - `packages/prosemirror/interaction-shared` -> `packages/prosemirror/interaction-shared`
  - `packages/prosemirror/interaction-choice` -> `packages/prosemirror/interaction-choice`
  - `packages/prosemirror/interaction-inline-choice` -> `packages/prosemirror/interaction-inline-choice`
  - `packages/prosemirror/interaction-match` -> `packages/prosemirror/interaction-match`
  - `packages/prosemirror/interaction-text-entry` -> `packages/prosemirror/interaction-text-entry`
  - `packages/prosemirror/interaction-extended-text` -> `packages/prosemirror/interaction-extended-text`
  - `packages/prosemirror/interaction-select-point` -> `packages/prosemirror/interaction-select-point`
- Update package names and internal imports
- Update Vite alias files:
  - `apps/editor/vite.config.ts`
- Update app imports
- Leave QTI compose modules in place temporarily if splitting them now would expand scope too far

### PR 4: extract the generic attributes engine

- Move generic attribute selection/update logic out of `packages/core/src/attributes`
- Create:
  - `packages/prosemirror/attributes`
  - `packages/prosemirror/attributes-ui-prosekit`
- Scope the supported UI layer as `attributes-ui-prosekit`
  - richer guided UI with icons, predefined classes, curated choices, and more opinionated ProseKit-oriented affordances
  - keep any generic field-editing base logic internal to that package instead of maintaining a second public UI package
- Keep QTI-specific editable attribute metadata in the QTI layer
- Update consumers in:
  - `packages/qti/editor-kit/src/ui/*` as the canonical first-party runtime surface
  - first-party apps via direct imports from `@qti-editor/qti-editor-kit/ui/*`
  - registry examples by rewriting those package imports during registry build

### PR 5: split QTI composition from editor-kit assembly

- Move composer orchestration and QTI XML logic from `packages/core/src/composer` into `packages/qti/core`
- Move per-interaction compose handlers and related QTI composition metadata out of the ProseMirror interaction packages and into `packages/qti/core` under per-interaction modules
- Move supported editor assembly surfaces from `packages/core/src/interactions`, `packages/core/src/events`, `packages/core/src/code`, `packages/core/src/item-context`, and related extension builders into `packages/qti/editor-kit`
- Reduce `apps/editor` so it consumes package entrypoints instead of acting as an architecture source

This is intentionally a later migration step. Do not do this before:

- ProseMirror utility consolidation is complete
- interaction package renames are complete
- attribute engine extraction has established the new package boundaries

### PR 6: reposition UI scaffolding

- Split `registry/` into `registry/prosekit-core` and `registry/prosekit-ui`
- Add block-handle scaffolds and related upstreamable editor primitives to `registry/prosekit-core`
- Keep code/composer/panel starter UI in `registry/prosekit-ui`
- Remove obsolete Lit compatibility wrappers instead of preserving them as separate packages
- Promote only stable and generic ProseKit surfaces into `packages/prosekit/core` or a future packaged ProseKit editor-kit surface
- Introduce an installed-registry policy for third-party apps that intentionally keep copied scaffold code

### PR 7: remove umbrella packages and finalize consumer surfaces

- `packages/qti-editor` is retired
- `packages/coco` is retired
- Finalize top-level consumer docs around:
  - low-level ProseMirror builder
  - QTI export/composer builder
  - supported editor-kit builder

## Storybook Placement

Storybook should be the primary home for reusable UI, isolated editor behavior, package documentation, and regression fixtures. It should not be the primary home for full app-shell workflows.

### Where stories should live

- `packages/prosemirror/*/src/stories/*`
  Use for interaction package stories and generic ProseMirror utility behavior stories.
- `packages/qti/*/src/stories/*`
  Use for composer and editor-kit stories that exercise QTI-specific package behavior without needing a full app.
- `registry/**`
  Use for copyable ProseKit scaffold stories, especially panels, forms, block handles, and toolbar-related starter UI.
- `packages/prosekit/*/src/stories/*`
  Use for stable reusable ProseKit package surfaces once they graduate out of the registry.
- `apps/*`
  Avoid package-documentation stories here by default. Keep app stories only for app-shell behavior that truly belongs to the app.

### What Storybook should cover

- One story set per interaction package:
  - insertion
  - empty/default state
  - populated state
  - selection/focus behavior where relevant
- Generic ProseMirror utility stories:
  - block select
  - node attrs sync
  - virtual cursor
  - attributes engine behavior once extracted
- Registry UI stories:
  - attributes panel
  - code panel
  - composer panel
  - composer metadata form
  - block handle variants
- Editor preset stories:
  - minimal ProseMirror
  - ProseMirror plus attributes engine
  - ProseKit plus ProseKit attributes UI
  - ProseKit plus registry UI
  - full supported QTI editor-kit assembly
- Attribute UI comparison stories:
  - ProseKit attributes UI with curated choices
  - QTI wrapper policy layered on top of the ProseKit attributes UI
- Build-up documentation stories:
  - start from a bare ProseMirror editor
  - add interaction packages
  - add required styles
  - add block-select
  - add sync-attributes
  - add the attributes engine
  - add the attributes panel
  - add code/composer panels
  - add optional ProseKit integration pieces
- Regression stories:
  - block selection across custom elements/slotted content
  - conversion between paragraph/list/interaction states
  - selection preservation around popovers and dialogs
  - insert-at-cursor behavior
  - tricky serialization-facing node rendering cases

### Storybook configuration change implied by this plan

The current Storybook config should discover stories from:

- `packages/**/src/**/*.stories.@(js|jsx|mjs|ts|tsx)`
- `registry/**/**/*.stories.@(js|jsx|mjs|ts|tsx)`

App stories should be opt-in rather than the default documentation surface.

### Storybook as editor-building documentation

Storybook should become the primary documentation surface for "how to create an editor" in this repository.

That documentation should explain:

- which scaffolded examples exist
- what each example includes and does not include
- how to scaffold an example into a consumer project
- how to build up an editor from scratch one layer at a time

The Storybook information architecture should include:

- `Docs/Getting Started`
  - overview of the available editor-building layers
  - when to use raw ProseMirror, QTI core, registry UI, or ProseKit surfaces
- `Docs/Scaffolds`
  - installable scaffold examples exposed through the registry
  - description of what each scaffold gives you
  - commands or registry install steps needed to scaffold them
- `Docs/Build Your Editor`
  - step 1: create a minimal ProseMirror editor
  - step 2: add interaction packages
  - step 3: add styles
  - step 4: add block-select
  - step 5: add sync-attributes
  - step 6: add the attributes engine
  - step 7: add the attributes panel
  - step 8: add code/composer panels
  - step 9: optionally add ProseKit-oriented pieces
- `Docs/Presets`
  - minimal ProseMirror preset
  - ProseMirror with attributes preset
  - ProseKit with ProseKit attributes UI preset
  - ProseKit with registry UI preset
  - full supported QTI editor-kit preset
- `Docs/Attributes UI`
  - how the ProseKit attributes UI consumes the shared attributes engine and metadata
  - how the QTI wrapper layers policy on top

Storybook may and should run many simplified scaffold-style examples for testing and documentation purposes. These do not need to remain full standalone apps as long as they are:

- isolated enough to demonstrate one assembly step clearly
- stable enough to serve as regression fixtures
- documented well enough to show consumers what to scaffold next

## Registry Scaffolds

Example presets should move conceptually closer to the registry model.

Instead of treating example presets only as runnable apps, the target model should allow selected examples to be installed as copyable scaffolds, similar to shadcn-style registry items.

Recommended registry scaffold categories:

- `registry/prosekit-ui/scaffolds/prosemirror-minimal`
- `registry/prosekit-ui/scaffolds/prosemirror-attributes`
- `registry/prosekit-ui/scaffolds/prosemirror-attributes-prosemirror-ui`
- `registry/prosekit-ui/scaffolds/prosekit-attributes-prosekit-ui`
- `registry/prosekit-ui/scaffolds/prosekit-full`

Each scaffold should document:

- intended use case
- included packages
- included registry components
- required styles
- optional follow-up additions

Each scaffold should also map back to a Storybook docs page that explains:

- what files are installed
- how the pieces are wired together
- how to extend the scaffold safely

When a scaffold is installed into an app, the installed files should remain visibly identified as registry-derived code. The default assumption should be:

- unmodified installed files are local copies of shared scaffolds
- modified files must be marked as intentional forks if they diverge from the shared source

### Example role after this change

Standalone example apps are intentionally removed. The same knowledge should live in Storybook docs and installable registry scaffolds instead.

Target split:

- Storybook:
  primary documentation, guided build-up path, and simplified scaffold-style regression presets
- Registry:
  copyable scaffold distribution
- Apps:
  the main supported integration surface

## Test Strategy

This project should use both unit tests and integration tests. Storybook should cover visual and interaction regressions, but it should not replace executable tests for commands, schema parsing, or XML composition.

### Unit tests

Put unit tests next to the source file they verify:

- `packages/prosemirror/*/src/**/*.test.ts`
- `packages/qti/*/src/**/*.test.ts`
- `packages/prosekit/*/src/**/*.test.ts` when package logic justifies it

Unit tests should cover:

- ProseMirror utility packages
  - plugin state transitions
  - command return values
  - transaction generation
  - selection logic
- Interaction packages
  - node spec parsing and serialization
  - insertion commands
  - local helper functions
  - attribute defaults and normalization
- QTI core
  - composer helper functions
  - per-interaction compose handlers
  - response declaration generation
  - identifier normalization
  - XML formatting helpers
- QTI editor-kit
  - metadata registry lookup
  - extension builder composition logic
  - event payload shaping where isolated testing is possible

### Integration tests

Use integration tests for behaviors that only make sense when multiple pieces run together.

Recommended locations:

- `packages/prosemirror/*/src/**/*.integration.test.ts`
- `packages/qti/*/src/**/*.integration.test.ts`
- `apps/*` only for thin smoke coverage of app-specific shell behavior

Integration tests should cover:

- Interaction insertion into a real `EditorState`
- Interaction plus shared node schema compatibility
- Attributes engine updating selected node attrs through transactions
- QTI composer producing expected XML from realistic ProseMirror documents
- Editor-kit extension wiring emitting the expected events and detail payloads
- Registry components reacting correctly to emitted events when they contain real logic beyond rendering

### What should not be app tests by default

- Interaction command behavior
- Schema parsing/serialization
- Composer logic
- Generic ProseMirror plugin behavior
- Generic panel state logic

Those belong in package tests so apps do not become the architecture source.

### Initial high-value tests to add

1. `packages/prosemirror/core`
   Add tests for block-select, node-attrs-sync, and virtual-cursor behavior at the plugin level.
2. `packages/prosemirror/interaction-choice`
   Add command and schema tests similar to the existing select-point coverage.
3. `packages/prosemirror/interaction-inline-choice`
   Add schema and insertion tests.
4. `packages/prosemirror/interaction-text-entry`
   Add schema and insertion tests.
5. `packages/qti/core`
   Add integration tests that build realistic ProseMirror docs and assert the generated XML, response declarations, and per-interaction composition behavior.
6. `packages/qti/editor-kit`
   Add tests for metadata registry lookups and extension/event wiring.
7. `registry/prosekit-ui`
   Prefer Storybook stories first; add tests only where components contain meaningful state/event logic.

### Practical split between tests and stories

- Use unit tests for correctness of data transformations, commands, plugin behavior, and serialization.
- Use integration tests for cross-package contracts and editor-state workflows.
- Use Storybook for visual states, interactive regressions, and package documentation.
- Use app-level smoke tests sparingly, only when the behavior is truly app-specific.

## First PR Boundaries

### PR 1
Scope:
- documentation only
- workspace pattern prep

Files likely touched:
- `docs/architecture.md`
- `docs/package-topology-plan.md`
- `pnpm-workspace.yaml`

Do not include:
- package renames
- import rewrites
- source moves

### PR 2
Scope:
- ProseMirror utility consolidation only

Files likely touched:
- `packages/prosemirror/**`
- `packages/prosemirror-block-select/**`
- `packages/prosemirror-node-attrs-sync/**`
- `packages/prosemirror-virtual-cursor/**`
- direct consumers in apps and stories

Do not include:
- interaction package renames
- attribute engine extraction
- QTI composer splitting

### PR 3
Scope:
- interaction package rename to `item-*`
- import surface compatibility

Files likely touched:
- `packages/interactions-*`
- `packages/prosemirror/item-*`
- `packages/prosemirror/interaction-*`
- `packages/core/**` imports only where needed
- app imports
- Vite alias files

Do not include:
- deep composer redesign
- new attributes engine

## Validation Order

Run the narrowest useful checks first.

For PR 2:
  - `pnpm --filter @qti-editor/prosemirror build`
  - `pnpm --filter @qti-editor/app build`

For PR 3:
- build each moved item package
- `pnpm --filter @qti-editor/core build`
- `pnpm --filter @qti-editor/app build`
- app builds that import moved packages

For later PRs:
- `pnpm -r --filter "./packages/**" run build`
- `pnpm lint:check`

## Immediate Decisions Locked By This Plan

- Interaction authoring packages are part of the ProseMirror layer, not the QTI layer.
- `item-*` is the canonical naming family for those packages.
- QTI-specific logic starts at composition/export and editor-kit assembly.
- ProseKit owns scaffolding and integration UI, not the canonical domain model.

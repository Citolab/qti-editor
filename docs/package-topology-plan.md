# Package Topology Plan

This plan reflects the current OpenStatus-style structure in this repository.

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

`packages/prosemirror/*`
- Generic ProseMirror plugins and utilities.
- ProseMirror-native primitives that may also expose sibling `.../prosekit` adapter entrypoints.

`packages/qti/core`
- QTI composition and XML semantics.
- Interaction composition modules and response declaration logic.

`packages/qti/editor-kit`
- Non-UI runtime/editor assembly surfaces.
- Event contracts, item context, extension builders, and helpers used by first-party apps.

`packages/ui`
- Canonical source for copyable UI and registry items.
- Vendored ProseKit/shadcn-style UI dependencies in `src/components/editor/ui/*`.
- QTI-facing and app-facing blocks in `src/components/blocks/*`.
- Registry metadata/build flow (`registry.json`, transform/build scripts).

`apps/editor`
- Real integration app and smoke surface.
- Consumes package APIs directly (especially `@qti-editor/ui/*`) instead of app-local copied registry source.

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

# Editor Scaffolds

This repository supports three different ways to learn and assemble editors:

- Storybook
  The primary documentation surface for building an editor step by step.
- Registry
  The installable scaffold surface for copyable editor pieces and starter examples.
- Apps
  Runnable demos and playgrounds for realistic end-to-end integration.

## How To Use These Surfaces

Use Storybook when you want to understand:

- which editor-building layers exist
- which scaffold to start from
- how to build an editor from scratch
- what each panel, extension, and utility does in isolation

Use the registry when you want to install:

- copyable ProseKit-oriented UI pieces
- starter scaffolds similar to shadcn-style installs
- editor examples that you want to own and customize in your own project

Use the apps when you want to:

- run a full editor locally
- inspect realistic wiring across packages
- test product-like workflows and integration behavior

## Scaffold Matrix

The long-term target is to expose editor examples as installable scaffolds, with matching Storybook documentation and runnable app variants.

| Scaffold | Engine | UI Source | Includes |
| --- | --- | --- | --- |
| `prosemirror-minimal` | Pure ProseMirror | Minimal local UI | Core editor, interaction packages, insert actions |
| `prosemirror-attributes` | Pure ProseMirror | Registry UI | Attributes engine, attributes panel, code panel, composer panel |
| `prosekit-full` | ProseKit | Registry UI + ProseKit integration | Full supported editor assembly with panels and ProseKit-facing pieces |

These scaffolds should be represented in three places:

- Storybook docs pages that explain how they are built
- Registry entries that allow consumers to scaffold them into a project
- Runnable apps that demonstrate the same integration in a live environment

## Storybook Documentation Path

Storybook should document how to build an editor in stages.

Recommended build-up path:

1. Start with a bare ProseMirror editor.
2. Add the interaction packages.
3. Add the required styles.
4. Add `block-select`.
5. Add `sync-attributes`.
6. Add the generic attributes engine.
7. Add the attributes panel.
8. Add code and composer panels.
9. Add optional ProseKit-oriented integration pieces.

Storybook should also document:

- which scaffold to choose
- what each scaffold includes
- what files a scaffold installs
- how to extend a scaffold safely after installation

## Registry Scaffolds

The registry should eventually expose cookbook-style scaffolds so consumers can install a starter example instead of manually copying app code.

Target scaffold areas:

- `registry/prosekit-ui/scaffolds/prosemirror-minimal`
- `registry/prosekit-ui/scaffolds/prosemirror-attributes`
- `registry/prosekit-ui/scaffolds/prosekit-full`

Each scaffold should describe:

- intended use case
- included packages
- included registry components
- required styles
- optional next steps

## Runnable Apps

Apps remain useful, but they are no longer the primary documentation surface.

Their role is to provide:

- live playgrounds
- realistic integration references
- end-to-end authoring flows
- development and debugging environments

Current runnable app variants:

| App | Role |
| --- | --- |
| `@qti-editor/cookbook-prosemirror-minimal` | Minimal ProseMirror demo |
| `@qti-editor/cookbook-prosemirror-context-attrs` | ProseMirror demo with QTI context and panels |
| `@qti-editor/cookbook-prosekit-full` | ProseKit-based full integration demo |

## Run Commands

```sh
pnpm --filter @qti-editor/cookbook-prosemirror-minimal dev
pnpm --filter @qti-editor/cookbook-prosemirror-context-attrs dev
pnpm --filter @qti-editor/cookbook-prosekit-full dev
```

Build checks:

```sh
pnpm --filter @qti-editor/cookbook-prosemirror-minimal build
pnpm --filter @qti-editor/cookbook-prosemirror-context-attrs build
pnpm --filter @qti-editor/cookbook-prosekit-full build
```

## Direction

The target repository model is:

- Storybook for guided editor-building documentation
- Registry for installable scaffolds and copyable UI
- Packages for the real reusable architecture
- Apps for runnable demos and integration playgrounds

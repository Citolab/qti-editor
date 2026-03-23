# Editor Scaffolds

This repository now uses two primary surfaces for learning and assembling editors:

- Storybook
  The primary documentation surface for building an editor step by step.
- Registry
  The installable scaffold surface for copyable editor pieces and starter examples.

The main editor app remains the realistic integration surface, but standalone example apps are no longer a maintained product surface.

## How To Use These Surfaces

Use Storybook when you want to understand:

- which editor-building layers exist
- how to build an editor from scratch
- what each panel, extension, and utility does in isolation
- how ProseMirror-native primitives relate to ProseKit-first assembly

Use the registry when you want to install:

- copyable ProseKit-oriented UI pieces
- starter scaffolds similar to shadcn-style installs
- editor examples that you want to own and customize in your own project

Use the main app when you want to:

- run the supported end-to-end editor
- inspect realistic wiring across packages
- test product-like workflows and integration behavior

## Storybook Documentation Path

Storybook should document how to build an editor in stages.

Recommended build-up path:

1. Start with a bare ProseMirror editor.
2. Add the interaction packages.
3. Add the required styles.
4. Add `block-select`.
5. Add `sync-attributes`.
6. Add the generic attributes engine.
7. Add the ProseKit-oriented attributes panel.
8. Add code and composer panels.
9. Add supported QTI editor-kit assembly.

Storybook should also document:

- which scaffold to choose
- what each scaffold includes
- what files a scaffold installs
- how to extend a scaffold safely after installation

## Registry Scaffolds

The registry should expose installable scaffolds so consumers can install a starter example instead of manually copying app code.

Target scaffold areas:

- `packages/ui/src/components/blocks/*` as installable registry blocks
- `packages/ui/src/components/editor/ui/*` for vendored ProseKit-shaped UI dependencies
- `packages/ui/registry.json` as the single registry index

Each scaffold should describe:

- intended use case
- included packages
- included registry components
- required styles
- optional next steps

## Direction

The target repository model is:

- Storybook for guided editor-building documentation and regression presets
- Registry for installable scaffolds and copyable UI
- Packages for the reusable architecture
- The main editor app for realistic end-to-end integration

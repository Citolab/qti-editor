# Interactions Package Architecture

## Purpose
This document defines package-local architecture rules for `@qti-editor/interactions`.

## Command Helpers
- Reusable key/command helpers belong in `src/commands/`.
- Keep helpers primitive and composable (for example: ancestor-aware insert helpers).
- Avoid overlapping convenience wrappers when a single primitive plus local callbacks is enough.
- Interaction-specific command files should stay thin and configure shared helpers.
- Shared insertion helpers in `src/commands/insert.ts` should prevent splitting interaction internals when adding block interactions from inside existing interactions.

## Enter Behavior
- `Enter` behavior that differs per interaction must be implemented as command chains.
- Preferred pattern:
  1. interaction-specific command (returns `false` outside its context)
  2. fallback command (for example `splitBlock`)
- Export chained commands from the interaction command module and bind them in core keymaps.

## Insertion Semantics
- Inserting interactions from inside existing interactions should not split interaction internals.
- Prefer inserting a new interaction as a sibling block after the current interaction ancestor.
- Keep this behavior in shared command helpers so toolbar/keyboard paths stay consistent.

## Ownership
- `src/components/**`: interaction-specific schema, commands, custom elements.
- `src/commands/**`: shared ProseMirror command utilities for interactions.
- `src/composer/**`: XML composition metadata/handlers for interactions.

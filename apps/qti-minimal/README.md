# qti-minimal

A barebones ProseKit editor with QTI interactions wired up. No opinionated layout, no application shell — just the editor primitives working together.

## Purpose

- **Inspiration** — a readable starting point for building your own QTI editor without the noise of the full-featured app
- **Testing ground** — a clean environment to verify interaction behaviour, schema changes, or plugin work in isolation

## Running

```bash
pnpm dev
```

## What's included

| Feature | Implementation |
|---|---|
| Rich text editing | ProseKit + ProseMirror |
| QTI interactions | `qti-choice-interaction`, `qti-extended-text-interaction` (configurable) |
| Toolbar | `<lit-editor-toolbar>` |
| Attributes panel | `<qti-attributes-panel>` |
| Metadata form | `<qti-composer-metadata-form>` |
| XML / QTI export | `xmlFromNode`, `qtiFromNode` |
| XML round-trip | Load XML back into the editor via `xmlToHTML` + `jsonFromHTML` |

## Limiting interactions

The app passes an `include` filter to `defineQtiInteractionsExtension`. To add or remove interactions, edit the list in [src/qti-minimal-app.ts](src/qti-minimal-app.ts):

```ts
defineQtiInteractionsExtension({
  include: ['qti-choice-interaction', 'qti-extended-text-interaction']
})
```

Omit the `include` option entirely to load all registered interactions.

## Key files

| File | Role |
|---|---|
| [src/qti-minimal-app.ts](src/qti-minimal-app.ts) | Root Lit component — editor setup, XML I/O, layout |
| [src/extensions/basic-extension.ts](src/extensions/basic-extension.ts) | Core ProseKit extension (marks, nodes, keymap) |
| [src/extensions/qti-extension.ts](src/extensions/qti-extension.ts) | Assembles QTI interactions via the descriptor registry |

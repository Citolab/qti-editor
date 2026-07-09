# Editor Scaffolds

This repository's primary surface for learning and assembling editors is:

- **Storybook** — documentation surface for building an editor step by step

The main editor app (`apps/qti-prosekit-app`) remains the realistic integration surface.

(`packages/prose-qti-ui` also ships an installable, shadcn-style registry of copyable UI pieces, but it's an in-house build/scaffolding tool rather than a documented product surface — see "Registry Scaffolds" below for the raw build commands.)

## Reference Apps

| App | Description |
|-----|-------------|
| `apps/qti-prosekit-app` | Full editor with Firebase, React panels, full toolbar. Runs via `pnpm dev`. |
| `apps/qti-prosekit-item` | Minimal ProseKit + QTI example. Best starting point for new integrations. |
| `apps/qti-prosemirror-item` | Raw ProseMirror with QTI roundtrip. No ProseKit. Installs `@citolab/prose-qti`/`@citolab/prose-extensions` as pinned npm ranges rather than `workspace:*`, so it also exercises the packages the way an external consumer would. |
| `apps/site` | Astro documentation site. |

## How To Use These Surfaces

Use **Storybook** when you want to understand:
- which editor-building layers exist
- how to build an editor from scratch
- what each panel, extension, and utility does in isolation
- how ProseMirror-native primitives relate to ProseKit-first assembly

Use **`apps/qti-prosekit-app`** when you want to:
- run the supported end-to-end editor
- inspect realistic wiring across packages
- test product-like workflows and integration behavior

Use **`apps/qti-prosekit-item`** when you want to:
- see the minimal setup for a ProseKit + QTI editor
- understand the descriptor-based extension assembly pattern

## Storybook Documentation Path

Storybook should document how to build an editor in stages:

1. Start with a bare ProseMirror editor.
2. Add the interaction packages via the descriptor registry.
3. Add the required styles: `@qti-components/theme` for the underlying QTI web components plus the mandatory `@citolab/prose-qti/core-css.css` for editor-specific element backgrounds, spacing, and affordances.
4. Add the `blockSelectExtension` and `nodeAttrsSyncExtension` ProseKit extensions from `@citolab/prose-extensions/prosekit-extensions` (requires the `prosekit` peer dependency; the underlying plugins are also available prosekit-free from `@citolab/prose-extensions/block-select` and `@citolab/prose-extensions/node-attrs-sync`).
5. Add the QTI attributes panel: `<qti-attributes-panel>` from `@citolab/prose-qti-ui/components/attributes-panel`, wired to the editor via `editorContext` from `@citolab/prose-qti-ui/editor-context`. It resolves each selected node's fields via `getNodeAttributePanelMetadataByNodeTypeName` (`@citolab/prose-qti/core/interactions/composer`), falling back to a per-node "friendly editor" (`choice-attributes-editor`, `text-entry-attributes-editor`, `extended-text-attributes-editor`, `rubric-block-attributes-editor`) when one is registered for that node type.
6. Add code and composer panels.
7. Wire QTI integration surfaces from `@citolab/prose-qti/integration/*`.

For step 7, use the integration exports directly. `prosekit` is an optional peer dependency of `@citolab/prose-qti`, so `events`, `code`, and `interactions/prosekit` are published as their own subpaths rather than re-exported from `@citolab/prose-qti/integration` — importing the bare barrel must not force-evaluate `prosekit/core` for consumers who don't have it installed:

```ts
import { createEditor, union } from 'prosekit/core';
import { qtiEditorEventsExtension } from '@citolab/prose-qti/integration/events';
import { qtiCodePanelExtension } from '@citolab/prose-qti/integration/code';
import { itemContext } from '@citolab/prose-qti/integration/item-context';
import { defineQtiInteractionsExtension } from './extensions/qti-extension'; // assembled in app

const editor = createEditor({
  extension: union(
    defineBasicExtension(),
    defineQtiInteractionsExtension(),
    qtiEditorEventsExtension({ eventTarget: myTarget }),
    qtiCodePanelExtension({ eventTarget: myCodeTarget }),
  ),
});
```

`defineQtiInteractionsExtension` is assembled in the app from the descriptor registry — see `apps/qti-prosekit-item/src/extensions/qti-extension.ts` for the canonical pattern. It uses `listInteractionDescriptors()` and `listInteractionSchemaNodeSpecs()` from `@citolab/prose-qti/core/interactions/composer` to build node spec extensions and a keymap automatically.

## Registry Scaffolds (internal)

`packages/prose-qti-ui` exposes installable UI components through an in-house registry. Build and serve locally:

```sh
pnpm registry:build
pnpm registry:serve
```

The registry source lives in `packages/prose-qti-ui/src/components/`, with a `registry.json` index. Components include:
- `attributes-panel` — generic QTI attributes panel
- `choice-attributes-editor` — choice interaction editor
- `text-entry-attributes-editor` — text entry editor
- `extended-text-attributes-editor` — extended text editor
- `interaction-insert-menu` — interaction insertion UI

## Direction

The target repository model is:
- Storybook for guided editor-building documentation and regression presets
- Packages (`@citolab/prose-qti`, `@citolab/prose-extensions`) for the reusable architecture
- `apps/qti-prosekit-app` for realistic end-to-end integration
- `packages/prose-qti-ui`'s registry remains an internal scaffolding tool, not a documented product surface

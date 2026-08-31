# Editor Scaffolds

This repository's primary surface for learning and assembling editors is:

- **Storybook** — documentation surface for building an editor step by step

The full editor application lives in its own repository (`qti-editor-full-assessment`) and consumes
these packages from npm. It remains the realistic integration surface, but it is no longer something
you can run from this checkout.

## Reference Apps

| App | Description |
|-----|-------------|
| `apps/qti-prosemirror-item` | Raw ProseMirror with QTI roundtrip. No ProseKit. Runs via `pnpm dev`. Installs `@citolab/prose-qti`/`@citolab/prose-extensions` as pinned npm ranges rather than `workspace:*`, so it also exercises the packages the way an external consumer would. |
| `apps/site` | Astro documentation site. |

## How To Use These Surfaces

Use **Storybook** when you want to understand:
- which editor-building layers exist
- how to build an editor from scratch
- what each panel, extension, and utility does in isolation
- how ProseMirror-native primitives relate to ProseKit-first assembly

Use **`apps/qti-prosemirror-item`** when you want to:
- see the minimal setup for a QTI editor without ProseKit
- exercise the packages the way an external consumer would (it installs them as pinned npm ranges,
  not `workspace:*`)

Use the **extracted editor repository** when you want to:
- run the supported end-to-end editor
- inspect realistic wiring across packages
- test product-like workflows and integration behavior

## Storybook Documentation Path

Storybook should document how to build an editor in stages:

1. Start with a bare ProseMirror editor.
2. Add the interaction packages via the descriptor registry.
3. Add the required styles. Import `@citolab/prose-qti/qti-prose.css` for the underlying QTI web component theme plus the mandatory editor-specific element backgrounds/spacing/affordances in one file (order-sensitive; don't split it back into its two source stylesheets). Apps in this repo instead import `@qti-components/theme` and `@citolab/prose-qti/core-css.css` directly, in that order, since they already depend on `@qti-components/theme` for their own styling.
4. Build your host schema from `@citolab/prose-qti/schema` (`qtiBasicNodes` / `qtiBasicMarks`) instead of importing `prosemirror-schema-basic` directly. This keeps QTI image dimensions (`width`/`height`) intact across XML import and PM roundtrip and gives an explicit place to trim non-QTI baseline nodes.
5. Add the `blockSelectExtension` and `nodeAttrsSyncExtension` ProseKit extensions from `@citolab/prose-extensions/prosekit-extensions` (requires the `prosekit` peer dependency; the underlying plugins are also available prosekit-free from `@citolab/prose-extensions/block-select` and `@citolab/prose-extensions/node-attrs-sync`).
6. Add an attributes panel. The panel and its per-node "friendly editors" are **application-owned**
   UI — they used to live in a `prose-qti-ui` package here, which has been retired; the extracted
   editor app now owns that source outright. What this repository provides is the metadata the panel
   renders from: `getNodeAttributePanelMetadataByNodeTypeName`
   (`@citolab/prose-qti/core/interactions/composer`) resolves each selected node's editable fields.
7. Add code and composer panels.
8. Wire QTI integration surfaces from `@citolab/prose-qti/integration/*`.

For step 8, use the integration exports directly. `prosekit` is an optional peer dependency of `@citolab/prose-qti`, so `events`, `code`, and `interactions/prosekit` are published as their own subpaths rather than re-exported from `@citolab/prose-qti/integration` — importing the bare barrel must not force-evaluate `prosekit/core` for consumers who don't have it installed:

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

`@citolab/prose-qti/integration/interactions/prosekit` ships `defineQtiInteractionsExtension()` and
`defineQtiExtension()` covering every registered interaction — reach for those first. To assemble a
curated subset yourself, use `listInteractionSchemaNodeSpecs({ include })` and
`listSelectedInteractionPluginFactories({ include })` from
`@citolab/prose-qti/core/interactions/composer`, which build node spec extensions and a keymap
automatically.

## Direction

The target repository model is:
- Storybook for guided editor-building documentation and regression presets
- Packages (`@citolab/prose-qti`, `@citolab/prose-extensions`) for the reusable architecture
- `apps/qti-prosemirror-item` as the in-repo integration example
- the extracted editor repository for realistic end-to-end integration

# QTI Editor Architecture

## Purpose

This document is the canonical architecture reference for this repository.

Its job is to keep the package structure stable as the codebase grows, especially when new code is scaffolded with AI. Before adding files, use this document to decide:

- whether the code belongs in `apps/*`
- whether it belongs in a reusable package
- which package layer owns it

If a generated change cannot be placed clearly using this document, stop and resolve the ownership question before writing more code.

## Core Rule

`apps/*` are examples, demos, the docs site and cross-package tests. **The main editor application
is no longer here** — it was extracted to its own repository (`qti-editor-full-assessment`) and
consumes these packages from npm. This repository is packages-first.

They are not the source of truth for reusable behavior, domain logic, editor primitives, or QTI composition logic.

When in doubt, prefer putting reusable logic in a package and letting the app consume it.

## Current Package Structure

```text
packages/
  prose-qti/           ← @citolab/prose-qti   (QTI core + interactions + integration)
  prose-qti-node/      ← @citolab/prose-qti-node  (Node-only re-bundle of prose-qti's conversion API)
  prose-extensions/    ← @citolab/prose-extensions  (generic ProseMirror/ProseKit extensions)
  prose-ai/            ← @citolab/prose-ai  (private, AI extensions vendored from @prosekit/ai)

apps/
  qti-example-editor/  ← @qti-editor/prosemirror-item  (raw ProseMirror example)
  site/                ← @qti-editor/site  (Astro documentation site)
  e2e/                 (end-to-end tests)
```

## Layer Ownership

### `packages/prose-qti` (`@citolab/prose-qti`)

The main QTI package. Contains all QTI-specific logic and the integration layer for ProseKit.

`src/interfaces/` owns:
- Shared TypeScript contracts with no runtime dependencies
- `InteractionDescriptor` — the registration unit every interaction implements
- `InteractionNodeSpecEntry` — node spec entries within a descriptor
- `NodeAttributePanelMetadata`, `AttributeFieldDefinition`, `AttributeFieldOption`, `AttributeFriendlyEditorDefinition` — unified attribute panel types
- Composer types: `InteractionComposerMetadata`, `InteractionComposerHandler`, `InteractionComposeResult`, `ResponseProcessingKind`, `ComposerWarning`

`src/components/*` owns (one directory per interaction type):
- ProseMirror node specs, insert commands, enter commands
- Node views and authoring behavior
- Per-interaction QTI compose handler and metadata
- Per-interaction attribute panel metadata
- A `descriptor.ts` exporting a single object that `satisfies InteractionDescriptor`

Interaction components: `choice`, `extended-text`, `gap-match`, `hottext`, `inline-choice`, `match`, `order`, `rubric-block`, `select-point`, `text-entry`, plus `shared/` for cross-interaction schemas and helpers.

`src/components/shared/context/correction-context.ts` publishes a per-interaction `@lit/context` (`correctionContext`) carrying the answer key (`CorrectionLink[]`) plus derived role/label/limit/pending lookups. The drag-drop interactions (gap-match, match, order) provide it on their host element and their children subscribe to paint their own `:state(selected)`/`:state(linked)`/`:state(pending)` and labels, instead of the interaction sweeping and repainting its children on every change. `src/components/shared/extensions/chip-menu.ts` and `selection-menu.ts` are the ProseKit plugins built on top of it: clicking a placed chip opens a small popover (labelled via i18n, not an icon) that re-dispatches `dummy-drag-remove`, and a plugin instance is safe to contribute once per interaction descriptor because activation events are deduped.

`src/core/` owns:
- Descriptor registry: `listInteractionDescriptors()` — canonical list of all registered interactions
- Derived lookup helpers: `listInteractionSchemaNodeSpecs`, `listSelectedInteractionPluginFactories`, etc.
- XML composition engine, response declarations, identifier normalization
- Composer orchestration that drives per-interaction compose handlers via descriptors

`src/integration/` owns. `prosekit` is an optional peer dependency of this package, and `src/integration/index.ts` is reachable from the package root, so the barrel re-exports only the prosekit-free surfaces; the prosekit-dependent surfaces (`events`, `code`, `interactions/prosekit`) are published as their own subpaths and must be imported directly:
- `events` (subpath only, not re-exported from `./integration`) — `qtiEditorEventsExtension`, `onQtiContentChange`, `onQtiSelectionChange`
- `code` (subpath only, not re-exported from `./integration`) — `qtiCodePanelExtension`
- `item-context` (re-exported from `./integration`) — `itemContext`, `ItemContext`, `itemContextVariables`
- `save-xml` (re-exported from `./integration`) — `xmlFromNode`, `xmlToHTML`
- `save-qti-item` (re-exported from `./integration`) — `qtiItemFromProsemirror`
- `interactions/prosekit` (subpath only, not re-exported from `./integration`) — `defineQtiInteractionsExtension`, `defineQtiExtension`, `registerQtiInteractionElements` (deprecated no-op kept for backwards compatibility)
- Shared document types: `QtiDocumentJson`, `QtiNodeJson` (re-exported from `./integration`)

`src/item-export/`, `src/item-roundtrip/`, `src/qti3-item-import/` own QTI serialization and import transforms. `editorContext`/`qtiEditorContext` and multi-item/package-building support were moved out of this package and now live in the consuming application — this package's export surface is single-item only.

`src/core-css/core-css.css` — the mandatory stylesheet for rendering the editor's PM document, published as the `./core-css.css` subpath (`@citolab/prose-qti/core-css.css`). It is a compatibility entry point that `@import`s two split source files kept separate for review: `core-layout.css` (mandatory structural fixes — interaction backgrounds/spacing, the rubric-block boundary, the ProseKit placeholder fix) and `editor-states.css` (editor-only `:state(...)` hooks for gaps, choices and the order interaction — `pending`, `selected` and `linked` are the states this package owns, since they are affordances the runtime has no reason to know about; `drag`, `checked` and `disabled` stay qti-theme's. Only `pending` currently paints anything; `selected` and `linked` are documented but deliberately left unpainted until a rule for them is reviewed). Every app that renders the editor must import `core-css.css` alongside `@qti-components/theme`; nothing outside this package imports the two source files directly.

`src/qti-prose.css` — bundles `@qti-components/theme/item.css` then `core-css.css`, in that order, published as the `./qti-prose.css` subpath (`@citolab/prose-qti/qti-prose.css`). The order is load-bearing: a CSS cascade layer's position is fixed by its first mention, and `item.css` is what declares the whole layer order, so it must load first or `core-css.css` creates its override layer too early and silently loses the cascade. `@qti-components/theme` is a dependency of this package (via the catalog) specifically so this bundle resolves without the consumer declaring it. A host that only wants one stylesheet import (and never wants to know which `qti-components` build the editor is pinned to) imports this instead of the two files separately; a brand overlay still goes after it. Apps in this repo keep importing `@qti-components/theme` and `core-css.css` directly, since they already sit next to the catalog.

`src/transformers.ts` — re-exports all of `@qti-components/transformers` (`qtiTransformItem`, `qtiTransformTest`, …) under the `./transformers` subpath (`@citolab/prose-qti/transformers`), so a consuming host names only `@citolab/prose-qti` and never pins `@qti-components/transformers` itself.

`src/schema/` owns shared ProseMirror base-schema primitives for QTI hosts:
- `qtiBasicNodes` / `qtiBasicMarks` (`@citolab/prose-qti/schema`) are the canonical QTI-focused replacement for direct `prosemirror-schema-basic` usage in this repo.
- The `image` node in this module preserves `width` and `height` attributes on parse/serialize so QTI XML image dimensions survive import and roundtrip.
- Nothing is removed from the basic set. A `createQtiBasicNodes(...)` helper used to offer trimming and defaulted to dropping `blockquote`; it had no callers and its premise was wrong — QTI permits `blockquote`, `hr`, `pre` and `code` in an item body. A host wanting a narrower document builds its own `nodes` object.
- `qtiLayoutDivNodeSpec` (included in `qtiBasicNodes.qtiLayoutDiv`) models the author-written `<div class="qti-layout-row">`/`-colN` grid wrappers; `qtiLayoutDivLockPlugin` is the accompanying opt-in plugin that stops a transaction from adding or removing a wrapper, since nothing in either host editor can author a new one. Both used to live duplicated across the two host apps and moved here for the same reason `qtiBasicNodes` did — one definition instead of two that drift. The spec also sets `allowGapCursor: true`, since a `block+` content model's default-type heuristic (used by `prosemirror-gapcursor` to decide whether a position is reachable) picks the first admitted type with no required attributes, which is never a textblock here — without the override, two block interactions sitting side by side inside a `qti-layout-row` have no writable space between them.
- `paste-rescue.ts` (`qtiPasteRescuePlugin`, opt-in) fixes pasting two or more blocks into a slot that holds exactly one (`qtiSimpleChoice`, `qtiPrompt`, `qtiSimpleAssociableChoice`): left to ProseMirror's own fitter, that splits one interaction into two sharing a `responseIdentifier` rather than erroring, since `isolating: true` is not consulted for the frontier the fitter closes and reopens. The plugin runs in `transformPasted`, after `parseDOM` and after any semantic-paste plugin's `transformPastedHTML`, and asks the schema itself (`contentMatch.matchType`) whether the target already accepts more than one block rather than naming interactions, so a widened content model silently stops being rescued instead of needing to be un-special-cased. See `paste-rescue.browser.test.ts` for the fan-out (repeating slot) vs. join (non-repeating slot) cases.

### `packages/prose-qti-node` (`@citolab/prose-qti-node`)

Published package. Re-bundles `prose-qti`'s six Node conversion functions (`qti3ToPm`, `pmToQti3`, `htmlToPm`, `pmToHtml`, `validateHtml`, `schemaToJson`) and `createQtiSchema` for plain Node, with a manifest sized for that: `linkedom` plus three `prosemirror-*` packages as dependencies, `prosemirror-model`/`prosemirror-state`/`prosemirror-commands` as peers, and no `@qti-components/*` or `lit`. See [node-api.md](node-api.md).

Built by `scripts/bundle-node.mjs`, which esbuild-bundles `prose-qti`'s `dist/node/index.js` (not `src/`, since Lit's decorators do not survive a generic transpiler) with the ProseMirror packages kept external. Its `workspace:*` devDependency on `@citolab/prose-qti` is what orders `pnpm -r --sort` so that dist exists first.

Does not own conversion logic — that stays in `packages/prose-qti/src/node/`. This package only owns the bundling and the manifest split that keeps a Node-only consumer from installing the browser component graph.

### `packages/prose-extensions` (`@citolab/prose-extensions`)

Generic ProseMirror and ProseKit extensions with no QTI-specific logic. `prosekit` is an optional peer dependency (`peerDependenciesMeta.prosekit.optional: true`) — feature subpaths (e.g. `./block-select`, `./node-attrs-sync`) export only plain ProseMirror plugins and never import `prosekit`, so raw-ProseMirror consumers don't need it installed.

Owns:
- `src/prosemirror/block-select` — block selection plugin
- `src/prosemirror/node-attrs-sync` — node attribute synchronization
- `src/prosemirror/paste-semantic-html` — paste HTML handling
- `src/prosemirror/prosekit-extensions.ts` — ProseKit extension wrappers (`blockSelectExtension`, `nodeAttrsSyncExtension`, `defineSemanticPasteExtension`) for the plugins above, published as the `./prosekit-extensions` subpath; importing from here requires the `prosekit` peer dependency
- `src/prosekit/` — ProseKit-specific wrappers for marks/lists (`defineEm`, `defineStrong`, `defineList`), plus `defineBasicExtension()` — the shared QTI-shaped ProseKit base (doc/text/paragraph/heading/list/image/table nodes, `em`/`strong` marks, base keymap/commands/history/gap cursor) that every app's own `basic-extension.ts` composes on top of with its own additions (hard break, virtual selection, AI, etc.) rather than redefining the base itself. Four of these (`doc`, `list`, the `em`/`strong` marks, `image`) are rebuilt rather than patched because ProseKit's own spec does not serialise to what QTI needs — see [prosekit-divergences.md](prosekit-divergences.md). `gap-cursor-paragraph.ts` (`defineGapCursorParagraph()`) is a fifth ProseKit correction, paired with `allowGapCursor: true` on a schema's `doc`/wrapper node specs rather than replacing a spec outright — see the same doc.

Does not own QTI composition logic, interaction-specific behavior, or app wiring.

The schema-version compatibility/migration pipeline (`compatibility`) and
local-storage doc persistence (`local-storage-doc-persistence-extension`)
used to live here but were moved into the editor application (now its own
repository, at `src/lib/compatibility` and
`src/extensions/local-storage-doc-persistence-extension`) — they're only
needed by the app that persists raw ProseMirror JSON, not by the public
extension surface. The `virtual-cursor` plugin was removed outright; it had
no consumers.

### `packages/prose-ai` (`@citolab/prose-ai`)

Private package. AI-related ProseKit extensions, vendored from upstream
`@prosekit/ai` (the installed `prosekit`/`@prosekit/extensions` version
doesn't yet export the `Commit` diffing helpers this package needs). Has no
dependency on `prose-qti` or `prose-extensions` — it only
peer-depends on `prosekit` and depends on `prosemirror-changeset`.

Owns:
- `src/ai-diff.ts` — track-changes-style accept/reject decorations and
  commands for an AI-produced `Commit`
- `src/commit-helpers.ts` — `Commit`/`ChangeSet` diffing helpers inlined from
  upstream `@prosekit/extensions` pending that export landing there
- `src/html-bridge.ts` — HTML ⇄ ProseMirror serialize/parse helpers for
  round-tripping content with an AI service
- `src/stream-content-command.ts` — incremental HTML-streaming insertion,
  buffering and flushing at safe tag boundaries

Does not own QTI composition logic or app-level AI wiring (toolbar UI,
prompt construction, model calls) — those belong to the consuming
application, in its own `ai-extension.ts` and
`ai-chat`/`ai-check`/`ai-create`/`ai-stream-content` components. No app in
this repository wires them up today.

### `apps/*`

Owns:
- Runnable demos, the docs site, and cross-package tests
- Integration references
- App shell behavior (toolbars, panels, persistence wiring) *in the demos*

The full authoring application is not here; it lives in its own repository and consumes the
published packages.

Does not own reusable editor primitives, interaction behavior, or canonical composition logic.

`@citolab/prose-qti/integration/interactions/prosekit` ships `defineQtiInteractionsExtension()` and
`defineQtiExtension()`, covering every registered interaction — that is the default an app should
reach for. An app wanting a curated subset assembles its own extension from
`listInteractionSchemaNodeSpecs({ include })` and `listSelectedInteractionPluginFactories({ include })`.

## Package Dependency Flow

```
@citolab/prose-qti          (QTI + interfaces + integration; depends on @qti-components/*)
         ↓
@citolab/prose-extensions   (generic ProseMirror/ProseKit extensions; depends on prose-qti)
         ↓
apps/*  +  external editor applications   (consume the published packages)

@citolab/prose-qti-node     (built from prose-qti's dist/node/ output at pack time; no
                              dependency on prose-extensions — consumed
                              directly by Node-only integrations, not by apps/*)

@citolab/prose-ai           (private; peer-depends on prosekit only, no
                              dependency on the chain above — consumed
                              directly by apps/*)
```

## Package Exports

`packages/prose-qti` and `packages/prose-extensions` are published to npm, so their `package.json` `exports` map (`main`, `types`, and every subpath) must resolve to built `dist/**` output, never raw `src/**/*.ts` — consumers do not compile this repo's TypeScript. Wildcard subpath entries (e.g. `"./components/choice/*": "./dist/components/choice/*"`) must map directly to the already-extensioned build output; do not append `.js`/`.d.ts` in the exports map yourself, since the glob match already includes the extension and doing so produces duplicate-extension paths that fail to resolve. Run each package's `build` script and spot-check `dist/` before changing its `exports` map.

`packages/prose-qti-node` is also published, but its rules differ: it has a single `.` export, an esbuild bundle of `prose-qti`'s `dist/node/index.js` (`scripts/bundle-node.mjs`), not a `tsc` mirror of `src/`. There is no subpath wildcard to keep in sync — only one entry point to rebuild whenever `prose-qti`'s node entry changes.

`packages/prose-qti`'s `sideEffects` array has the same dual-spelling requirement as `exports`, for the opposite reason: it must list both `./dist/components/**/register.js` (what a consumer's bundler tree-shakes) and `./src/components/**/register.ts` (what this workspace's own apps resolve to via `tsconfig` paths). A pattern naming only one spelling lets a bundler drop every `register` side-effect import against the other, which deletes the whole custom-element layer silently — no build error, the editor just renders unstyled `HTMLElement`s. `packages/prose-qti/src/side-effects.node.test.ts` asserts both patterns stay present and every module defining a custom element is still named `register`, which is the filename convention the patterns match on.

Cross-package dependencies within this repo (e.g. `prose-extensions` depending on `prose-qti`) use the pnpm `workspace:*` protocol rather than a pinned version — see [release-plan.md](release-plan.md#internal-package-dependencies).

## Placement Decision Rules

Use these rules before adding code.

### Rule 1: Is it reusable beyond one app?

- If no, it may belong in `apps/*`.
- If yes, it does not belong only in `apps/*`.

### Rule 2: Is it a shared contract, interface, or pure type?

- If yes, it belongs in `packages/prose-qti/src/interfaces/`.

Examples:
- `InteractionDescriptor`
- Attribute panel metadata types
- Composer types

### Rule 3: Is it generic editor behavior (not QTI-specific)?

- If yes, it belongs in `packages/prose-extensions/src/`.

Examples:
- Generic ProseMirror plugins
- Block selection
- Attribute syncing
- Schema compatibility migrations
- ProseKit wrappers for standard text extensions

### Rule 4: Is it QTI semantics, interaction behavior, or ProseKit assembly?

- If yes, it belongs in `packages/prose-qti/src/`.

Examples:
- XML composition
- Per-interaction compose handlers
- Response declaration generation
- Interaction node specs and commands
- Descriptor objects
- ProseKit integration surfaces (events, code panel, contexts)

### Rule 5: Is it only needed to demonstrate usage?

- If yes, prefer Storybook stories first and `apps/*` only when a full integration shell is necessary.

## AI Scaffolding Rules

Before generating code, answer these questions explicitly:

1. Is this reusable package code or app example code?
2. If it is a shared type or contract, does it belong in `packages/prose-qti/src/interfaces/`?
3. If it is generic editor behavior, does it belong in `packages/prose-extensions/`?
4. If it is QTI-specific, does it belong in `packages/prose-qti/`?
5. If it is app code, why is it not reusable package code?

### What AI should not do

- Do not add reusable logic only in `apps/*`.
- Do not add QTI-specific logic in `packages/prose-extensions/`.
- Do not add generic ProseMirror behavior in `packages/prose-qti/src/integration/`.
- Do not duplicate type definitions that belong in `packages/prose-qti/src/interfaces/`.
- Do not create new top-level architecture buckets without updating this document first.

## The Descriptor Pattern

Every interaction component in `packages/prose-qti/src/components/*/` exports exactly one descriptor:

```ts
// packages/prose-qti/src/components/choice/descriptor.ts
export const choiceInteractionDescriptor = {
  tagName: 'qti-choice-interaction',
  nodeTypeName: 'qtiChoiceInteraction',
  nodeSpecs: [
    { name: 'qtiChoiceInteraction', spec: qtiChoiceInteractionNodeSpec },
    { name: 'qtiPrompt', spec: qtiPromptNodeSpec },
    // ...
  ],
  insertCommand: insertChoiceInteraction,
  keyboardShortcut: 'Mod-Shift-q',
  enterCommand: insertSimpleChoiceOnEnter,
  composerMetadata: choiceInteractionComposerMetadata,
  composerHandler: choiceComposerHandler,
  attributePanelMetadata: choiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
```

The `satisfies` operator validates the shape at compile time without widening the type.

Descriptors are registered in `packages/prose-qti/src/core/interactions/composer.ts`. After registration, they flow automatically to:

- `listInteractionDescriptors()` — usable by any consumer
- `listInteractionSchemaNodeSpecs()` — ProseKit node specs assembled from descriptors
- `getNodeAttributePanelMetadataByNodeTypeName()` — attribute panel metadata lookup
- The XML composer — compose handlers dispatched by tag name

Adding a new interaction means: write the component, export a descriptor, register it in core. No other files need updating.

Apps assemble the ProseKit extension by consuming descriptors:

```ts
// apps/*/src/extensions/qti-extension.ts
import { listInteractionDescriptors, listInteractionSchemaNodeSpecs } from '@citolab/prose-qti/core/interactions/composer';
import { defineKeymap, defineNodeSpec, definePlugin, union } from 'prosekit/core';

export function defineQtiInteractionsExtension(options?: { include?: string[] }): Extension {
  const descriptors = listInteractionDescriptors();
  const nodeSpecs = listInteractionSchemaNodeSpecs(options);
  // ... build keymap from descriptors, return union of extensions
}
```

### Editor decorations — opt-in, and one per interaction

`decoratorPluginFactories` is a second, deliberately separate plugin field on the descriptor. It
carries the *authoring affordances* — the hover boundary, the add/remove buttons, the node-action
pill — while `pluginFactories` carries the interaction's runtime behaviour.

The split exists because `pluginFactories` is installed unconditionally by every host
(`defineQtiInteractionsExtension()`), and a read-only or player host must not grow authoring
affordances. Hosts opt in through `defineQtiDecorationsExtension()` (ProseKit) or
`listInteractionDecoratorPluginFactories()` (plain ProseMirror), paired with the equally opt-in
`@citolab/prose-qti/decorations.css`.

The intended end state is **a decorator per interaction**, all of the same shape, and almost all of
that shape is already shared. `components/shared/extensions/node-decorations.ts` owns:

- the icon set and the button factory, so every affordance in every decorator is the same element
  with the same event handling
- the **node-action pill** and its four defaults — select, settings, copy, delete, as icon-only
  buttons. These are node-level operations that mean the same thing for every interaction, so no
  decorator should reimplement them. `select` puts a `NodeSelection` on the interaction, so the node
  itself becomes what Backspace, Ctrl-C and a drag act on — the operations the pill has no button
  for. `nodeActionsWidget({ pos, nodeTypeName, tagName, anchorName })` is the whole integration;
  pass `actions` to extend or replace the set.
- `QTI_OPEN_NODE_SETTINGS_EVENT` / `QtiOpenNodeSettingsDetail`, generic over
  `nodeTypeName` / `tagName`, so every decorator emits the same event and a host wires it once

**Why settings is an event and the others are not:** select, copy and delete are self-contained —
their correct behaviour follows from the node, the schema and the clipboard — so they do the work and
a host gets them for free. Settings has no default — what a properties UI *is* belongs to the host —
so the pill only reports that it was asked for. A host with no listener gets an inert settings
button and three that work.

**Copy is a real clipboard write**, via `view.serializeForClipboard`, not an insert-below: where a
copy belongs is the author's decision, and often it is another item entirely. The payload carries
ProseMirror's own `data-pm-slice` attribute, so a paste inside the editor reconstructs the node
faithfully and a paste elsewhere yields sensible HTML.

Before serialising, copy re-mints every identifier in the subtree (`remintIdentifiers`) and rewrites
references through the same mapping. That is a correctness requirement, not tidiness: two
interactions sharing one `responseIdentifier` bind to a single response variable at delivery, and an
un-remapped `correctResponse` would name the original's choices. **Known limitation:** two pastes of
one copy carry the same minted identifiers, so the second needs another copy. Fixing that properly
means re-minting on *paste*, which belongs with the paste rescue in `schema/paste-rescue.ts`.

What is left per interaction is only the add/remove semantics — what "another one of these" is, and
when one may be added or removed. Styling is shared too: the `.qti-decoration*` classes and the
`--qti-edit-*` custom properties in `packages/prose-qti/src/core-css/decorations.css`, so the whole
family retargets from a handful of variables rather than by restating selectors.

`components/choice/extensions/choice-decorations.ts` is the reference implementation; follow it when
adding the next one, and add to the shared module rather than the interaction if the next one needs
something this one does not. Order, match, gap-match and associate are the natural candidates. Note
that the per-choice widgets are emitted *after* the node they decorate — CSS anchor positioning
cannot anchor an element to its own ancestor — and that anchor names are minted per document
position, because duplicate names collapse every anchored box onto the last one.

## Storybook's Role

Primary documentation surface for:
- Isolated editor behavior
- Reusable UI states
- Regression fixtures
- Step-by-step editor assembly guidance

## Tests

Unit tests live next to package source. Integration tests cover cross-package contracts. App tests stay thin and cover only app shell behavior.

## Document Schema Versioning

The editor uses a single, monotonically increasing **schema version** for the ProseMirror document model. There is one source of truth:

```ts
// packages/prose-qti/src/interfaces/compatibility.ts (or compatibility.ts in interfaces)
export const CURRENT_SCHEMA_VERSION = 7;
```

### Where the version lives

- **Persisted JSON** — the version travels inside the document as a single top-level property: `{ "type": "doc", "schemaVersion": 7, ... }`. There is no separate storage envelope.
  - `stampSchemaVersion(doc)` adds the marker before writing.
  - `readPersistedDoc(value)` strips it, migrates, and reports what changed.
  - Never stamp a document before migrating it.
- **Roundtrip-QTI** — nowhere. The HTML/XML representation carries no version marker, and there is no HTML migration ladder to feed one to. There was, briefly: a `migrateHtmlFragment` pipeline whose single step renamed camelCase QTI attributes to hyphenated. It was removed on 2026-08-20 — nothing this editor ever exported was camelCase (every `toDOM` writes hyphenated, and no commit ever wrote otherwise), and its version detection could not work for an import anyway, since the caller has no way to know what wrote the file. Imported XML is normalised by the `qti3-item-import` transforms and checked against the schema by `findUnrepresentableElements` instead.

### The migration pipeline

Migrations live in the editor application's own repository, at `src/lib/compatibility/migrations/`, one file per transition, named `json-vN-to-vM.ts`. The chain is unbroken from 1 to `CURRENT_SCHEMA_VERSION`; `ladder.browser.test.ts` asserts that, because a gap would let a document at that version pass through untransformed.

| Step | Transition | What it does |
| --- | --- | --- |
| `json-v1-to-v2` | 1 → 2 | normalise legacy hyphenated attrs to camelCase |
| `json-v2-to-v3` | 2 → 3 | rename `correctResponse` → `rubricScoringBlock` on extended-text |
| `json-v3-to-v4` | 3 → 4 | lift `rubricScoringBlock` into a sibling `qtiRubricBlock` |
| `json-v4-to-v5` | 4 → 5 | flat prosekit list → prosemirror-schema-list (`bullet_list`/`ordered_list`) |
| `json-v5-to-v6` | 5 → 6 | `bold`/`italic` marks → `strong`/`em` |
| `json-v6-to-v7` | 6 → 7 | carry stored `image` width/height across the block → inline move |

To add a migration: bump `CURRENT_SCHEMA_VERSION`, add a `json-vN-to-vM.ts` file, register it in `compatibility/migrations/index.ts`, add a `schema/document-corpus/v<N>.json` fixture for the shape you left behind, and cover the new step's branches in `ladder.browser.test.ts`. Two suites, two questions: the corpus asks whether an old document still opens (real schema, frozen fixtures), the ladder test asks whether each step does what it says and reports what it did (no schema, hand-built shapes — a step's `warning` paths are unreachable from a single fixture).

### What an import cannot represent

An editor's schema models a subset of QTI, and importing markup it cannot hold must not come back as silence. **`@citolab/prose-extensions/schema-gaps`** is the layer for that case — in `prose-extensions` rather than `prose-qti` because it knows nothing about QTI: it takes a `Schema` and an `Element` and reports the difference.

- `findUnrepresentableElements` — what a schema cannot match in DOM it is about to parse, which is the only moment `DOMParser`'s silent unwrapping can be observed
- `TRANSPARENT_WRAPPER_TAGS` — the wrappers (`qti-content-body`, `thead`/`tbody`/`tfoot`/`colgroup`) whose children *are* the content, so a finding about one is true and worthless
- `withHostMessage` + `getMessage` — every sentence replaceable from outside; see [compatibility-messages.md](compatibility-messages.md)

Every import in it is `import type` — `prosemirror-model` included — so it has no runtime dependencies and no cross-package imports at all.

**The wrapper list names one QTI tag on purpose.** It was split for one release — HTML wrappers here, `qti-content-body` in `prose-qti` — and that was a mistake: it stranded a lone constant in `item-roundtrip`, a module about the transform pipeline that never used it, and made every call site import the scan from one package and the scan's argument from another. It is a list of tag-name strings; it creates no dependency and leaks no QTI concept into the API, and the concept it encodes is generic. One module owns the question.

The one piece of QTI gap knowledge that cannot move is the response-processing scan, which reads QTI response processing and produces the same `SchemaGapOutcome` for scoring the editor cannot model. The editor holds three models (`match_correct`, `map_response`, `map_response_point`) and QTI response processing is a general-purpose program, so an item scored any other way imports looking perfectly fine and is worth zero marks.

Reaching it needs `itemBodyAndGapsFromString` / `itemBodyAndGapsFromUrl` (`@citolab/prose-qti/item-roundtrip`), which return `{ itemBody, scoringGaps }`. It has to be an entry point of its own rather than something a caller assembles: the scan needs the whole `<qti-assessment-item>`, and `reduceToItemBody` has already discarded that root by the time `itemBodyFromString` returns — so the data is gone before any caller gets a value back. The scan itself stays internal; `runRoundtrip` hands it the item mid-pipeline, after the transforms (a transform that folded scoring onto an interaction has made it representable) and before the reduction.

The two outcomes stay separate because they answer to different inputs — one to the caller's schema, one to the editor's scoring models — and each import path spreads them into one `SchemaGapOutcome`, because the reader wants one notice. Both of `apps/qti-example-editor` and `qti-editor-full-assessment`'s two import doors do this.

This was written long before it was reachable: for several releases the scan had no caller and no test, because nothing could hand it a full item. `packages/prose-qti/src/item-roundtrip/scoring-gaps.browser.test.ts` covers it through the real pipeline for that reason — a test that called the scan directly would have passed against the version where nothing could reach it.

**It ships no notice.** Saying the news is the consumer's job, and the shape of that answer is theirs: the data to say it with is `SchemaGapOutcome.changes` — a `kind`, a `code`, the tag name, an excerpt of the author's own text. `apps/qti-example-editor/src/components/schema-gap-notice.ts` is one implementation (plain DOM, its own stylesheet); `qti-editor-full-assessment` renders the same data through React and i18next. The `dropped-content` regression story in `apps/e2e` therefore shows the loss in the document rather than a notice, and asserts what the scan reports against the data.

The module used to live in `prose-qti` and be called `schema-recovery`, and it used to be wider. `findSchemaViolation`, `salvageJsonDocument`, `resolveRecoverySites` and `createRecoveryMarkerPlugin` — the JSON-salvage path and the in-editor markers for it — were removed on 2026-09-08: no editor in this repo ever called them, and the one application that did dropped the feature rather than owning it. Nothing recovers anything now, hence the name. `plans/surface-silent-document-load-failures.md` is the historical record of that design, not a description of the code.

## Roundtrip-QTI Format

The **roundtrip-QTI** format is a lossless XML serialization of the editor's ProseMirror document. It is produced by `xmlFromNode` (`@citolab/prose-qti/integration/save-xml`) and consumed on import via `xmlToHTML` → `jsonFromHTML`. It is an interchange format for export/import and is fully round-trippable.

## QTI Item Export / Import

`@citolab/prose-qti/item-export` and `@citolab/prose-qti/item-roundtrip/export` serialize the editor's ProseMirror tree to a single standard QTI 3.0 assessment item, and `@citolab/prose-qti/item-roundtrip/import` / `@citolab/prose-qti/qti3-item-import` read a QTI 3.0 item back. The output is interchange-friendly standard QTI with no `data-*` mirrors. There is currently no multi-item test/package-building surface in this package.

The non-QTI attribute set lives in each interaction's component directory within `packages/prose-qti/src/components/`.

## Verification Order

Run the narrowest useful check first:

1. Changed package typecheck
2. Affected package tests
3. Storybook story verification when UI or regressions are involved
4. App build if package behavior surfaces in app integration
5. Broader workspace typecheck only when multiple shared contracts moved

Typical commands:

- `pnpm --filter @citolab/prose-qti typecheck`
- `pnpm --filter @citolab/prose-extensions typecheck`
- `pnpm --filter @qti-editor/prosemirror-item build`
- `pnpm -r --filter "./packages/**" run typecheck`

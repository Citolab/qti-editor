# @citolab/prose-extensions

Generic ProseMirror/ProseKit extensions used by QTI Editor — not QTI-specific.
Block-node selection, a virtual cursor for mark boundaries, node-attribute
sync from Lit shadow DOM, semantic paste normalization, local-storage
persistence, a schema-version compatibility/migration pipeline, and small
ProseKit mark/list extensions.

Everything under `prosemirror/*` is plain ProseMirror; each plugin also ships
an optional `*Extension` wrapper (`definePlugin(...)`) for ProseKit consumers.
`prosekit/*` requires ProseKit directly.

## Installation

```bash
pnpm add @citolab/prose-extensions
```

Peer dependencies (`prosemirror-model`, `prosemirror-state`, `prosemirror-view`,
`prosemirror-schema-basic`, `prosemirror-schema-list`, `prosemirror-inputrules`)
must already be present in the host app. `prosekit` is an optional peer —
required for the `*Extension` wrappers and all of `prosekit/*`; the raw
ProseMirror `Plugin`/class exports work without it.

## Package layout

| Subpath | Contents |
|---|---|
| `.` | Re-exports `prosemirror` and `prosekit` |
| `prosemirror` | Barrel for all ProseMirror plugins below |
| `block-select` | `blockSelectPlugin` / `NodeRangeSelection` — select entire block nodes |
| `virtual-cursor` | `createVirtualCursor` — cursor behavior at mark boundaries |
| `node-attrs-sync` | `nodeAttrsSyncPlugin` — sync a Lit component's attrs back into its PM node |
| `paste-semantic-html` | `defineSemanticPasteExtension` — normalize pasted Word/HTML + clipboard images |
| `local-storage-doc-persistence-extension` | Debounced doc autosave to `localStorage` |
| `compatibility` | Schema-version migration pipeline (JSON + HTML) |
| `prosekit` | `defineStrong`, `defineEm`, `defineList` |
| `prosekit/list` | `defineList` only |
| `prosekit/marks` | `defineStrong` / `defineEm` only |

## `block-select`

```ts
import { blockSelectPlugin, NodeRangeSelection } from '@citolab/prose-extensions/block-select';
// or, for ProseKit:
import { blockSelectExtension } from '@citolab/prose-extensions/block-select';
```

`NodeRangeSelection` is a custom `Selection` subclass spanning one or more
whole block nodes (used for "select this block" UX rather than a text
range). `blockSelectPlugin` provides the mouse/keyboard handling that
produces it; `blockSelectExtension` is the same plugin wrapped in
`definePlugin(...)` for a ProseKit `union(...)`.

## `virtual-cursor`

```ts
import { createVirtualCursor, type VirtualCursorOptions } from '@citolab/prose-extensions/virtual-cursor';
```

#### createVirtualCursor(options?: VirtualCursorOptions): Plugin

Renders a visible fake cursor at mark boundaries so users can tell which
side of a bold/italic/link edge they're on before typing — plain ProseMirror
browsers can't otherwise distinguish `inclusive`/non-inclusive mark edges.
There is no separate ProseKit wrapper; wrap the returned `Plugin` in
`definePlugin(() => createVirtualCursor(options))` yourself if needed.

**Options:**
- `skipWarning?: string[] | true` — mark names to exclude from the
  `inclusive`-attribute console warning, or `true` to disable the warning
  entirely.

## `node-attrs-sync`

```ts
import { nodeAttrsSyncPlugin, nodeAttrsSyncExtension } from '@citolab/prose-extensions/node-attrs-sync';
```

Listens for a `CustomEvent` dispatched by a Lit interaction component (detail:
`{ nodeType, tagName, attrs }`), resolves the PM node behind the DOM element
that dispatched it (walking ancestors so a wrapper node's shadow DOM still
resolves to the correct node), and applies `setNodeMarkup` with the merged
attrs — skipped if nothing actually changed. `nodeAttrsSyncExtension` is the
`definePlugin(...)`-wrapped form for ProseKit.

## `paste-semantic-html`

```ts
import { defineSemanticPasteExtension, makeHtmlSemantic, hydrateSemanticPasteImages } from '@citolab/prose-extensions/paste-semantic-html';
```

ProseKit-only (imports `prosekit/core` directly — no raw-plugin variant).

#### defineSemanticPasteExtension(): Extension

Installs a paste-handling plugin that:
- Runs pasted HTML through `makeHtmlSemantic` (`transformPastedHTML`) before
  ProseMirror parses it: strips QTI web-component shadow-DOM internals
  (`[part]` elements, choice-marker divs) that end up in copied HTML,
  converts Word's inline bold/italic/heading/quote styling into semantic
  tags, reconstructs `<ol>`/`<ul>` from Word's flattened `MsoListParagraph`
  paragraphs (and from plain `1. ` / `- ` text lists), and strips stray
  `<o:p>` tags and non-breaking spaces.
- Intercepts clipboard image files (`handlePaste`) and either merges them
  into the pasted HTML's `<img>` tags in order (`hydrateSemanticPasteImages`)
  or inserts them as new `image` nodes when there's no HTML payload,
  reading each file as a data URL.

`makeHtmlSemantic(html: string): string` and
`hydrateSemanticPasteImages(html: string, images): string` are exported
individually for callers that want to run the normalization outside of a
paste event (e.g. on import).

## `local-storage-doc-persistence-extension`

```ts
import {
  defineLocalStorageDocPersistenceExtension,
  readPersistedDocFromLocalStorage,
  readPersistedStateFromLocalStorage,
} from '@citolab/prose-extensions/local-storage-doc-persistence-extension';
```

#### defineLocalStorageDocPersistenceExtension(options: { storageKey: string; debounceMs?: number }): Extension

Debounces (`debounceMs`, default `250`) writes of `view.state.doc.toJSON()` to
`localStorage[storageKey]` on every doc change, stamping the current schema
version (`stampSchemaVersion`, from `compatibility`) before writing. Flushes
any pending write on plugin `destroy`.

#### readPersistedStateFromLocalStorage(storageKey): ReadPersistedDocStateResult
#### readPersistedDocFromLocalStorage(storageKey): NodeJSON | undefined

Read the counterpart back: parses the stored JSON, strips the embedded
`schemaVersion`, and runs it through the `compatibility` migration pipeline
(via `readPersistedDoc`) so old localStorage state loads under the current
schema. Returns `{}` / `undefined` for missing or unparseable data — safe to
call on a fresh browser with nothing stored yet.

## `compatibility`

Schema-version migration pipeline for both the editor's persisted JSON
(`NodeJSON`) and QTI-derived HTML fragments. Migrations live in
[`migrations/`](src/prosemirror/compatibility/migrations/); each step
declares `fromVersion`/`toVersion` and is applied in order by a shared
runner, regardless of which representation (JSON or HTML) is migrating.

```ts
import {
  createMigrationRegistry,
  migrateDocument,
  composeJsonStep,
  composeHtmlStep,
  jsonRenameAttr,
  jsonApplyDefault,
  jsonRemoveAttr,
  jsonPreserveUnknownAttrs,
  htmlRenameAttr,
  htmlApplyDefault,
  htmlRemoveAttr,
  htmlPreserveUnknownAttrs,
  migrateJsonDocument,
  migrateHtmlFragment,
  readPersistedDoc,
  stampSchemaVersion,
  buildCompatibilityReport,
} from '@citolab/prose-extensions/compatibility';
```

**Invariants** (see the doc comment at the top of
[`index.ts`](src/prosemirror/compatibility/index.ts) for the full rationale):
no silent drops — every mutation is logged via `context.addChange`; unknown
content is preserved via `context.preserve` rather than discarded; steps are
strictly version-ordered and skip forward when a representation has no step
at the current version; version is detected before migrating, falling back to
`fallbackVersion` (default `1`) with a `VERSION_ASSUMED` warning if detection
fails.

#### createMigrationRegistry(options): MigrationRegistry\<TDocument>

Builds a reusable, version-sorted pipeline for one document type. `steps` are
sorted by `fromVersion` at creation time; `detectVersion` is called on each
`.migrate(document)` unless an explicit `sourceVersion` is passed. Both
`migrateJsonDocument` (JSON) and `migrateHtmlFragment` (HTML) are built this
way internally.

#### composeJsonStep(options: ComposeJsonStepOptions): MigrationStep\<NodeJSON>
#### composeHtmlStep(options: ComposeHtmlStepOptions): MigrationStep\<string>

Compose a list of per-attribute transforms into one version-bridging step.
`composeJsonStep` walks every node's `attrs` recursively; `composeHtmlStep`
parses the HTML, visits every element matching `options.selector` (**always
pass a `selector`** — it defaults to `*`, which is rarely what you want), and
serializes back to HTML. Both accept an optional `getMessage` i18n hook
(`CompatibilityMessageFn`) to replace the built-in English change messages —
wire it to `translateQti` or similar at registry-construction time.

**Transform helpers:**
- `jsonRenameAttr` / `htmlRenameAttr(from, to)` — rename an attribute, dropping `from` with a warning if `to` already exists.
- `jsonApplyDefault` / `htmlApplyDefault(name, defaultValue)` — set a default only where the attribute is missing.
- `jsonRemoveAttr` / `htmlRemoveAttr(name)` — remove an attribute, logging a warning.
- `jsonPreserveUnknownAttrs` / `htmlPreserveUnknownAttrs(knownAttrs)` — move any attribute not in `knownAttrs` into the preservation sidecar (`context.preserve`) instead of letting ProseMirror silently drop it.

#### migrateJsonDocument(document, options?): MigrationResult\<NodeJSON>
#### migrateHtmlFragment(html, options?): MigrationResult\<string>

The two concrete pipelines, both targeting `CURRENT_SCHEMA_VERSION` (from
`@citolab/prose-qti/interfaces`; currently `6`). `migrateJsonDocument` detects
version from an explicit `sourceVersion`, `options.metadata.documentVersion`,
or an embedded `schemaVersion` field, in that order. `migrateHtmlFragment` has
no embedded-version fallback — QTI XML/HTML carries no version marker, so
callers must pass `sourceVersion` or `metadata.documentVersion` explicitly, or
accept the `VERSION_ASSUMED` fallback to `1`. `migrateHtmlFragment` also
accepts `options.preserve` (`attributeNames?`, `elementTags?`) to snapshot
specific attributes/elements into the sidecar regardless of whether the
schema currently supports them.

#### stampSchemaVersion(doc: NodeJSON): NodeJSON
#### readPersistedDoc(value: unknown): ReadPersistedDocStateResult

The persisted-JSON envelope helpers used by
`local-storage-doc-persistence-extension`: `stampSchemaVersion` adds the
`schemaVersion` marker before writing (**only ever call this after
migrating** — stamping first marks a document current and skips future
migration). `readPersistedDoc` reads a stored value back, strips the marker,
and migrates it — returns `{}` for anything that isn't a `NodeJSON`-shaped
object.

#### buildCompatibilityReport(sources: CompatibilityReportSource[]): CompatibilityReport

Aggregates one or more labelled `MigrationResult`s (e.g. one per imported
item) into a single report with rolled-up `counts` and `hasWarnings` /
`hasErrors` flags, for surfacing import/load warnings in the UI.

## `prosekit`

```ts
import { defineStrong, defineEm, defineList } from '@citolab/prose-extensions/prosekit';
```

#### defineStrong(): StrongExtension / defineEm(): EmExtension

Mark specs reusing `prosemirror-schema-basic`'s `strong`/`em` (so document
JSON stays compatible with that schema), plus a ProseKit `toggleStrong` /
`toggleEm` command and `Mod-b` / `Mod-i` keymap binding.

#### defineList(options?: ListOptions): ListExtension

`bullet_list` / `ordered_list` / `list_item` node specs (reusing
`prosemirror-schema-list`'s parse/toDOM), a `toggleBulletList` /
`toggleOrderedList` command pair that converts between list types in place
or wraps/lifts the selection, and a keymap: `Enter` splits the current list
item, `Backspace` is restored to ProseMirror's standard
`deleteSelection → joinBackward → selectNodeBackward` chain (ProseKit's basic
keymap otherwise uses `joinTextblockBackward`, which never lifts a list
item's first line out into a paragraph).

**Options:**
- `inputRules?: boolean` — enable markdown-style input rules (`- `/`* `/`+ ` → bullet list, `1. ` → ordered list). Off by default.

`prosekit/list` and `prosekit/marks` expose `defineList` and
`defineStrong`/`defineEm` individually, if you only need one.

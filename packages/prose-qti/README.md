# @citolab/prose-qti

QTI 3.0 functionality for ProseMirror-based editors: interaction node specs, a
descriptor registry for assembling schemas, and the compose/roundtrip pipelines
that convert between ProseMirror documents and QTI 3.0 XML.

The package has no hard dependency on ProseKit — the `core/*` and `interfaces`
subpaths are plain ProseMirror/TypeScript. `integration/*` contains thin
ProseKit adapters for apps that use ProseKit specifically.

## Installation

```bash
pnpm add @citolab/prose-qti
```

Peer dependencies (`lit`, `prosemirror-model`, `prosemirror-state`,
`prosemirror-view`, `prosemirror-commands`) must already be present in the
host app. `prosekit` is an optional peer — only required if you use the
`integration/*` subpaths.

## Quick Start

Assemble a ProseKit editor with every registered QTI interaction, then read
and write QTI XML:

```ts
import { createEditor } from 'prosekit/core';
import { defineQtiExtension } from '@citolab/prose-qti/integration/interactions/prosekit';
import { xmlFromNode } from '@citolab/prose-qti/integration/save-xml';
import { qtiItemFromProsemirror } from '@citolab/prose-qti/integration/save-qti-item';

const editor = createEditor({ extension: defineQtiExtension() });

editor.mount(document.querySelector('#editor')!);

// Serialize the current document.
const html = xmlFromNode(editor.view.state.doc); // <qti-item-body> fragment
const item = qtiItemFromProsemirror(editor.view.state.doc, {
  identifier: 'item-1',
  title: 'My Item',
}); // full <qti-assessment-item>
```

`defineQtiInteractionsExtension()` installs node specs, keymaps and plugins
for **every** registered interaction. To hand-pick a subset instead, assemble
your own extension from the lower-level descriptor registry — see
[Descriptor pattern](#descriptor-pattern) below.

## Package layout

| Subpath | Contents |
|---|---|
| `.` | Re-exports `core`, `interfaces`, `integration`, `item-roundtrip`, `qti3-item-import`, plus `buildItemBodyContext` / `QtiItemComposeContext` from `item-export` |
| `core`, `core/composer` | Pure XML-composition functions (no Lit/UI deps) |
| `core/interactions/composer` | The descriptor registry (`listInteractionDescriptors`, etc.) |
| `interfaces` | Shared TypeScript types (`InteractionDescriptor`, attribute/composer/compatibility metadata) |
| `integration/*` | ProseKit adapters: events, code panel, item context, save helpers |
| `item-export` | ProseMirror → single `<qti-item-body>` / `<qti-assessment-item>` helpers |
| `item-roundtrip` | Bundled import (QTI XML → PM) and export (PM → QTI XML) pipeline |
| `qti3-item-import` | Per-interaction-type XML roundtrip transforms (QTI XML normalization) |
| `components/register`, `components/<name>` | Lit web components for each interaction, plus their descriptors |
| `core-css.css` | Shared CSS for the interaction components |

## Descriptor pattern

Every interaction (`components/choice`, `components/match`, …) exports one
`InteractionDescriptor` ([interfaces/descriptor.ts](src/interfaces/descriptor.ts))
bundling its node specs, insert/enter/backspace commands, keyboard shortcut,
plugins, composer metadata, and attribute-panel metadata. `core/interactions/composer`
aggregates the descriptors from all components into a single registry:

```ts
import {
  listInteractionDescriptors,
  listInteractionSchemaNodeSpecs,
  listInteractionPluginFactories,
  listSelectedInteractionPluginFactories,
} from '@citolab/prose-qti/core/interactions/composer';
```

The registry currently includes: `associate`, `choice`, `extended-text`,
`gap-match`, `hottext`, `inline-choice`, `match` (both `matchInteractionDescriptor`
and the tabular variant `matchInteractionTabularDescriptor`), `order`,
`select-point`, `text-entry`, and `rubric-block`.

### listInteractionDescriptors(): ReadonlyArray\<InteractionDescriptor>

Returns every registered descriptor, in registration order. Use this to build
a custom keymap or command list instead of `defineQtiInteractionsExtension()`.

### listInteractionSchemaNodeSpecs(options?: { include?: string[] }): ReadonlyArray\<InteractionNodeSpecEntry>

Collects the ProseMirror `NodeSpec` entries needed for the given interactions
(or all of them, if `include` is omitted), deduplicated by node name and
prefixed with any shared base-schema node groups (e.g. `qtiMedia`) the
selection depends on.

### listInteractionPluginFactories(): ReadonlyArray\<() => Plugin>

The ProseMirror plugin factories contributed by **every** registered
descriptor, in registration order.

### listSelectedInteractionPluginFactories(options?: { include?: string[] }): ReadonlyArray\<() => Plugin>

Same as `listInteractionPluginFactories`, filtered to the descriptors named in
`include`.

**Example — a schema with only choice and text-entry interactions:**

```ts
const include = ['qti-choice-interaction', 'qti-text-entry-interaction'];
const nodeSpecs = listInteractionSchemaNodeSpecs({ include });
const pluginFactories = listSelectedInteractionPluginFactories({ include });
```

## API Reference

### `integration/events`

```ts
import {
  qtiEditorEventsExtension,
  onQtiContentChange,
  onQtiSelectionChange,
} from '@citolab/prose-qti/integration/events';
```

#### qtiEditorEventsExtension(options?: QtiEditorEventsOptions): Extension

ProseKit plugin that dispatches `CustomEvent`s whenever the document or
selection changes.

**Options** (all optional):
- `contentChangeEvent` — event name for content changes. Default `'qti:content:change'`.
- `selectionChangeEvent` — event name for selection changes. Default `'qti:selection:change'`.
- `emitContentChanges` / `emitSelectionChanges` — toggle each event stream. Default `true`.
- `eventTarget` — where events are dispatched (in addition to `view.dom`, which always receives `qti:editor:change` / `qti:editor:selection`). Default `document`. Pass a private `new EventTarget()` to scope events to one editor instance.

Content-change events fire only when the serialized doc JSON actually differs
from the last emission, so rapid no-op transactions don't spam listeners.

#### onQtiContentChange(listener, target?, eventName?): () => void
#### onQtiSelectionChange(listener, target?, eventName?): () => void

Convenience wrappers around `target.addEventListener` that return an unsubscribe
function. `target` and `eventName` must match the `eventTarget` /
`contentChangeEvent` / `selectionChangeEvent` passed to
`qtiEditorEventsExtension`, otherwise the listener never fires.

### `integration/code`

```ts
import { qtiCodePanelExtension } from '@citolab/prose-qti/integration/code';
```

#### qtiCodePanelExtension(options?: QtiCodePanelOptions): Extension

ProseKit plugin that dispatches a `QtiCodeUpdateDetail` (`{ json, html, xml, timestamp }`)
whenever the document changes — the data source for a live code/preview panel.

**Options:**
- `eventName` — default `'qti:code:update'`.
- `eventTarget` — default `document`.
- `emitOnInit` — emit once immediately on mount, in addition to on every change. Default `true`.

### `integration/item-context`

```ts
import { itemContext, itemContextVariables, type ItemContext } from '@citolab/prose-qti/integration/item-context';
```

A `@lit/context` context for sharing assessment-item metadata with Lit UI
chrome (attribute panels, toolbars): `itemContext` carries an `ItemContext`
(`{ identifier, lang, title, variables, itemBody, items }`) describing the
item surrounding the editor.

### `integration/save-xml`, `integration/save-qti-item`

```ts
import { xmlFromNode, xmlToHTML } from '@citolab/prose-qti/integration/save-xml';
import { qtiItemFromProsemirror } from '@citolab/prose-qti/integration/save-qti-item';
```

#### xmlFromNode(node: ProseMirrorNode, serializer?: DOMSerializer): string

Serializes a ProseMirror node to a `<qti-item-body>` XML fragment (no
response declarations / processing).

#### xmlToHTML(xml: string): string

The inverse direction for display purposes: strips a `<qti-item-body>` (or
multiple `<qti-assessment-item>`s, joined back together with
`<qti-item-divider>` markers) down to its inner HTML content.

#### qtiItemFromProsemirror(node, context?: QtiComposeContext): string

Serializes a ProseMirror node to a complete, formatted `<qti-assessment-item>`
XML string — response declarations, outcome declarations and response
processing are derived from the interactions in the document. `context.identifier`
and `context.title` are auto-generated from the content if omitted.

### `integration/interactions/prosekit`

```ts
import { defineQtiInteractionsExtension, defineQtiExtension } from '@citolab/prose-qti/integration/interactions/prosekit';
```

#### defineQtiInteractionsExtension(): Extension

Assembles **all** registered interaction descriptors into one ProseKit
extension: node specs, a keymap (Enter/Backspace dispatch tried in
registration order, constrained Home/End inside interaction shadow DOM, and
each descriptor's `keyboardShortcut`), and plugins. Also imports
`components/register` as a side effect, so every interaction custom element
is defined.

For a curated subset of interactions, don't use this function — call
`listInteractionSchemaNodeSpecs({ include })` /
`listSelectedInteractionPluginFactories({ include })` directly and assemble
your own extension (see [apps/qti-prosekit-item/src/extensions/qti-extension.ts](../../apps/qti-prosekit-item/src/extensions/qti-extension.ts)
for the pattern).

#### defineQtiExtension(): Extension

`union(defineBasicExtension(), defineQtiInteractionsExtension())` — ProseKit's
basic extension plus every QTI interaction, for apps that want a complete
editor in one call.

#### registerQtiInteractionElements(): void

**Deprecated, no-op.** Custom elements are now registered purely through
side-effect imports (`components/register` and each component's own
`register.ts`). Retained only for backwards compatibility and will be removed
in a future release.

### `core/composer`

Pure, DOM-based XML composition — no Lit/ProseKit dependency.

#### buildAssessmentItemXml(itemContext?: ComposerItemContext): string

The lowest-level item builder: takes an `itemBody` `Document`, walks its
interaction elements through each descriptor's `composerHandler`, and
produces one `<qti-assessment-item>` string with derived response/outcome
declarations and response processing. `qtiItemFromProsemirror` and
`item-roundtrip/export` build on top of this.

#### buildSingleAssessmentItemXml(itemContext?) / buildMultipleAssessmentItemsXml(itemContext?)

Divider-aware wrappers: `buildSingleAssessmentItemXml` first converts any
`qti-item-divider` elements to `<hr/>` (so a multi-section document still
exports as one item); `buildMultipleAssessmentItemsXml` instead splits at the
dividers and emits one assessment item per segment.

#### countItemFragments(itemContext?) / getItemFragmentXmls(itemContext?)

Divider-counting/inspection helpers for callers that need to segment a
document into multiple assessment items themselves.

#### extractResponseDeclarations(itemBodyRoot?: Element | null): ResponseDeclaration[]

Walks an item-body element's interactions and derives their `ResponseDeclaration`s
(cardinality, base type, correct response, mapping, response-processing kind)
without producing XML — used internally by `buildAssessmentItemXml`, exposed
for callers that need the declarations on their own.

#### getStrippedAttributeSources(...) / normalizeStrippedAttribute(...) / stripAttributesFromElement(...)

Re-exported from `./stripped-attributes.js`: helpers for handling authoring
attributes that must be stripped from an interaction element before it is
emitted as final QTI XML (e.g. editor-only state), while still recovering
their value from wherever the source XML expressed it.

#### formatXml(xml: string): string

Pretty-prints an XML string with 2-space indentation. Used internally by the
item export helpers; exposed for callers building XML manually.

### `item-export`

```ts
import { buildItemBodyContext, xmlFromNode, type QtiComposeContext } from '@citolab/prose-qti/item-export';
```

The lower-level building blocks behind `integration/save-xml` and
`integration/save-qti-item`: `buildItemBodyContext` derives a `ComposerItemContext`
(identifier/title/lang) from a ProseMirror node, and `xmlFromNode` serializes
the node itself.

### `item-roundtrip` (import / export)

Bundles the QTI-XML ⇄ ProseMirror pipeline so apps don't re-inline it. The
schema is always supplied by the caller, since it's editor-specific.

```ts
import { importItemFromString, importItemFromUrl, importItemXmlDoc } from '@citolab/prose-qti/item-roundtrip/import';
import { exportItemXml, exportItemXmlDoc } from '@citolab/prose-qti/item-roundtrip/export';
```

#### importItemFromString(xml: string, schema: Schema, options?: RoundtripImportOptions): ProseMirrorNode
#### importItemFromUrl(url: string, schema: Schema, options?): Promise\<ProseMirrorNode>
#### importItemXmlDoc(xmlDoc: XMLDocument, schema: Schema, options?): ProseMirrorNode

Run the roundtrip transform chain (normalizes authoring attributes, reduces
to `<qti-item-body>`) and parse the result into a ProseMirror document.
`importItemFromUrl` derives `assetBasePath` from the URL's directory unless
overridden.

**`RoundtripImportOptions`:**
- `assetBasePath?: string` — rewrites relative asset URLs (e.g. `<img src>`) to resolve at runtime.
- `transforms?: readonly RoundtripTransform[]` — override the per-type transform list. Defaults to `defaultRoundtripTransforms` (all interaction types except `associate`, which is applied separately by `qti3-item-import`'s own `roundtripQtiItem`). `reduceToItemBody` always runs last regardless.

#### exportItemXml(doc, schema, context?, options?): string
#### exportItemXmlDoc(doc, schema, context?): XMLDocument

The inverse: serializes a ProseMirror document to a `<qti-item-body>` (via
`pmToRoundtripXml`), applies `RoundtripExportOptions.transforms` (defaults to
`defaultRoundtripExportTransforms`, currently just `stripEmptyPrompts`), then
expands it into a complete `<qti-assessment-item>` via
`buildSingleAssessmentItemXml`. `context.identifier` / `context.title` default
to `doc.attrs.identifier` / `doc.attrs.title`. `exportItemXml`'s
`options.format` (default `true`) controls pretty-printing.

Also exported from `item-roundtrip`: `ensureInteractionPrompts` (fills in
missing `<qti-prompt>` elements before export) and `stripEmptyPrompts` /
`defaultRoundtripExportTransforms` (the reverse — drop prompts that ended up
empty).

### `qti3-item-import`

Per-interaction-type XML→XML normalization transforms, run against a raw QTI
3.0 item before it reaches the ProseMirror parser. Each `roundtrip*` function
hoists that interaction type's authoring attributes (`correct-response`,
`score`, …) from wherever the source XML expresses them onto the interaction
element itself, so the parser only has one shape to handle.

```ts
import { roundtripQtiItem } from '@citolab/prose-qti/qti3-item-import/roundtrip-qti-item';
```

#### roundtripQtiItem(xmlString: string): string

Runs every per-type transform (`roundtripChoice`, `roundtripTextEntry`,
`roundtripExtendedText`, `roundtripAssociate`, `roundtripMatch`,
`roundtripGapMatch`, `roundtripOrder`, `roundtripSelectPoint`,
`roundtripInteractions`, `roundtripItemBody`) followed by `reduceToItemBody`,
returning the normalized `<qti-item-body>` XML string. All transforms are
idempotent and independent — order doesn't affect correctness, only which
source wins when an attribute is expressed more than one way.
`item-roundtrip/import` composes most of the same transforms directly with
the PM bridge (see `defaultRoundtripTransforms`); use `roundtripQtiItem`
instead when you want the normalized XML without parsing it into ProseMirror.

Each transform except `roundtripAssociate` is also exported individually from
its own subpath (e.g. `qti3-item-import/roundtrip-choice`) for callers that
need to run a subset; `roundtripAssociate` is currently only reachable via the
`qti3-item-import` barrel import or `roundtripQtiItem`.

### `components/register` and `components/<name>`

```ts
import '@citolab/prose-qti/components/register';
```

Side-effect import that registers each interaction's Lit custom elements
(and their shared sub-elements, e.g. `qti-simple-choice`) — every descriptor
except `rubric-block`, which is schema-only and has no custom element.
Required once per page before mounting an editor that uses any QTI
interaction — `integration/interactions/prosekit`'s
`defineQtiInteractionsExtension` already imports it, so most consumers don't
need to import it directly.

Each `components/<name>` subpath (`associate`, `choice`, `extended-text`,
`gap-match`, `hottext`, `inline-choice`, `match`, `order`, `rubric-block`,
`select-point`, `shared`, `text-entry`) exports that interaction's
`InteractionDescriptor` plus its Lit components, schema, commands and
composer handler — see [Descriptor pattern](#descriptor-pattern).

`components/shared` additionally exports the response-attribute codec
(`parseResponseAttribute`, `serializeResponseAttribute`,
`responseAttributeConverter`, and the point/pair parse-serialize helpers)
used to read and write interaction `correct-response`-style attributes.

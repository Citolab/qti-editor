# @citolab/prose-extensions

Generic ProseMirror/ProseKit extensions used by QTI Editor — not QTI-specific.
Block-node selection, node-attribute sync from Lit shadow DOM, semantic paste
normalization, and small ProseKit mark/list extensions.

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
| `node-attrs-sync` | `nodeAttrsSyncPlugin` — sync a Lit component's attrs back into its PM node |
| `paste-semantic-html` | `defineSemanticPasteExtension` — normalize pasted Word/HTML + clipboard images |
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

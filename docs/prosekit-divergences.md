# Where ProseKit diverges from ProseMirror

ProseKit is a convenience layer over ProseMirror: it ships node specs, commands and keymaps so an
editor does not have to assemble them. Most of them are ProseMirror's, unchanged. A few are not — and
where ProseKit's version differs, it differs in ways that matter to QTI, because QTI serialises to an
XSD-constrained HTML subset and ProseKit optimises for a general-purpose editor.

This page exists because that boundary is otherwise invisible. `defineBasicExtension` in
`packages/prose-extensions/src/prosekit/basic.ts` contains four `defineQti*` functions that rebuild a
node instead of using ProseKit's, and without this list they read as arbitrary.

**The rule:** where ProseKit's variant does not serialise to the format we target, take the
ProseMirror standard and extend it. Where it does, use ProseKit's.

---

## The divergences we replace

### Lists — flat, and not `ul` / `ol` / `li`

ProseKit ships a single `list` node that serialises to

```html
<div class="prosemirror-flat-list" data-list-kind="bullet">
  <div class="list-marker"></div>
  <div class="list-content">…</div>
</div>
```

QTI content is `ul` / `ol` / `li`, and `@qti-components/theme` styles those tags. Divs neither pick
up that styling nor round-trip to QTI XML.

**Replaced by** `defineList` (`prosekit/list.ts`), which reuses `prosemirror-schema-list`'s own parse
and serialise rules for real nested `ul` / `ol` / `li`.

### Marks named `bold` / `italic`

ProseKit's marks serialise to `<strong>` and `<em>` correctly, so nothing renders wrong. But anything
reading `schema.marks.strong` finds nothing, and the schema stops describing itself in QTI's
vocabulary.

**Replaced by** `defineEm` / `defineStrong` (`prosekit/strong-em.ts`), named for the tags they emit.

### `image` — block, no `alt`, size measured from layout

Three divergences from `prosemirror-schema-basic`, each of which was a bug:

| | prosemirror-schema-basic | ProseKit |
|---|---|---|
| level | `inline`, `group: inline` | `group: block` |
| attrs | `src`, `alt`, `title` | `src`, `width`, `height` — **no `alt`** |
| parsing | reads the attributes | `getBoundingClientRect()` / `naturalWidth` |

1. **Block.** QTI's XSD does not allow `img` as a child of `qti-item-body` — it is phrasing content
   and needs a block parent. A block image can therefore only ever serialise to something the schema
   rejects. It also cannot sit in a sentence, and an icon or maths glyph mid-text is ordinary
   assessment content.
2. **No `alt`.** Alternative text was destroyed on every import/export cycle. Silently, and on
   assessment content, where a text alternative is required rather than nice to have.
3. **Measured, not read.** During an import the DOM is detached, so the bounding rect is 0 and the
   authored `width` is lost. Reading the attribute is also the only way to keep a percentage.

**Replaced by** `defineQtiImage`, modelled on `prosemirror-schema-basic` plus `width` / `height`
(which schema-basic has no equivalent for — it carries `title` instead). Those two are **strings**,
not ProseKit's numbers: the sample items use `width="100%"` as well as `width="250"`, and a numeric
attribute drops the percentage.

`imgSelectPoint` is deliberately NOT this node — see its note in `schema/notes.ts`. There the image
is the response surface and its coordinates are the answer key, so it must not be draggable or
editable the way a decorative image is.

### `doc` — `block+`, so an empty document fills with the wrong node

`defineDoc()` says `content: 'block+'`. ProseMirror answers "what goes in an empty document?" with
`ContentMatch.defaultType` — the first edge of the content expression — and for a bare group
reference that is whichever node happens to be registered first in the group. In this schema that is
`qtiRubricBlock`, whose own `richtext+` then fills with `table`. Selecting all and deleting left the
author looking at an empty feedback box containing an empty table.

**Replaced by** `defineQtiDoc`, `content: '(paragraph | block)+'`. The accepted node set is unchanged
— paragraph is already in `block` — only the filler preference changes.

### Gap cursor — reachable, but typing opens the wrong node

`defineGapCursor()` gets ProseMirror's gap cursor into the extension union, but two more decisions
are still wrong by default for a schema with more than one textblock in its `block` group.

**Reachability.** A gap cursor is only offered where `GapCursor.valid` guesses a textblock could go,
and it guesses by reading `contentMatchAt(index).defaultType.isTextblock` — not by checking every
admitted type. `qtiLayoutDivNodeSpec`'s `content: 'block+'` hits this: `defaultType` (the first
admitted type with no required attributes) is `qtiItemDivider`, which is not a textblock, so the
guess is no at every position even though `paragraph` is legitimately in `block`. Every interaction
here is `isolating`, so this is also the *only* way to reach the collapsed space between two adjacent
interactions — there is no fallback. The same failure hits any host `doc` whose own content
expression puts a non-textblock first (a locked-header layout opening with `heading`, say);
`defineQtiDoc`'s `content: '(paragraph | block)+'` avoids it only because `paragraph` happens to be
named first.

**Replaced by** `allowGapCursor: true` on `qtiLayoutDivNodeSpec` (`packages/prose-qti/src/schema/qti-layout-div.ts`)
— the override the library provides for exactly this, rather than giving `qtiItemDivider` a required
attribute to stop it winning `defaultType` (that default is also read by `createAndFill` and every
auto-insertion path, so moving it to fix a cursor would be trading one bug for another). A host `doc`
that rewrites the content expression needs the same `allowGapCursor: true` on its own `doc` spec; no
app in this repo currently does that. Tables are deliberately not given this: `table` → `tableRow` →
`tableCell` really does not admit a textblock between rows or cells, so the heuristic's "no" there is
correct.

**Typed content.** Reachable is not the same as correct once you type. The default path
(`replaceRange` → `findWrapping`) wraps the typed text in whichever textblock is shortest to reach,
and ties among same-depth textblocks break on schema registration order — an implementation detail
of how extensions happen to be unioned, not something authored per schema. Measured order here is
`qtiSimpleChoiceParagraph, qtiPromptParagraph, heading, paragraph`, so typing at a gap between two
interactions produced an interaction-internal paragraph loose at item-body level, then a stray
`heading` — never `paragraph`, which sorts last.

**Replaced by** `defineGapCursorParagraph()` (`packages/prose-extensions/src/prosekit/gap-cursor-paragraph.ts`),
a plugin with a `handleTextInput` that runs before the default handling and inserts a `paragraph`
by name whenever the selection is a `GapCursor`. `defineBasicExtension()` includes it alongside
`defineGapCursor()`. Neither half works alone: `allowGapCursor` without this still opens the wrong
node, and this without `allowGapCursor` never fires because there is no gap cursor to catch.

---

## Two traps when patching a ProseKit node spec

### A later `defineNodeSpec` does not reliably win the merge

The obvious fix for any of the above is a patch:

```ts
defineNodeSpec({ name: 'doc', content: '(paragraph | block)+' })   // does NOT take effect
```

Measured: `content` stays `block+`. For `paragraph` the mechanism is documented —
`defineParagraph()` wraps its spec in `withPriority(spec, 4)`, the highest, so paragraph's payload
reduces last and its own `group: 'block'` overwrites any later patch. `doc` carries no such wrapper
and the patch still loses, so the absence of a priority wrapper is not a guarantee.

**What works:** compose the node yourself — supply the spec, reuse ProseKit's exported commands and
keymap — so the ProseKit spec never enters the union. That is what every `defineQti*` function does.

**What is genuinely patchable:** `table`. `defineNodeSpec({ name: 'table', group: 'block richtext' })`
does reach it. Which is precisely what makes this confusing: the same shape works in one place and
silently does nothing in another, with no error either way. Check the result rather than assuming.

### `white-space` inheritance crosses the shadow boundary

Not a spec divergence, but the same class of surprise. ProseMirror sets `white-space: break-spaces`
on `.ProseMirror` so typed spaces survive. That property is inherited, and inheritance crosses into
shadow trees — so it also applies to the newlines and indentation lit leaves between elements in a
component's `render()`. Under `normal` those collapse; under `break-spaces` each becomes a line box.

Measured on `qti-hottext-interaction`: three stray text nodes, host 181px tall around 60px of
content. See `editorWhiteSpace` in `packages/prose-qti/src/components/shared/styles/white-space.ts`.

---

## When you hit a new one

1. Compare against `prosemirror-schema-basic` / `prosemirror-schema-list` first. If ProseMirror's
   version already matches QTI, take it.
2. Rebuild rather than patch, unless you have checked that the patch lands.
3. Add a row here and a note in `schema/notes.ts`. `schema/markup-contract.browser.test.ts` states
   the resulting shape as an accept/refuse case, so the note and the behaviour cannot drift apart
   silently.

## See also

- [`schema/notes.ts`](../schema/notes.ts) — per-node notes, including every `XSD:` narrowing
- [`schema/markup-contract.browser.test.ts`](../schema/markup-contract.browser.test.ts) — the shapes
  the editor accepts and refuses
- [the roundtrip format](./roundtrip-format.md) — what the XML means

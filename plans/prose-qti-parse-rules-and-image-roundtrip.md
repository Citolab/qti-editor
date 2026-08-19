# prose-qti: three parse/roundtrip bugs found while removing layout divs from Coco's samples

> **Status:** #1, #2 and #4 are **fixed**. #3 is now **fixed** too, via option 1 (image rebuilt inline
> and QTI-aware) — see [prosekit-divergences.md](prosekit-divergences.md) and the `json-v6-to-v7`
> migration in [architecture.md](../docs/architecture.md#the-migration-pipeline).
>
> After the fixes: `pnpm typecheck` clean across all packages + e2e, `pnpm test` 163 passed /
> 2 skipped across 41 files, `pnpm test:vrt` 16/16, packages build.
>
> #4 touches `@citolab/prose-extensions` as well as prose-qti, so **both** need a release before
> QTI-Coco (which consumes them from npm) sees any of this.
>
> The select-point colour bug this investigation also turned up was fixed separately in
> QTI-Components — `qti-select-point-interaction` painted its marker via an inherited `color`, which
> tinted the prompt text too. Citolab/qti-components#177, on the `editor` branch, pinned here as
> sha `9a2532b`.

Found on 2026-08-07 while stripping `qti-layout-row` / `qti-layout-col*` wrappers from QTI-Coco's
`public/qti/kennisnet/ITEM*.xml`. **None of them are caused by that change** — the layout divs were
masking them. Any item whose content is not wrapped in a `qti-layout-*` div already hits #1 and #2
today, which is every item in the set that used a plain `<div>` (ITEM005, 007, 009, 016).

Observed against `@citolab/prose-qti@1.14.1` as consumed by Coco. Source paths below are QTI-Editor's.

---

## 1. `qtiSimpleAssociableChoiceParagraph` swallows every `<p>` in the document

**File:** `packages/prose-qti/src/components/shared/components/qti-simple-associable-choice/qti-simple-associable-choice-paragraph.schema.ts`

```ts
export const qtiSimpleAssociableChoiceParagraphNodeSpec: NodeSpec = {
  content: 'inline*',
  parseDOM: [{ tag: 'p' }],          // ← no context, no priority, no group
  toDOM(): DOMOutputSpec { return ['p', 0]; }
};
```

Its two siblings scope the identical rule correctly:

| File | Rule |
|---|---|
| `qti-simple-choice/qti-simple-choice-paragraph.schema.ts` | `{ tag: 'p', context: 'qtiSimpleChoice/', priority: 60 }` + `group: 'block'` |
| `qti-prompt/qti-prompt-paragraph.schema.ts` | `{ tag: 'p', context: 'qtiPrompt/', priority: 60 }` |

So this looks like an omission rather than a decision.

**Effect.** Any `<p>` that is not inside a `qtiSimpleChoice` or `qtiPrompt` matches this rule, and
ProseMirror then synthesises the required parent — so a plain paragraph in `qti-item-body` becomes a
stray `qtiSimpleAssociableChoice` (a drag-and-drop answer chip) containing it.

Measured, importing a minimal item whose body is `<p>Hallo wereld</p>`:

```
before fix:  qtiSimpleAssociableChoice
after fix:   paragraph
```

**Fix** (verified — patched the built package in Coco's store, cleared `.vite`, re-ran):

```ts
parseDOM: [{ tag: 'p', context: 'qtiSimpleAssociableChoice/', priority: 60 }],
```

Consider adding `group: 'block'` too, for consistency with `qtiSimpleChoiceParagraph`.

---

## 2. `imgSelectPoint` claims every `<img>` in the document

**File:** `packages/prose-qti/src/components/select-point/components/qti-select-point-interaction/img-select-point.schema.ts`

```ts
export const imgSelectPointNodeSpec: NodeSpec = {
  group: 'block qtiMedia',
  atom: true,
  parseDOM: [
    { tag: 'img', getAttrs: … }       // ← no context, no priority
  ],
  …
};
```

**Effect.** Every image in an item is parsed as the select-point interaction's clickable graphic
rather than as a plain `image`. Visible symptom in Coco: ITEM001's 250px atom illustration renders
full-bleed at the width of the document column, because the select-point node view sizes to its
container.

Measured, body `<img src="…" alt="A" width="250"/>`:

```
before fix:  imgSelectPoint  { imageSrc, imageAlt, imageWidth: 250 }
after fix:   image
```

**Fix** (verified the same way):

```ts
parseDOM: [
  { tag: 'img', context: 'qtiSelectPointInteraction/', priority: 60, getAttrs: … }
],
```

---

## 3. The `image` node cannot round-trip valid QTI — the real one

This is the finding that matters, and fixing #1 and #2 exposes it rather than solving it.

**The conflict.** `defineImage()` from `prosekit/extensions/image` — pulled in by
`packages/prose-extensions/src/prosekit/basic.ts:125` — declares:

```js
group: "block",
attrs: { src, width, height },        // note: no `alt`
```

QTI 3.0's XSD says the opposite: `img` is **not** permitted as a direct child of `qti-item-body`.
Verified with `xmllint` against `imsqti_asiv3p0p1_v1p0.xsd`:

```
element img: Schemas validity error : Element 'img': This element is not expected.
```

So a block-level image node can only ever serialise to something the schema rejects, unless a block
ancestor survives the round trip.

**Why nobody noticed.** `<div class="qti-layout-col3"><img/></div>` parses to `qtiLayoutDiv`, which is
a block container that both accepts a block image and re-emits its `<div>` on export. The layout
wrappers were doing double duty as the images' required block parent. A plain `<div>` does **not**
help — `qtiLayoutDiv`'s parse rule requires the `qti-layout-*` class, so an unclassed div is dropped
and its children are lifted to the top level.

**What happens with #1 and #2 fixed.** Import `<p><img src="…" alt="Atoom" width="250"/></p>`:

```
parsed:    paragraph + image        ← image lifted out of the paragraph (it is block, not inline)
exported:  <p/>
           <img src="/qti/kennisnet/resources/atom.png"/>
```

Three problems in that output:

1. `<img>` is back at the top level → **invalid QTI**, the thing we were trying to fix.
2. A stray empty `<p/>` is left behind.
3. **`alt` is gone.** The node spec has no `alt` attribute at all, so alternative text is destroyed on
   every import/export cycle. For assessment content that is an accessibility regression, and it is
   silent.

Also note `width="250"` did not survive either. `defineImage`'s `getAttrs` reads width/height from
`getBoundingClientRect()` / `naturalWidth`, not from the attribute — both are 0 when parsing detached
DOM during import, so the attributes come back `null`. And `src` was rewritten from the relative
`resources/atom.png` to an absolute `/qti/kennisnet/resources/atom.png`.

### Options

1. **Make the image node inline and QTI-aware.** Replace `defineImage()` with a prose-qti node spec:
   `group: 'inline'`, `inline: true`, attrs `src` / `alt` / `width` / `height` read from the
   attributes rather than from layout. `<p><img/></p>` then parses and re-serialises unchanged, and
   the samples can drop their layout divs. Biggest change; also the only one that fixes `alt`.
2. **Wrap on export.** Keep the node block-level, and have the QTI serializer wrap any bare `image`
   in a `<p>` on the way out. Cheaper, keeps the editor model as-is, still loses `alt` and `width`.
3. **Keep a block wrapper in the content.** Requires the layout divs (or another `qti-layout-*`
   classed div) to stay, which is what Coco was asked to remove.

**Recommendation: 1**, or 2 as a stopgap with 1 to follow. `alt` being silently dropped is worth
fixing on its own regardless of which is chosen.

---

## 4. Select-all + delete leaves an empty rubric block, not a blank line — FIXED

Reported symptom: press ⌘A a few times, then Backspace, and instead of an empty document you are
left with a feedback box — containing an empty table.

**Cause.** Two independent instances of the same mistake: a content expression that names a group and
nothing else, so ProseMirror's choice of filler is decided by schema registration order.

`ContentMatch.defaultType` returns the first edge of the expression that is not text and has no
required attrs. For a bare group reference that is whichever node happens to be registered first in
the group. Measured on Coco's assembled schema:

| Node | Content was | Group order (first → last) | Filler chosen |
|---|---|---|---|
| `doc` | `block+` | `qtiRubricBlock`, `imgSelectPoint`, … , **`paragraph` (last)** | `qtiRubricBlock` |
| `qtiRubricBlock` | `richtext+` | `table`, `ordered_list`, `bullet_list`, **`paragraph` (last)** | `table` |

So emptying the document refills it with a rubric block, which refills itself with a table.

This hazard was already known — `QTI-Coco/apps/qti-prosekit-item/src/qti-prosekit-item.ts` builds its
blank document by hand precisely because `createAndFill()` picks `qtiRubricBlock`, and says so in a
comment. That workaround only covers startup; nothing covered runtime deletion.

**Fix.** Name `paragraph` as the first alternative in both expressions. The accepted node set is
unchanged — paragraph is already in both groups — so this admits and rejects exactly what the bare
group did; only the preference changes.

- `packages/prose-extensions/src/prosekit/basic.ts` — new `defineQtiDoc()`, `content: '(paragraph | block)+'`
- `packages/prose-qti/src/components/rubric-block/qti-rubric-block.schema.ts` — `content: '(paragraph | richtext)+'`

⚠️ **The doc fix must replace `defineDoc()`, not patch it.** Adding a second
`defineNodeSpec({ name: 'doc', content: … })` after `defineDoc()` silently loses the merge and
`content` stays `block+` — measured, not assumed. This is the same trap the file already documents
for paragraph's group, so `defineQtiDoc` follows `defineQtiParagraph`'s "supply the spec ourselves"
pattern. (The `table` group patch below it *does* work, which makes the failure mode easy to
misdiagnose.)

Verified in Coco by mirroring both edits into the installed packages:

```
before:  after backspace -> qtiRubricBlock   (containing <table>)
after:   after backspace -> paragraph        (with the placeholder showing)
```

### Worth a follow-up

Look at what else is in the bare `block` group. `imgSelectPoint`, `qtiSimpleAssociableChoice`,
`qtiSimpleMatchSet`, `qtiGapText`, `qtiSimpleChoiceParagraph` and `qtiPromptParagraph` are all
interaction-internal structure, not standalone blocks an author can place in an item body. Their
membership is what made them candidates for the default fill in the first place, and it is the same
root cause as #1 and #2 — a node reachable in a context it was never meant for. Narrowing those
groups would remove the whole class of bug rather than its instances.

## Reproducing

```bash
cd QTI-Coco && pnpm dev          # port 5174
```

Then in the page console:

```js
const app = document.querySelector('qti-prosekit-item');
app.xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
                     identifier="T" title="T" time-dependent="false">
  <qti-item-body><p><img src="resources/atom.png" alt="A" width="250"/></p></qti-item-body>
</qti-assessment-item>`;
app.loadXml();
const top = []; app.editor.view.state.doc.forEach(n => top.push(n.type.name));
top;                              // ["qtiSimpleAssociableChoice", "imgSelectPoint"]
app.saveQti(); app.xmlOutput;     // inspect the round trip
```

To validate output against the official schema (QTI-MCP vendors the full import set, so `xmllint`
resolves everything offline — the copy in `~/.lemminx/cache` does not):

```bash
xmllint --noout --schema \
  QTI-MCP/src/qti_mcp/schemas/qti3/imsqti_asiv3p0p1_v1p0.xsd \
  QTI-Coco/public/qti/kennisnet/ITEM001.xml
```

## Status of Coco's samples

All 16 `ITEM*.xml` had their layout divs removed, `<img>` and `<qti-text-entry-interaction>` wrapped
in `<p>`, and **all 16 validate against the official XSD**. They are correct as QTI. They render
wrongly in the editor until #1–#3 are addressed, because the wrappers that were hiding these bugs are
gone. `apps/qti-prosekit-item/src/fixtures/ITEM001.xml` was deliberately left with its layout divs —
one browser test is specifically about importing QTI layout.

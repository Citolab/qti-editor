# Node-runnable conversion: what is decided, what is not, and why

Working notes for making the roundtrip conversion callable outside a browser, so that
LLM-generated content can be validated against the editor's own document model.

Nothing here is implemented yet. It records decisions that are **grounded in measurements**, so the
next person does not have to re-derive them — and marks clearly the one decision still open.

## The goal

Three entry points, all validating against the same schema:

```
prosemirror              -> schema validation
html        -> prosemirror -> schema validation
xml -> html -> prosemirror -> schema validation
```

`validate` means **the input is the output**. When it is not, it reports what changed — elements
added, elements removed — so the generator can try again.

Then, once that holds: `prosemirror -> full QTI`.

The three entry points exist to answer a real question: is QTI content best generated directly as
ProseMirror JSON, as HTML, or as XML? HTML is the favoured bet — readable, custom-element based, and
qti-components already publishes `custom-elements.json` and `custom-elements.interactions.json`, so
the element manifest an LLM needs exists rather than needing to be built.

---

## What was measured

> **Corpus note.** Every figure in this document is `/17`, measured when the corpus had 17 ITEM
> fixtures. It has 16 today: ITEM017 was the associate item and went with the qti-associate-interaction
> removal. The ratios below are left exactly as measured rather than decremented — re-deriving them
> means re-running the spike, and a silently adjusted number is worse than a dated one. What still
> holds live is the first row: the node conversion test reads the corpus off disk and reproduces
> every committed snapshot, 16/16.

A spike ran the real pipeline in plain Node over all 17 ITEM fixtures, comparing against the same
`__file_snapshots__` the Storybook regression tests assert. Harness:
`apps/e2e/spike-node-roundtrip.mjs`, run with
`node --import ./spike-resolve-dirs.mjs spike-node-roundtrip.mjs` from `apps/e2e`.

| | result |
|---|---|
| xml → html → pm → qti xml, vs the committed snapshots | **17/17** structurally identical |
| pm → html → pm identity | 11/17 (identical via live nodes *and* via an HTML string) |
| pm → qti xml → pm identity | 11/17 |

Verified honest: corrupting a fixture drops the first row to 16/17 and names the diff.

**The conversion needs no browser.** That question is settled.

---

## Decided

### 1. `qtiLayoutDiv` moves into prose-qti

Grounded, not preference:

- The wrappers are **author-written in the source XML** — `<div class="qti-layout-row">` is in
  ITEM001.xml as shipped.
- **qti-components' own theme styles them**, in
  `packages/qti-theme/src/styles/qti-native/qti3p0-override-layout.css`. The filename says what it
  is: a QTI 3.0 layout override.
- The node spec exists in **two byte-identical copies** — `QTI-Editor/apps/qti-prosemirror-item` and
  `QTI-Editor-angular/src/app/editor/components`. Diffed; identical.

So it is item-format vocabulary that merely happens to live in an app. Split it:

| | belongs |
|---|---|
| `qtiLayoutDivNodeSpec` | **prose-qti** — document model is the package's job |
| `qtiLayoutDivLockPlugin` | **prose-qti** too — see below |

The split originally kept the lock in the app, on the reasoning that editing behaviour is the
host's. That did not survive: both hosts wanted the same answer and both carried the same plugin
verbatim, so leaving it behind restarted the same drift the node-spec move had just ended. The
boundary was also mis-drawn — `isolating` and `selectable: false` are already editing behaviour
decided in the spec, and without the lock they are merely advisory, since a selection spanning a
wrapper still deletes it. Nothing can author a wrapper either: they arrive from imported QTI and no
editor offers a command to make one, so an unlocked host lets an author destroy structure they
cannot rebuild. It is a separate export, so opting out is one omitted array entry.

Measured consequence: with it, Node reproduces the snapshots **17/17**; without it, **9/17**, failing
exactly the 8 fixtures containing `qti-layout-*`.

### 2. The shared baseline levels UP, not down

Removing `qtiLayoutDiv` from the Storybook regression tests would give one baseline, but the wrong
one. `apps/e2e/stories/prosemirror-base.ts`'s own header records why it was added: 15 stories were
silently dropping every wrapper on import, which is why the theme's `@media (width <= 767px)` rule
appeared not to work in the editor. Removing it re-creates that bug and bakes it into 8 snapshots as
*expected* output — the baseline would then assert that the editor discards author layout.

Decision 1 achieves the same single baseline without paying for it in fidelity.

### 3. `validate()` is parse → re-serialise → diff

ProseMirror's parser never rejects invalid markup — it **coerces**, silently dropping and lifting
what does not fit. So "parse it and see if it throws" cannot work. (Established the hard way: an
HTML-parsing version of `schema/markup-contract.browser.test.ts` passed while asserting nonsense and
had to be rewritten onto `createChecked`.)

Parse, re-serialise, diff against the input. Whatever the parser had to coerce shows up as a
difference, and that diff *is* the report to hand back to the generator.

### 4. …but it is blocked on round-trip stability, and that is the real obstacle

Identity is **11/17**, failing on the same six in both directions: match (ITEM007–010), associate
(ITEM017), and a whitespace edge in inline-choice (ITEM006). Match and associate *gain* nodes on
re-parse — 38→47, 22→28 — because the parser fills required content the serialized form no longer
distinguishes.

A validator built on this today would report "you added a `qtiSimpleMatchSet`" when the generator did
nothing of the kind. **False positives on 5 of 10 interaction types**, and on the hardest ones to
generate. This must be characterised before `validate()` is worth building. It is not a Node
artefact — it is content-matching behaviour, expected to reproduce in the browser, though that has
**not** been verified.

---

## 5. Everything runs in Node — one implementation, no port

Settled. The roundtrip format, validation, and QTI generation all happen in Node. There is no second
implementation in another language, which means **drift between implementations is impossible by
construction** — a stronger guarantee than any conformance suite could give, and the reason not to
pursue a port even where one looked feasible.

The spike is what makes this a decision rather than a hope: the full pipeline already reproduces all
17 committed snapshots in plain Node.

### Still to settle: library or service

Not urgent, and not the same question. Both known editors — QTI-Editor and QTI-Editor-angular — are
TypeScript, so a **library** serves them with no network hop, and it keeps the conversion versioned
alongside the schema that defines it. That last part is not theoretical: a hand-copied
`qti-editor-schema.json` already exists elsewhere in the estate, 38 nodes, drifting quietly. The
answer to that is not a better copy — a generated `content-model.json` export was built and then
removed unused — it is that a consumer calls `createQtiSchema()` and gets the real thing.

A **service** earns its place only if version skew across consumers has to be controlled centrally
rather than by dependency ranges, or if something needs conversion without a JS runtime. Neither
applies today. Default to the library; revisit if a deployment reason appears.

The likely first consumer is an **MCP server over the roundtrip format**, in Node, replacing the
.NET one. That does not change the answer — it confirms it. An MCP server is LLM-facing by
construction, which is the audience these three functions exist for, and it would *import* the
library rather than replace it. It also puts the stale hand-copied schema out of its misery: the
server builds the schema itself and validates against it with `validateHtml`, so what it hands an
LLM cannot fall behind the editor that produced it.

---

## Known blockers for a shipped Node build

1. **`@qti-components/*` dists use extensionless imports** (`./elements/qti-associable-hotspot`,
   both directory and file form). `tsc` emits ESM without rewriting specifiers, so Node's resolver
   rejects them. The spike works around it with a resolve hook; the fix belongs in that build. Same
   family as the Vite-only `?inline` stylesheet specifier fixed in `509fcae`.
2. **linkedom drops the `xmlns:xsi` declaration** while keeping `xsi:schemaLocation` — 17/17. That
   output is malformed XML. Either shim it, or pick a different DOM implementation.
3. **`.path()` is not idempotent.** Re-importing exported output re-applies `assetBasePath`, yielding
   `/qti/kennisnet//qti/kennisnet/…`. Sharp edge for any import→export→import flow.

---

## Order of work

1. Move `qtiLayoutDiv` into prose-qti; drop the relative import and its eslint-disable from the
   stories, and the duplicate from the Angular editor. **One baseline, nothing lost.**
2. Characterise the 6/17 identity failures — are match/associate recoverable, or is the serialized
   form genuinely lossy? Confirm the browser behaves the same.
3. Only then build `validate()`, on a round-trip that can be trusted.
4. Decide package vs endpoint when a consumer forces the question.

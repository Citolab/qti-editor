# Plan: Surface silent document-load failures

## Goal

A saved file that failed to load came back as *nothing* — no doc, no error, no report. The user saw
an empty editor with no way to tell an empty document from a lost one. Make a failed load say so, so
that a schema change outrunning the migration ladder is visible the first time it bites rather than
mistaken for an empty file.

**Status: complete through phase 7.** Phases 0–3 made failure visible; 4–5 made it legible and closed
the paths that were still silent; 6 shared the rules with the second editor; 7 made every word of it
replaceable from outside. Outstanding items are collected under
[What is left](#what-is-left).

Predecessor: `apps/qti-prosekit-app/src/lib/compatibility/migrations/json-v6-to-v7.ts` — that fixes
the instance. This plan is about the class.

### Delivered

| File | Role |
|---|---|
| `packages/prose-qti/src/schema-recovery/validate.ts` | `findSchemaViolation` — the explicit `check()` nothing was doing |
| `packages/prose-qti/src/schema-recovery/salvage-json.ts` | Unwrap-and-keep recovery for content the schema cannot represent |
| `apps/qti-prosekit-app/src/lib/compatibility/report-channel.ts` | Report delivery that does not depend on who mounted first |
| `apps/qti-prosekit-app/src/components/CompatibilityNotice.tsx` | The listener that never existed |
| `apps/qti-prosekit-app/src/lib/fileStore.ts` | `quarantineAutoSaveDoc` / `clearAutoSaveDoc`; `loadFile` no longer stamps an unmigrated doc as current |
| `schema/document-corpus/*.json` + `document-corpus.browser.test.ts` | Every document version still opens; current version exercises every node type |
| `schema/schema-fingerprint.{ts,json}` + `schema-fingerprint.browser.test.ts` | Complete cover over breaking-shaped schema changes |
| `packages/prose-qti/src/schema-recovery/` | The rules, moved out of the app: validate, salvage, DOM gap scan, recovery markers |
| `apps/qti-prosekit-app/src/lib/compatibility/describe.ts` | Change log -> words a person can act on |
| `apps/qti-prosekit-app/src/extensions/recovery-marker-extension.ts` | Marks the spots in the document itself |
| `apps/qti-prosekit-app/src/lib/compatibility/recovery-channel.ts` | Notice <-> editor: which sites are marked, take me there, clear |
| `packages/prose-qti/src/schema-recovery/notice/` | `renderSchemaGapNotice` + its stylesheet — plain DOM, used by the minimal editor and the regression story |
| `packages/prose-qti/src/schema-recovery/messages.ts` | `withHostMessage` — the host has the last word, and cannot break recovery with it |
| `docs/compatibility-messages.md` | The contract: kinds, fields, and the three seams |

---

## Phase 0 — Facts established

### How a load can fail

Documents persist as ProseMirror JSON with an embedded `schemaVersion` marker
([fileStore.ts](apps/qti-prosekit-app/src/lib/fileStore.ts)), in localStorage and mirrored to
Firestore per user ([firestoreSync.ts](apps/qti-prosekit-app/src/lib/firestoreSync.ts)). `loadFile`
runs the migration ladder eagerly via `readPersistedDoc`.

A stored doc is rejected at one of two stages, and **only one of them used to fail at all**:

1. **`nodeFromJSON` throws** — an attr whose stored value no longer satisfies the spec's `validate`.
   Observed: `Expected value of type string,null for attribute width on type image, got number`.
2. **`check()` fails** — the doc parses but is structurally invalid. Observed:
   `Invalid content for node doc: <image>`, from `image` moving block → inline.

Stage 2 was silent. Measured: `EditorState.create` performs **no** validation, and nothing in the app
called `Node.check()`, so a structurally invalid document was accepted into a live, editable,
autosaving editor and merely misbehaved later. That is worse than an empty document, because the
corruption is then editable.

Both arise the same way: a node spec changes without a matching migration step.

### The four places it went quiet

| Location | Behaviour |
|---|---|
| [json.ts](apps/qti-prosekit-app/src/lib/compatibility/json.ts) | `readPersistedDoc` returns `{}` for anything failing `isNodeJson` — documented as "safe for untrusted input" |
| [fileStore.ts](apps/qti-prosekit-app/src/lib/fileStore.ts) | `listFiles` returns `[]` on any parse throw |
| [fileStore.ts](apps/qti-prosekit-app/src/lib/fileStore.ts) | `saveFile` — bare `catch { /* ignore corrupt state */ }` |
| [local-storage-doc-persistence-plugin.ts](apps/qti-prosekit-app/src/extensions/local-storage-doc-persistence-extension/local-storage-doc-persistence-plugin.ts) | `readPersistedStateFromLocalStorage` — `catch { return {}; }` |

The report channel looked like an existing seam — `handleLoad` built a `CompatibilityReport` and
dispatched `qti:compatibility:report`. It was **write-only**: nothing anywhere called
`addEventListener` for that event, so every report ever built was discarded. Reusing it meant writing
the listener, not pointing failure at it.

### What is NOT wrong here

`readPersistedDoc`'s tolerance is correct for its stated job — it reads untrusted input and must not
throw. The defect was that the caller could not distinguish *"this was empty"* from *"this could not
be read"*, because both are `{}`.

---

## Phase 1 — Make failure representable — DONE

Built as a standalone `findSchemaViolation(schema, doc)` rather than as a failure arm on
`ReadPersistedDocStateResult`. `readPersistedDoc` runs before the schema is available — it is pure
JSON-to-JSON migration — so it is the wrong place to ask a schema question. The check belongs where
the schema exists, which is the editor element.

It returns `{ stage: 'parse' | 'structure' }`. The `structure` arm is the one that matters, for the
reason in Phase 0: nothing else in the stack was ever going to catch it.

## Phase 2 — Report it — DONE

Three options were on the table: (a) reuse the report channel, (b) build a distinct failure surface,
(c) refuse to open and keep the file untouched.

(c) was the one that mattered, because the data-loss chain behind it was real and traced:

1. `loadFile` wrote the loaded doc back to the autosave key as
   `stampSchemaVersion(result.doc ?? file.doc)`. On the `??` fallback an **unmigrated** doc was
   stamped as current — after which `sourceVersion` reads as current and the ladder skips it forever.
2. If the doc then failed to load, the editor mounted empty.
3. The persistence plugin debounce-writes on every change (250 ms), so the empty editor overwrote
   the autosave key.

The margin that saved it was that the *files list* entry still held the original — `loadFile` never
writes there — so content survived until the user saved over it. Fragility, not confirmed loss.

**Resolved as (a) + (c) together, not either/or.** The original is copied aside *before* anything
else, so the chain is cut regardless of what is shown. Then salvage recovers what it can and the user
is told what was removed.

Refusing to open outright was rejected. A document usually fails over one node type the schema no
longer has; losing the other ninety-nine percent to protect the one percent is a worse trade than
saying plainly what was dropped.

### Salvage semantics

The JSON path had no leniency at all, and the DOM path already had exactly the right behaviour —
measured, not assumed:

| path | unknown node | unknown mark |
|---|---|---|
| DOM (`DOMParser`) | unwrapped — children kept | dropped, text kept |
| JSON (`nodeFromJSON`) | **throws** | **throws** |

Salvage applies the DOM rules to JSON by hand (it lives in `packages/prose-qti/src/schema-recovery/`
since phase 6): unwrap unknown nodes keeping their children, drop
unknown marks keeping the text, drop undeclared attrs, reset attr values the schema rejects.
Everything removed is recorded as a change *and* preserved verbatim in `preservedFragments`.

Ordering matters: the original is quarantined **before** salvage runs, and if that copy fails nothing
is cleared. Salvage is lossy by definition, so the pre-salvage document has to survive — it is the
only thing a future migration step could be run against.

### Delivery

The startup report is published from the editor element's `updated()`, which runs during React's DOM
commit — before any `useEffect` has registered a listener. Deferring a tick narrows the window but
does not close it; a startup report was observed firing into an empty room. `report-channel.ts`
retains the report so a late-mounting consumer collects it regardless of who won the race.

## Phase 3 — Close the loop that let it happen — DONE

Nothing tied a node-spec change to a `CURRENT_SCHEMA_VERSION` bump. `schema/notes.ts` documented the
image decision and `ed8ede6` added `schema/img-roundtrip.browser.test.ts` — the change was deliberate
and tested. But `schema/` guarded the *schema* while the migration ladder guarded *stored documents*,
and the two never met.

**Both mechanisms, because neither subsumes the other.**

| | covers | blind to |
|---|---|---|
| **corpus** | documents precisely — only fires on real breakage | node types no fixture contains |
| **fingerprint** | the schema completely | whether a document actually broke |

The corpus shipped first and alone, and measuring it showed why that was not enough: **12 of 37 node
types**. Every drag-and-drop interaction, every table node and the rubric block were absent, so the
same change that broke `image` could have been made to `qtiGapMatchInteraction` with the suite green.

Two things closed it:

- The **current-version fixture now exercises all 38 node types and both marks**, with a test that
  keeps it that way. This is the half that matters: historical fixtures are frozen, so it is the
  *newest* fixture the next schema change gets tested against. A document committed today becomes a
  historical document the moment the version moves.
- The **targeted fingerprint** records only the four things that can stop an old document loading —
  a node or mark disappearing, `inline` flipping, a content expression changing, an attribute's
  `validate` changing.

Adding a node, adding an attribute, or widening content does **not** fail the fingerprint. That
restraint is the design, not an omission: the standing objection to fingerprints is that they fire on
ordinary schema work and get re-blessed unread, and a check nobody reads is not a check.

One precision detail: the baseline records **every** attribute with its `validate` (empty string when
it declares none), not only the validating ones. Otherwise "attribute gained a validate" (breaking)
is indistinguishable from "attribute was added" (safe). Attribute *removal* is deliberately quiet —
ProseMirror ignores undeclared attrs, so it loses data on the next save but does not stop the load.
That is a different problem from this one.

### Verified to fail when it should

A guard rail that has only ever passed proves nothing. Each was confirmed by breaking it on purpose
and restoring afterwards.

Corpus:

- Remove `jsonV6ToV7` from the ladder → **only** the v6 fixture fails, naming the fix: *"A node spec
  changed without a migration step to carry old documents across. Add one and bump
  CURRENT_SCHEMA_VERSION rather than editing the fixture."*
- Bump `CURRENT_SCHEMA_VERSION` with no new fixture → the coverage test fails.

Fingerprint — all nine cases:

| change | expected | result |
|---|---|---|
| `inline` flipped | fires | ✓ |
| content expression changed | fires | ✓ |
| attr `validate` changed | fires | ✓ |
| node removed | fires | ✓ |
| mark removed | fires | ✓ |
| node added | quiet | ✓ |
| attr added | quiet | ✓ |
| attr removed | quiet | ✓ |
| mark added | quiet | ✓ |

Pointed at the real historical regression it reproduces it exactly:

```
These schema changes can stop a document written at v7 from loading:
  image: inline  false  ->  true
  image: attr width validate  number  ->  string|null
```

## Phase 7 — Make the wording replaceable from outside — DONE

Everything above decides what to *say*. This is about who gets to decide it. Three audiences, three
seams, and the reason they differ is that they know different things: a package cannot know a locale,
an embedder cannot patch a package, and the minimal editor has no i18n library to hook into.

Full write-up in [compatibility-messages.md](../docs/compatibility-messages.md). The design turns on
one line: **the contract is the facts, not the sentence.** A change already carried `code`,
`nodeType`, `attributeName`, `data.excerpt`, `data.markType`, `data.rejectedValue` — the English
`message` was never parsed by anything. Stating that plainly is most of the work; two things blocked
it.

### `kind`, because inferable is not knowable

A dropped mark was `UNKNOWN_NODE_PRESERVED` *plus the presence of* `data.markType`. A reset attribute
was `UNKNOWN_ATTRIBUTE_PRESERVED` *plus the presence of* `data.rejectedValue`. Both correct, and both
requiring a reader to reverse-engineer which optional fields distinguish which case — fine for the one
host that grew up alongside the code, an unwritten contract for anyone else.

`RecoverySiteKind` already named exactly those cases, but only on the *site*, not the change. Now
every change declares one, and a message table is a total function over a closed union. The app's
`describe.ts` switches on it and lets the compiler find the missing case.

`unrepresentable-element` is a sixth kind rather than being folded into `unwrapped-node`, even though
`DOMParser` unwraps both the same way: *"this element has no equivalent in this editor"* (a file being
imported) and *"this was removed from your saved document"* (work already done) are different
sentences, and only the producer knows which situation it is in.

The old inference stays as a fallback, because a change can outlive the code that made it — one is
sitting in a quarantined document right now.

### The seams

| Audience | Seam |
|---|---|
| Consuming the package | `getMessage` on `salvageJsonDocument` / `findUnrepresentableElements`, `describeSite` on the marker plugin |
| Embedding the full editor | i18next keys, overridable at runtime via `addResourceBundle` — including `compatibilityTypeLabel.<type>` |
| Embedding the minimal editor | a partial `messages` object on `renderImportNotice` |

Two decisions worth keeping:

- **No global registry.** It is the most literally "runtime" answer and the wrong one: two consumers
  on one page would fight over one mutable table, and a test would have to remember to reset it. A
  per-call option carries the same information with none of that.
- **The resolver receives the whole change**, not the ladder's `(code, data)`. Three of the six kinds
  share two codes, and `nodeType` / `attributeName` are fields on the change rather than entries in
  `data` — so the older signature literally cannot express the case. Adapting one is a single line,
  and two honest signatures beat one that cannot say what it needs to.

### Verified, not assumed

- **Runtime override works.** `addResourceBundle` turns *"A gap match interaction was removed"* into
  *"HOUSE STYLE: gap match interaction is weg"* with no rebuild, and a nested
  `compatibilityTypeLabel` bundle turns it into *"A gap-match question was removed"*. Measured before
  the doc claimed it.
- **A resolver that throws costs a translation, not the recovery.** It did not, when the doc first
  said so — `getMessage` was called bare. `withHostMessage` now catches: host code runs in the one
  path that executes only when something has already gone wrong, and a missing translation key must
  not take the document down with it.
- **Naming has one seam, not two.** An earlier sketch had a `labels` map parameter alongside the i18n
  keys. `compatibilityTypeLabel.<type>` does the same job through the mechanism that already exists,
  overridable by the same call, with nothing new to learn.
- **Both seams are exercised, in Dutch, by the dropped-content stories.** A seam nobody has used is a
  seam that works until the day someone needs it. `DUTCH_NOTICE_MESSAGES` replaces the notice's own
  sentences — *"Deze editor kan 5 elementen in dit item niet weergeven"*, with the Dutch quotation
  pair („…”) so the override is visible at a glance — and `dutchRecoveryMessage` replaces the `message`
  on each change. The notice renders from the facts and deliberately does not display that second
  one, so it is asserted in the test file, alongside the same call without a resolver to prove the
  override is doing the work rather than a locale being wired in upstream. The author's own words pass
  through both untranslated: `basisch` is their content, not ours to phrase.

---

## Running any of this

The suite was unrunnable for the whole of the work above: playwright 1.62.1 wants browser build 1234
and the machine had 1217, which surfaced as a wall of cascading esbuild "server is being restarted"
errors that look like build failures and are not. `pnpm exec playwright install chromium` fixes it.

Both guard rails live in the **browser** vitest project, because they need the real composed schema
via `buildEditorSchema()` and the QTI components are built for a bundler:

```
npx vitest run --project browser schema/
```

Baseline at the close of this work: **44 files, 176 passed, 2 skipped**.

Note that `schema/` sits outside the root tsconfig's `include`, so the `@citolab/*` path aliases do
not reach it — both tests import the app by relative path, as `editor-schema.ts` already did.

---

## Phase 4 — Say what was lost, in the reader's words — DONE

The report was complete and unreadable. It is written for the pipeline: one entry per removal, in
document order, in schema vocabulary — *Removed unknown node "qtiGapMatchInteraction" and kept its 3
child node(s)* at `$.content[4].content[1]`. Every word true; none of it tells the person who wrote
the question what they lost.

Three things changed that.

**Salvage now quotes the content.** Each removal carries an excerpt of the text it took with it, so a
finding reads *A graphic gap match interaction was removed — “Sleep elke stad naar de juiste
provincie Amsterdam Rotterdam”*. The type name stays, in small print: the person debugging the
schema change is also a reader, and it is the only part they need.

**The notice groups by what kind of thing went** — content, formatting, settings — rather than
listing changes in document order. Type names are turned into words (`qtiGapMatchInteraction` -> "gap
match interaction", the `qti` prefix dropped) with no dictionary, deliberately: the names this has to
handle are the ones the schema no longer has, so a lookup table would be missing exactly the entries
that matter.

**And the document is marked where the content used to be.** This is the part that needed real
machinery. Salvage runs on JSON, before any document exists, so it cannot record positions — it
records child-index paths into the salvaged tree, and `resolveRecoverySites` turns those into
positions once the document is mounted. Two details make that safe rather than approximate:

- Paths are in the *output's* coordinates, not the input's. Unwrapping shifts every later index, so
  the walk tracks where each node's output lands rather than where it came from.
- Every site carries the node type it expects to find, and resolution discards it on a mismatch. The
  editor re-imposes a locked header after salvage, which moves every top-level index; a missing
  marker is a small loss, a marker pointing at innocent content is a lie about the user's document.

Markers are decorations, so they touch neither the document nor what is saved, and they follow the
content as it is edited. The notice offers "show me" only for sites the editor confirms it marked —
`publishRecoveryMarkers` reports back which resolved — because a button that silently does nothing is
worse than no button.

The quarantined original is now reachable too: **Download original** hands back the pre-salvage
document. It had been write-only since it was introduced, which is a safety net nobody can climb
into.

### Verified in the running app

`Decoration.node` describes exactly one node and is **silently discarded** when its range spans more.
Unwrapping hands *all* of a node's children to the parent, so the common case is several — the site
resolved, the notice offered "show me", and nothing was marked. Now one decoration per covered node,
locked down by a unit test that counts them.

Screenshotted end to end with a document using a node type the schema does not have plus an unknown
mark: banner, both groups, both excerpts, four markers (three unwrapped paragraphs, one inline mark).

## Phase 5 — Close the paths that were still silent — DONE

Three remained, and all three had the same shape: a real failure with nowhere to appear.

**A refused file load did nothing at all.** `loadFile` returning `null` meant both "no such file" and
"this file cannot be read", and the caller treated both as nothing-to-do — the file stayed in the
list, clicking it had no effect, and the editor went on showing the previous document under the
previous name. It now returns an outcome (`loaded` / `missing` / `refused`), carrying the file,
because the *name* is what makes the news usable. The refusal is reported as an error and the editor
deliberately does **not** remount: remounting would rebuild from the autosave slot, and the previous
document would reappear looking like the file just clicked.

**JSON import was harsher than restore.** It called `schema.nodeFromJSON` inline and showed
`alert('Failed to import JSON file')`, so a document written before a schema change could be restored
from localStorage but not imported from a file — the same content, two verdicts. It now runs the same
ladder, check, salvage and report as any other load.

**XML import reported nothing, ever.** `DOMParser` skips an element no rule matches and parses its
children in its place, silently; the QTI standard is larger than any editor's schema, so this is not a
rare case. `findUnrepresentableElements` asks the schema what it can match *before* the parse. It
raises a finding only when no rule's tag selector matches — the same `matches()` test `DOMParser`
applies — so it can miss a drop but cannot invent one. Silence is not proof nothing was lost; a
finding is proof something was.

That required splitting the roundtrip import in two (`itemBodyFromString` / `parseItemBody`), so the
item body can be inspected *after* the transforms have run — nothing a transform consumes is mistaken
for lost content — and *before* the parse, which is where the losing happens.

### The wrapper problem, measured

First run over the sixteen Kennisnet items: **fifteen findings, all true, none worth telling anyone**
— a `qti-content-body` inside almost every `qti-rubric-block`, plus a `thead`/`tbody` pair in the one
item with a table. Wrappers whose children *are* the content: the text inside them parses in their
place and reads identically.

A notice that fires on every single import is a notice nobody reads, and the next one — about an
interaction that really did go missing — is read no more carefully. So `TRANSPARENT_WRAPPER_TAGS`
names them explicitly rather than guessing with a heuristic, and everything else still speaks. The
list is how findings get silenced, so it should only ever hold wrappers whose children are the
content.

Guarded from both sides in `import-gaps.browser.test.ts`: every sample item imports with nothing to
report, **and** an item using `qti-associate-interaction` is named, quoted and preserved while the
rest of the item still imports.

### What the export loses — the e2e case

The unit tests prove the scan's rules and the app tests prove it is wired up. Neither answers the
question an author would actually ask: *if the editor dropped it, what happens to my item when I
save?* That needs import → edit → export, which is what `apps/e2e` has.

`dropped-content.regression.{stories,browser.test}.ts` answers it with no new fixture. ITEM015 is the
gap-match item; each regression story composes the base schema plus exactly **one** interaction, so
importing ITEM015 into the choice-only editor is a real subset-schema mismatch built out of parts
already in the repo — the same position `apps/qti-prosemirror-item` is in against a real item, and
the same position the full editor is in when an item uses an interaction nobody has written a
descriptor for.

The answer is the uncomfortable one, and it is why the notice had to exist: **the export is a
complete, valid QTI item with the interaction gone** — no `qti-gap-match-interaction`, no
`qti-gap-text`, no `RESPONSE` declaration. Saving over the source destroys it. So the tests assert the
loss rather than guard against it, and pin the two things that make it survivable: it is *named*
(with the author's own words — `basisch`, *"oplossing met een pH"* — not a type name) and it is
*bounded* (the prose and the rubric block still roundtrip).

A control test matters as much as the finding: the same fixture in the gap-match editor reports
nothing. Without it, the first test proves only that the scan fires, not that it fires for a reason.

`findImportGaps()` now sits on `createRegressionEditor`, so any regression story can ask the same
question.

The stories themselves needed a second pass. As first written, the one story rendered the item with
the interaction silently absent — a faithful depiction of the bug and a useless demonstration of the
fix: it looked like an ordinary item, and the Interactions panel reported a bare "pass" because none
of the sixteen regression stories has a `play` function. Now there are **two**, both rendering
`renderImportNotice` from the minimal editor (the shipping component, not a lookalike, so its CSS
moved next to it in `import-notice.css` and both the app and the story import that one file):

- `GapMatchInAChoiceOnlyEditor` — the notice names three element types with counts and excerpts, and
  below it `basisch` / `zuur` lie loose in the prose with two holes in the sentence.
- `GapMatchInItsOwnEditor` — the same fixture through the same pipeline, interaction intact, notice
  hidden. Flip between them and the loss is self-evident.

Each has a `play` function, so the Interactions panel shows real steps and the `storybook` project
asserts them. Still not VRT-tagged — the play assertions pin what matters and every baseline is one
more thing to re-bless on an unrelated change.

## Phase 6 — The same gap in the minimal editor — DONE

`apps/qti-prosemirror-item` imports QTI XML straight from a URL into a schema that models ten
interactions and its own node overrides. Same silent drop, sharper: the narrower the schema, the more
`DOMParser` unwraps. Measured against the same corpus, it reported exactly what the full editor did —
the wrappers and nothing else.

So the rules moved to **`@citolab/prose-qti/schema-recovery`** and both editors use them. What moved
is what is about ProseMirror and nothing else: `findSchemaViolation`, `salvageJsonDocument`,
`findUnrepresentableElements`, `resolveRecoverySites`, the marker plugin. What stayed in the app is
what only the app can know — the migration ladder, `CURRENT_SCHEMA_VERSION`, storage keys,
quarantine, the report channel, and the wording. `apps/.../compatibility/salvage.ts` is now a
version-stamping wrapper and `validate.ts` a re-export.

This does not reverse the earlier decision to move the *engine* out of the shared package and into the
app. That was about the ladder, which is genuinely app-specific. These are schema-vs-content
functions with no host knowledge at all, and the minimal editor needing them is the proof.

The minimal editor gets the report, not the markers: its loss happens inside `DOMParser`, which
yields no positions to mark. One line per element *type* with a count, because an item body with
thirty unrepresentable `<span>`s would otherwise produce thirty identical lines.

### The notice belongs to the package too

It was written in the minimal editor, and the regression story then imported it — component and
stylesheet — by relative path across an app boundary. That is the wrong shape however well it works:
an app is not somewhere other apps or stories may reach into, and two consumers is the definition of
shared code. So `renderSchemaGapNotice` and `notice.css` moved to
`@citolab/prose-qti/schema-recovery/notice`, and both consumers import the package.

Two things the move fixed rather than merely relocated:

- **The stylesheet was keyed on `#import-notice`**, an element id belonging to one app's markup, which
  the story had to reproduce to get any styling. It is class-based now, and the function applies the
  classes itself, so no host has to know a magic id — the story's play functions query
  `SCHEMA_GAP_NOTICE_CLASS`, which is exported for that purpose.
- **The name described a use case, not the thing.** `renderImportNotice` reads as "the import screen's
  notice"; what it actually renders is a `SchemaGapOutcome`, from wherever one came.

Tests split along the same line: how a finding is rendered and worded is the component's
(`notice.browser.test.ts`, hand-built outcomes, no editor), while what a *given* schema cannot
represent stays with that schema (`apps/qti-prosemirror-item/src/schema-gaps.browser.test.ts`, the
sample corpus).

One cross-app import remains and predates this work: `prosemirror-base.ts` reaches into
`apps/qti-prosemirror-item` for `attributes-panel-plugin`. Same violation, bigger move — the plugin is
app-level example code, not obviously package material — so it is called out rather than quietly
changed.

### And the app kept shadows of what moved

Two files in `lib/compatibility/` were left behind as thin covers over the package, with the *same
names* as the things they covered — `validate.ts` beside the package's `validate.ts`, `salvage.ts`
beside `salvage-json.ts`. Opening either told you nothing, and grep found two of each.

- `validate.ts` was twelve lines of pure re-export. Deleted; its two callers import the package. That
  also removes one of `schema/`'s reaches into the app — the question it asks is a ProseMirror
  question, so it can ask ProseMirror.
- `salvage.ts` only stamped `CURRENT_SCHEMA_VERSION` onto the outcome, which is exactly what
  `report.ts`'s `schemaGapReportSource` already does for the *other* outcome. It is now
  `salvageReportSource` beside it, and the two conversions read as the pair they are.

What is left in `lib/compatibility/` is only what the app genuinely owns: the ladder (`json.ts`,
`helpers.ts`, `migrations/`), report building and delivery (`report.ts`, `report-channel.ts`,
`recovery-channel.ts`), and the wording (`describe.ts`).

---

## Running any of this

Baseline at the close of this work: **`--project browser` 33 files, 199 passed, 2 skipped** (from
29 / 157 before it), plus **`--project storybook` 17 files, 18 passed**.

Moved to **34 files, 248 passed, 2 skipped** on 2026-08-20 by `ladder.browser.test.ts` and the HTML
ladder's removal — see the two entries under *What is left*.

```
npx vitest run --project browser packages/prose-qti/src/schema-recovery   # the rules
npx vitest run --project browser apps/qti-prosekit-app                    # startup + import wiring
npx vitest run --project browser apps/qti-prosemirror-item                # the minimal editor
npx vitest run --project browser apps/e2e/stories/dropped-content         # what the export loses
npx vitest run --project browser schema/                                  # corpus + fingerprint
```

If the suite dies in a wall of cascading esbuild "server is being restarted" errors, that is
playwright's browser build being out of date, not a build failure: `pnpm exec playwright install
chromium`.

---

## What is left

- **Attribute removal still loses data silently.** Out of scope here — it does not stop a load — but
  it is real, and nothing reports it.
- **The corpus asserts loadability, not fidelity.** A migration that loads a document but mangles its
  content would pass. Asserting on content in the fixtures would close that.
- ~~**The HTML migration ladder is unguarded *and uncalled*.**~~ **Resolved 2026-08-20 — deleted.**
  The question this left open was whether the XML import path should be wired through it. It should
  not, and the answer turned out not to be a judgement call:
  - **Its premise never happened.** The one step renamed camelCase QTI attrs to hyphenated. Every
    node spec's `toDOM` has only ever written hyphenated, and `git log -S` across all branches finds
    no commit that ever wrote a camelCase QTI attribute into the DOM. It migrated from a version that
    never shipped. The whole subsystem — both v1→v2 steps — landed in one commit (`0bbeed9`); the
    JSON half had a real document to fix (see `document-corpus/v1.json`), the HTML half was symmetry.
  - **For files that *are* camelCase it was insufficient, not just unnecessary.** That means QTI 2.x,
    which is camelCase in *element* names too, and parse rules key on `tag:
    'qti-choice-interaction'`. `DOMParser` skips an element no rule matches and parses its children
    in its place, so a 2.x file loses the interaction wholesale whether or not its attributes were
    renamed first. QTI 2.x support is a transform-layer job — `qtiTransformItem` has no 2→3
    conversion — not a ladder job.
  - **Its version detection could not work for an import.** `detectVersion` returned null unless the
    caller passed `sourceVersion`, and content sniffing was explicitly ruled out. An importer cannot
    know what wrote a file, so every real import took the v1 fallback: an unconditional rename pass
    over every file, wearing a ladder's clothes.
  - `preserveHtmlFragments` went with it, for the reason noted here originally — it answered from an
    allow-list what `findUnrepresentableElements` answers by asking the schema.

  Removed: `dom.ts`, `migrations/html-v1-to-v2.ts`, `HTML_MIGRATION_STEPS`, and the five `html*`
  helpers in `helpers.ts`. The runner's forward-skip branch existed to let HTML stop at v2 while JSON
  continued; it survives as a corrupt-marker recovery path (a stored `schemaVersion: 0` must still
  open, since `readPersistedDoc` promises to be safe with untrusted input) but now warns instead of
  logging `info`, and `ladder.browser.test.ts` asserts the JSON chain has no gaps. Two plans that
  assumed the ladder — `rubric-block-attribute.md` and `import-detect-editor-origin.md` — carry
  dated banners saying what to do instead.
- **The ladder's steps are now covered branch by branch.** `ladder.browser.test.ts` (49 tests) sits
  beside the corpus and divides the work with it: the corpus asks whether an old document still opens
  (real schema, frozen fixtures), the ladder test asks whether each step does what it says and
  reports what it did (no schema, hand-built shapes). It was written because a fixture is one
  document and a branch needs several — every `severity: 'warning'` in the ladder was unreachable
  from a test, and coverage of the two frozen tables stood at 1-of-9 and 1-of-10. Both are exported
  now and the tests iterate them, so an entry added without being exercised fails. It found three
  defects on the way in: v1→v2 logged a `RENAME_ATTRIBUTE` for a rename that never survived and, in
  one key order, dropped the legacy value with no warning at all (violating invariant 1) — and both
  v1→v2 and v4→v5 had dead identity short-circuits, rebuilding the whole document on a no-op
  migration because `Array.map` always allocates.
- **Quarantine holds one document and cannot be restored in place.** It can be downloaded now, and
  the newest unreadable document overwrites the previous one. Re-opening a quarantined document once
  a migration step exists is still a manual re-import.
- **The DOM path has no markers.** `findUnrepresentableElements` says what an import could not
  represent but not where, because `DOMParser` yields no positions. Marking those would mean parsing
  with position tracking of our own.
- **`TRANSPARENT_WRAPPER_TAGS` is a list, and lists go stale.** A wrapper added to QTI or to a node
  spec's `parseDOM` will show up as a finding on every import until someone decides which it is. That
  is the intended failure direction — noisy, not silent — but it is a maintenance edge.

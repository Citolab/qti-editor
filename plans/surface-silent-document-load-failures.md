# Plan: Surface silent document-load failures

## Goal

A saved file that fails to load currently comes back as *nothing* — no doc, no error, no report. The
user sees an empty editor and has no way to tell an empty document from a lost one. Make a failed
load say so, so that a schema change outrunning the migration ladder is visible the first time it
bites rather than mistaken for an empty file.

Deferred deliberately: this is a behaviour change to the app's load path, not a bug fix, and it
wants a UI decision (see Phase 2). Written up now because the v6 → v7 migration was prompted by
exactly this failure mode being invisible.

Predecessor: `apps/qti-prosekit-app/src/lib/compatibility/migrations/json-v6-to-v7.ts` — fixes the
instance. This plan is about the class.

---

## Phase 0 — Facts established

### How a load can fail

Documents persist as ProseMirror JSON with an embedded `schemaVersion` marker
([fileStore.ts:54-61](apps/qti-prosekit-app/src/lib/fileStore.ts#L54-L61)), in localStorage and
mirrored to Firestore per user ([firestoreSync.ts](apps/qti-prosekit-app/src/lib/firestoreSync.ts)).
`loadFile` runs the migration ladder eagerly via `readPersistedDoc`
([fileStore.ts:108-116](apps/qti-prosekit-app/src/lib/fileStore.ts#L108-L116)).

A stored doc is rejected at one of two stages, and neither is reported today:

1. **`nodeFromJSON` throws** — an attr whose stored value no longer satisfies the spec's `validate`.
   Observed: `Expected value of type string,null for attribute width on type image, got number`.
2. **`check()` fails** — the doc parses but is structurally invalid against the current schema.
   Observed: `Invalid content for node doc: <image>`, from `image` moving block → inline.

Both arise the same way: a node spec changes without a matching migration step.

### The three places it goes quiet

| Location | Behaviour |
|---|---|
| [json.ts:86-87](apps/qti-prosekit-app/src/lib/compatibility/json.ts#L86-L87) | `readPersistedDoc` returns `{}` for anything failing `isNodeJson` — documented as "safe for untrusted input" |
| [fileStore.ts:66-68](apps/qti-prosekit-app/src/lib/fileStore.ts#L66-L68) | `listFiles` returns `[]` on any parse throw |
| [fileStore.ts:85](apps/qti-prosekit-app/src/lib/fileStore.ts#L85) | `saveFile` — bare `catch { /* ignore corrupt state */ }` |
| [local-storage-doc-persistence-plugin.ts:31-32](apps/qti-prosekit-app/src/extensions/local-storage-doc-persistence-extension/local-storage-doc-persistence-plugin.ts#L31-L32) | `readPersistedStateFromLocalStorage` — `catch { return {}; }` |

Note the asymmetry already in place: when migration *does* run, `handleLoad` builds a report and
dispatches `qti:compatibility:report`
([use-file-operations.ts:136-147](apps/qti-prosekit-app/src/hooks/use-file-operations.ts#L136-L147)).
So there is a working channel for "something happened to your document" — failure just does not use
it. That is the cheapest seam to build on.

### What is NOT wrong here

`readPersistedDoc`'s tolerance is correct for its stated job — it reads untrusted input and must not
throw. The defect is that the caller cannot distinguish *"this was empty"* from *"this could not be
read"*, because both are `{}`. Fix the return type, not the tolerance.

---

## Phase 1 — Make failure representable

Give `ReadPersistedDocStateResult` an explicit failure arm rather than an absent `doc`, carrying the
stage (`parse` | `validate`) and the underlying error message. Then:

- Wrap the `nodeFromJSON` / `check()` call site so stage 2 failures are caught rather than escaping
  as an unhandled render error.
- Keep returning a usable empty doc so the editor still mounts — but return it *alongside* the
  failure, never in place of it.

Guard rail: a test that feeds each known-bad shape through `loadFile` and asserts a failure is
reported. The two shapes in Phase 0 are the starting corpus; every future migration should add its
own pre-migration shape to it.

## Phase 2 — Report it (needs a decision)

The report channel exists; what to *show* is the open question:

- **(a) Reuse `qti:compatibility:report`** — one channel for "your document changed or could not be
  read". Cheapest, and the panel already renders it.
- **(b) A distinct failure surface** — a load failure is not a migration note, and conflating them
  risks a hard failure reading as an advisory.
- **(c) Refuse to open, and keep the file untouched.** This is the one that matters, and the chain
  it guards against is real — traced, not hypothetical:

  1. `loadFile` writes the loaded doc straight back to the autosave key, stamped at the current
     version: `stampSchemaVersion((result.doc ?? file.doc))`
     ([fileStore.ts:119-122](apps/qti-prosekit-app/src/lib/fileStore.ts#L119-L122)). On the `??`
     fallback an *unmigrated* doc is stamped as current — after which `sourceVersion` reads as
     current and the ladder will never run on it again.
  2. If the doc then fails to load, the editor mounts empty.
  3. The persistence plugin debounce-writes the doc on every change (250 ms), so the empty editor
     overwrites the autosave key
     ([local-storage-doc-persistence-plugin.ts:17-19](apps/qti-prosekit-app/src/extensions/local-storage-doc-persistence-extension/local-storage-doc-persistence-plugin.ts#L17-L19)).

  What saves it today is that the *files list* entry still holds the original `doc` — `loadFile`
  never writes there. So the content survives until the user saves over it, and this is fragility
  rather than confirmed loss. That margin is the whole reason (c) outranks the messaging question.

Recommend deciding (c) first, since it is about data loss rather than messaging.

## Phase 3 — Close the loop that let it happen

Nothing ties a node-spec change to a `CURRENT_SCHEMA_VERSION` bump. `schema/notes.ts` documents the
image decision, and `ed8ede6` added `schema/img-roundtrip.browser.test.ts` — the change was
deliberate and tested. But the drift check governs the *schema* while the migration ladder governs
*stored documents*, and the two never meet.

Options: extend the drift fixture to fail when a node's `attrs` or `inline`/`content` shape changes
without `CURRENT_SCHEMA_VERSION` moving, or keep a committed corpus of documents at each historical
version and assert every one still loads. The second doubles as the Phase 1 guard rail and is
probably the better use of the same effort.

# Plan: Document & Guard the Lossless ProseMirror↔QTI Roundtrip Packages

> **Status:** planning — not yet executed.
> **Owner:** Patrick.
> **Goal:** Make it unambiguous (to humans and LLMs) that the current `package-export` / `package-import` packages are a **self-roundtrip** (ProseMirror → QTI XML → ProseMirror) and **NOT** a generic QTI 3.0 import/export. Document the design, rename for clarity, and add structural guards so future contributors (especially LLMs) cannot accidentally turn them into a generic importer.

---

## Background (facts gathered)

### What these packages actually do today

- **Export** ([packages/qti/package-export/src/index.ts](packages/qti/package-export/src/index.ts))
  - Walks a ProseMirror node tree via `getQtiItems` from `@qti-editor/prosekit-integration/save-qti`.
  - Emits a QTI 3.0 ZIP (`imsmanifest.xml`, `assessment-test.xml`, `items/*.xml`, `assets/*`).
  - Critically, [`preserveEditorDataAttributes`](packages/qti/package-export/src/index.ts#L251-L258) and [`preserveEditorDataAttributesInTag`](packages/qti/package-export/src/index.ts#L260-L275) **mirror ProseMirror-only attributes onto `data-*` attributes inside the QTI interaction tags** before the XML is written. The current set:
    - `correct-response` / `correctResponse` / `correctAnswer` → `data-correct-response`
    - `score` → `data-score`
    - `case-sensitive` → `data-case-sensitive` (text-entry only)
    - `area-mappings` → `data-area-mappings` (select-point only)
  - These `data-*` attributes are the **only** thing that lets a downstream importer reconstruct the editor's authoring state without parsing `qti-response-declaration` / `qti-response-processing`.

- **Import** ([packages/qti/package-import/dist/index.js](packages/qti/package-import/dist/index.js) — note: source-of-truth is on branch `patrick-refactor-branch` commit `9fbb97f`; **not present on `main`** yet)
  - Reads ordered item hrefs from `assessment-test.xml` / `imsmanifest.xml`.
  - For each item, `stripIgnoredQtiSections` removes `qti-response-declaration` and `qti-response-processing` — the importer deliberately ignores them.
  - `applyDataAttributes` walks the parsed item HTML and copies `data-correct-response` → `correct-response`, `data-score` → `score`, `data-case-sensitive` → `case-sensitive`, `data-area-mappings` → `area-mappings`, hydrating ProseMirror-schema attributes.
  - Result: only the itemBody plus `data-*` round-trip information re-enters the editor.

### Why this matters

A generic QTI 3.0 importer would need to **interpret** `qti-response-declaration` / `qti-response-processing` to recover the correct response, score, etc. This package does the opposite: it skips them and trusts the `data-*` attributes that the editor's own export wrote. **Loading a QTI package from a third party will silently lose correct-response / scoring data.** This is by design for the editor's save/restore loop, but it is a footgun for anything else.

### Current naming is misleading

- `@qti-editor/qti-package-export` and (future) `@qti-editor/qti-package-import` sound generic. Anyone — human or LLM — reading the name would reasonably assume these are full QTI 3.0 readers/writers.
- The README in `package-export/package.json` even says *"Reusable QTI 3.0 package ZIP export"*.

### Known repo state caveats

- `packages/qti/package-import/` exists on disk but **only as `dist/` and `node_modules/`** on `main`. The `src/` is on `patrick-refactor-branch` (commit `9fbb97f`). Phase 1 must reconcile this — either bring the source onto `main` first, or do the rename on the refactor branch.
- Consumers today: `apps/editor/src/lib/exportXml.ts` (export) and `apps/editor/src/lib/importXml.ts` (import). Workspace alias declared in `tsconfig.base.json` (`@qti-editor/qti-package-export`) and `apps/editor/package.json`.

---

## Phase 0: Documentation Discovery (DO FIRST, IN A FRESH SESSION)

Goal: produce a single short "Allowed APIs / Allowed File Touch List" markdown so later phases never invent endpoints or files.

Deploy a Documentation Discovery subagent with this brief:

> Read and report back **with exact paths, line numbers, and signatures** for:
> 1. Every exported symbol in `packages/qti/package-export/src/index.ts`. Note which functions write `data-*` attributes.
> 2. Every exported symbol in `packages/qti/package-import/dist/index.d.ts` AND in the source at git ref `patrick-refactor-branch:packages/qti/package-import/src/index.ts` (use `git show`). Note which functions strip `qti-response-*` and which copy `data-*` → schema attributes.
> 3. All consumers of `@qti-editor/qti-package-export` and `@qti-editor/qti-package-import` across the repo (`grep -rn`). Include `apps/editor/src/lib/exportXml.ts`, `apps/editor/src/lib/importXml.ts`, `tsconfig.base.json`, `pnpm-lock.yaml`, any `package.json`, and any docs/README.
> 4. The ProseMirror attribute schemas that map to the four `data-*` attributes — find them in `packages/prosemirror/interaction-*/` and report the file/line where the attribute is declared.
> 5. AGENTS.md / docs/architecture.md — extract any existing "do not modify" / guard convention so the new guards match the project's style.
>
> Output format: a single markdown table per item, with file path, line range, and a 1-sentence summary. **No conclusions, no implementation suggestions.**

Acceptance for Phase 0: a `docs/lossless-roundtrip-discovery.md` file (temporary scratch — not committed unless useful) listing all of the above so Phases 1–5 can copy/reference without re-grepping.

---

## Phase 1: Reconcile branches & decide rename target

**Decisions to make explicit before any code moves:**

1. Bring `packages/qti/package-import/src/` from `patrick-refactor-branch` onto whatever branch this work happens on (cherry-pick `9fbb97f` or rebase). Without source on the working branch, renames are blind.
2. Pick the new package names. **Recommendation:** name them after the *intent* (lossless self-roundtrip), not after a future generic importer that does not exist:
   - `@qti-editor/qti-roundtrip-export` (dir: `packages/qti/roundtrip-export`)
   - `@qti-editor/qti-roundtrip-import` (dir: `packages/qti/roundtrip-import`)
   - Alternative candidates if "roundtrip" reads poorly: `qti-editor-export` / `qti-editor-import`, or `qti-selfio-export` / `qti-selfio-import`. **Confirm with user before Phase 2.**
3. Reserve the names `@qti-editor/qti-export` / `@qti-editor/qti-import` (without `roundtrip-`) for a hypothetical future generic implementation, and say so in the doc. This is the whole point of renaming now.

Verification: a short ADR-style note pinned in `docs/architecture.md` recording the chosen names and the reservation of the generic names. **No file moves yet.**

---

## Phase 2: Rename the packages

Tasks (in dependency order — must run sequentially, not in parallel):

1. `git mv packages/qti/package-export packages/qti/roundtrip-export` (and same for import).
2. Update `package.json` `name` field in each renamed package to `@qti-editor/qti-roundtrip-export` / `-import`. Bump version to `0.2.0` to flag the breaking rename.
3. Update `package.json` `description` to **explicitly** say: *"Lossless ProseMirror↔QTI 3.0 roundtrip — NOT a generic QTI 3.0 importer/exporter. See ROUNDTRIP.md."*
4. Update `tsconfig.base.json` path aliases (both the bare and `/*` entries).
5. Update `apps/editor/package.json` dependency name and `apps/editor/src/lib/exportXml.ts` / `importXml.ts` import specifiers.
6. Run `pnpm install` to refresh the lockfile.
7. Run `pnpm -w typecheck` (or whatever the repo's typecheck script is — discover in Phase 0) to confirm nothing else references the old names.
8. `grep -rn "@qti-editor/qti-package-export\|@qti-editor/qti-package-import\|packages/qti/package-export\|packages/qti/package-import"` across the repo and expect zero hits (excluding the changelog/ADR).

Verification checklist:
- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w test` passes
- [ ] Old strings have zero grep hits
- [ ] `apps/editor` builds and runs the export/import flows manually in the dev server

---

## Phase 3: Author the canonical `ROUNDTRIP.md` doc

Create **one** authoritative doc at `packages/qti/roundtrip-export/ROUNDTRIP.md` (and a symlink or short pointer in `roundtrip-import/ROUNDTRIP.md` saying *"see ../roundtrip-export/ROUNDTRIP.md"*).

Required sections:

1. **What this is and what this is NOT.** First paragraph, bold. State plainly: lossless ProseMirror↔QTI roundtrip via `data-*` attributes; **silently lossy on third-party QTI** because `qti-response-declaration` and `qti-response-processing` are ignored on import.
2. **The roundtrip contract.** A table listing every `data-*` attribute, its ProseMirror schema source, the interaction tag(s) it applies to, and the file/line in `roundtrip-export/src/index.ts` where it's written + the file/line in `roundtrip-import/src/index.ts` where it's read. The table is the source of truth — if it changes, both packages must change in lockstep.
3. **The asymmetry.** Diagram (ASCII is fine): export writes both QTI standard nodes (`qti-response-declaration`, `qti-response-processing`) *and* `data-*` mirrors. Import discards the standard nodes and only reads `data-*`. State why: the editor's authoring model holds richer state than QTI's standard response model can express, and reconstructing it from QTI standard nodes is lossy.
4. **When you would need a generic QTI 3.0 importer instead.** When importing third-party QTI, when a `data-*` attribute is absent. State that this is a separate (not-yet-built) package and reserve the names.
5. **How to add a new roundtripped attribute.** Step-by-step: add it to the ProseMirror schema; add a mapping to `EDITOR_DATA_ATTRIBUTE_MAPPINGS` (or the interaction-specific list) in export; add the inverse mapping to `DATA_ATTRIBUTE_MAPPINGS` in import; add a roundtrip test; update the table in this doc.
6. **What NOT to change** (this is the guard text — see Phase 4 for where it gets embedded as comments).

Verification: a teammate (or a fresh LLM session) reading only this doc can answer "if I import a QTI package from a different vendor, will the scoring be correct?" with "no, only `data-*` attributes are honored, see section 1."

---

## Phase 4: In-source guards

Goal: make it structurally hard for an LLM editing one of these files to accidentally turn it into a generic importer.

For each of `packages/qti/roundtrip-export/src/index.ts` and `packages/qti/roundtrip-import/src/index.ts`:

1. **Top-of-file banner** — short, blunt, ~10 lines max:
   ```
   /**
    * LOSSLESS PROSEMIRROR↔QTI ROUNDTRIP — NOT A GENERIC QTI 3.0 EXPORTER.
    *
    * This file is one half of a paired contract with roundtrip-{import|export}.
    * Both halves must agree on the data-* attribute table in ROUNDTRIP.md.
    *
    * DO NOT:
    *   - Make this read/write standard qti-response-declaration / qti-response-processing
    *     as a source of authoring state. They are written by export for QTI conformance,
    *     and ignored by import on purpose.
    *   - Add a data-* mapping in one file without adding its inverse in the other.
    *   - Generalize this for third-party QTI input. That belongs in a separate package.
    *
    * If you need to break these rules, stop and read ROUNDTRIP.md, then update it.
    */
   ```
2. **Locate the attribute-mapping constants** (`EDITOR_DATA_ATTRIBUTE_MAPPINGS`, `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS`, `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS` in export; `DATA_ATTRIBUTE_MAPPINGS` in import) and add a 2-line `// PAIRED CONTRACT` comment above each, naming the file+symbol in the sibling package that must move in lockstep.
3. **Locate `stripIgnoredQtiSections`** in import and add a comment explaining *why* we strip — intentional, not a bug.
4. **Locate `preserveEditorDataAttributes`** in export and add the inverse comment.

These are the only comments allowed — keep guards out of unrelated functions. (Project convention per CLAUDE.md is to default to no comments; these are justified because the rule is non-obvious and the risk of silent regression is high.)

Verification:
- [ ] Both files start with the banner.
- [ ] Both attribute-mapping constants have a `// PAIRED CONTRACT` comment referencing the sibling.
- [ ] `grep -n "PAIRED CONTRACT" packages/qti/roundtrip-*/src/index.ts` returns at least 4 hits (2 per file).

---

## Phase 5: Repo-level guards

1. **`AGENTS.md`** — add a section "Lossless QTI roundtrip packages" with one paragraph + a link to `ROUNDTRIP.md`. State the same rule: roundtrip packages are not generic; do not refactor them to interpret `qti-response-*` nodes.
2. **`docs/architecture.md`** — append a row to whatever package table exists (or add one) for the two roundtrip packages, with the *"not generic"* note in the description.
3. **Roundtrip integration test** — `packages/qti/roundtrip-export/src/index.roundtrip.test.ts` (or a colocated test in either package) that:
   - Builds a ProseMirror document containing each interaction type with each `data-*` attribute populated.
   - Exports it to a ZIP, imports it back, and asserts the resulting ProseMirror JSON deep-equals the original on the attributes covered by the contract table.
   - Also asserts that the exported item XML contains both the QTI standard nodes and the `data-*` mirrors, and that the importer's output is unaffected by mutating/removing the standard nodes (proves we really are reading from `data-*`).
   - This test is the executable form of the guard — if anyone changes the mapping table in only one file, this test fails.
4. **CI:** confirm this test runs in the existing test command. If not, add it.

Verification:
- [ ] Roundtrip test passes on `main` after rename.
- [ ] Deliberately deleting one entry from one side's mapping table makes the test fail with a clear message.

---

## Phase 6: Verification & sign-off

1. Re-grep for old names — zero hits.
2. Open the doc fresh and confirm a reader can answer the "third-party QTI" question correctly.
3. Build the editor app, do a manual export → re-import in the UI, confirm authoring state survives (correct response, score, case-sensitive on text entry, area-mappings on select-point).
4. Final commit / PR with the rename + doc + guards + test as one logical unit. PR description must include the bold "not generic" framing so reviewers and future LLMs see it.

---

## Anti-patterns to refuse during execution

- ❌ "Let's just make the importer also read `qti-response-declaration` as a fallback so it can handle third-party files." — That's a different package. Reserve the name; don't smuggle it in.
- ❌ "I'll add a data attribute to export but I'll add the import mapping later." — Both sides land in the same commit, or neither does.
- ❌ "The dist files for package-import are good enough, no need to bring src onto main." — No. Source must be on the working branch before rename.
- ❌ "I'll just rename files but skip the doc/guards because they're verbose." — The whole point of this plan is the doc and guards; the rename alone solves nothing.

---

## Out of scope (explicitly)

- Building a real generic QTI 3.0 importer. (Future work — separate package, separate plan.)
- Changing the `data-*` attribute set or the schema. (Mapping changes are the *next* engineer's problem, governed by the new doc.)
- Refactoring `preserveEditorDataAttributes` regex-based approach into a proper XML parser. (Tempting but unrelated.)

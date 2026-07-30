# Regression Item Alignment Playbook (qti-components <-> qti-editor)

This document captures the alignment choices we made so future item work stays deterministic.

## Goal

Align each ITEMnnn between qti-components and qti-editor so both repos use:

- the same item number
- the same fixture filename
- the same regression story naming pattern
- the same folder placement pattern
- one item-at-a-time verification

## Scope

- qti-components is the upstream fixture and rendering source.
- qti-editor mirrors that item in a regression story plus browser test for interaction behavior.

## Naming and placement contract

For any ITEMnnn:

- Fixture filename: ITEMnnn.xml (same in both repos)
- Story filename pattern: itemnnn-qti-<interaction>.regression.stories.ts (same item number)
- Story export name pattern: RoundtripItemnnn (same item number)
- Story title: QTI Kennisnet/Regression

The filename leads with `itemnnn` on purpose. Storybook orders stories in a title group by index
order, which is the glob's alphabetical filename order, so a zero-padded numeric prefix puts the
sidebar in ITEM001..ITEM017 order in both repos with no `storySort` config at all. (It also survives
someone later switching to `method: 'alphabetical'`, since the story names — `Roundtrip Item 007` —
are zero-padded too.) The older `qti-<interaction>-itemnnn` pattern sorted by interaction and put
ITEM017 first.

In qti-editor the sibling browser test uses the same stem:
`itemnnn-qti-<interaction>.regression.browser.test.ts`.

## Shared layout contract

Both repos render the item at one measure so a qti-components story and a qti-editor story can be
put side by side and compared:

- `--regression-item-width: 800px` and `--regression-panel-width: 320px` are declared in
  `apps/e2e/stories/kennisnet.css`, which is kept **byte-identical in both repos**. Change the value
  in both or the comparison is void.
- `.regression-item` caps the item column. qti-components applies it via a `regressionLayout`
  decorator in `apps/e2e/stories/regression-layout.ts`, wired into every story's `meta.decorators`,
  so the 17 story bodies stay identical.
- qti-editor additionally uses `.regression-layout` (flex row) with the attributes panel
  `.regression-panel` to the right of the item. All 17 render functions are byte-identical.
- The panel `<aside>` is **first in the DOM** so its `ref` callback captures the element before the
  editor's `ref` mounts against it; CSS `order` moves it to the right visually. Do not "fix" the DOM
  order to match the visual order — that reintroduces the bug ITEM001/002 had, where the panel ref
  sat in child position, never fired, and the stories rendered with no attributes panel.
- 800 + 24 gap + 320 = 1144, inside the 1280px browser-test viewport.

### qti-components locations

- Regression stories folder: apps/e2e/stories/
- Regression fixtures folder: apps/e2e/stories/fixtures/
- Canonical item assets: public/assets/api/kennisnet/ITEMnnn.xml
- Upstream broad story set (non-regression): apps/e2e/src/stories/kennisnet/kennisnet.stories.ts

### qti-editor locations

- Regression stories folder: apps/e2e/stories/
- Regression fixtures folder: apps/e2e/stories/fixtures/
- Regression tests folder: apps/e2e/stories/ (sibling *.browser.test.ts files)
- Runtime snapshots: apps/e2e/stories/__file_snapshots__/

## What we aligned for ITEM001 and ITEM002

### ITEM001

qti-components:

- Story: apps/e2e/stories/item001-qti-choice-interaction.regression.stories.ts
- Fixture: apps/e2e/stories/fixtures/ITEM001.xml

qti-editor:

- Story: apps/e2e/stories/item001-qti-choice-interaction.regression.stories.ts
- Fixture: apps/e2e/stories/fixtures/ITEM001.xml
- Browser test: apps/e2e/stories/item001-qti-choice-interaction.regression.browser.test.ts

### ITEM002

qti-components:

- Story: apps/e2e/stories/item002-qti-choice-interaction.regression.stories.ts
- Fixture: apps/e2e/stories/fixtures/ITEM002.xml

qti-editor:

- Story: apps/e2e/stories/item002-qti-choice-interaction.regression.stories.ts
- Fixture: apps/e2e/stories/fixtures/ITEM002.xml
- Browser test: apps/e2e/stories/item002-qti-choice-interaction.regression.browser.test.ts

Both stories now use the shared layout described under "Shared layout contract": the item is capped
at `--regression-item-width`, and in qti-editor the attributes panel sits to its right. ITEM001/002
previously had neither — their panel `ref` sat in lit child position, where the directive never
fires, so `panelEl` was always null and no panel was mounted.

### ITEM003 - ITEM017 (qti-components side complete)

qti-components now carries the full set. For each NNN in 003..017:

- Story: apps/e2e/stories/itemNNN-qti-<interaction>.regression.stories.ts
- Fixture: apps/e2e/stories/fixtures/ITEMNNN.xml (byte-identical copy of public/assets/api/kennisnet/ITEMNNN.xml)

Interaction per item: 003/004 text-entry, 005 extended-text, 006 inline-choice, 007-010 match,
011/012 hottext, 013/014 order, 015 gap-match, 016 select-point, 017 associate.

ITEM017 is the one filename that does not name its own element: the fixture renders through
`qti-match-interaction`, but the file is `item017-qti-associate-interaction.regression.stories.ts`
because qti-editor models it with the associate ProseMirror descriptor. One filename per item beats a
per-repo-accurate name, so both repos use `associate`; the qti-components story carries a comment
saying so.

### ITEM003 - ITEM017 (qti-editor side complete)

Both repos now carry all 17. The qti-editor stories already had the right filenames and
`RoundtripItemNNN` exports; what changed for 003-017 was four things, each aligning to ITEM001/002:

1. Fixture copied from `public/qti/kennisnet/ITEMNNN.xml` to `apps/e2e/stories/fixtures/ITEMNNN.xml`
   (same move ITEM001/002 had already made; the two copies are byte-identical).
2. `sourceXML` import switched from `@qti-editor/example-items/ITEMNNN.xml?raw` to
   `./fixtures/ITEMNNN.xml?raw`, with the blank-line import grouping ITEM001 uses.
3. Story title `QTI ProseMirror/Roundtrip Regression` -> `QTI Kennisnet/Regression`, so all 17 land
   in one sidebar group. The old title no longer exists.
4. Schema base `nodes`/`marks` from `prosemirror-schema-basic` -> `qtiBasicNodes`/`qtiBasicMarks`
   from `@citolab/prose-qti`, plus `import './kennisnet.css'`.

Step 4 is a behavior change, not just a rename. `qtiBasicMarks` is `basicMarks` verbatim, but
`qtiBasicNodes` overrides the `image` spec to carry `width`/`height` (stripping a `px` suffix). Six
roundtrip snapshots changed as a result -- ITEM003, 005, 006, 008, 010, 015 -- each gaining exactly
the `width` its source fixture already declared (250, 100%, 250, 250, 130, 300). Before this, the
editor roundtrip silently dropped image widths on export. The snapshots were updated deliberately;
the new output is the faithful one.

Still dropped on roundtrip (not addressed here): `class` on images, e.g. ITEM008's
`class="qti-valign-middle"` and ITEM015's `class="qti-margin-3"`.

### Known drift

Fixture parity across repos is 11 of 17. Do not "fix" the six by copying one side over the other --
these are real content forks and each needs a call on which repo is canonical:

- ITEM002 -- whitespace only. qti-components' copy is reflowed; content identical.
- ITEM013 / ITEM014 -- qti-editor uses `class="qti-horizontal"` / `class="qti-vertical"` on
  `qti-order-interaction`; qti-components uses `orientation="horizontal"` / `orientation="vertical"`.
- ITEM015 -- qti-components adds `max-associations="0"` to `qti-gap-match-interaction`.
- ITEM006 -- qti-components has a second inline choice (`RESPONSE2`, choice2_lager/hoger/onveranderd)
  and `normal-maximum="2"`; qti-editor's copy is the single-response version.
- ITEM017 -- different items under one number. qti-editor: "Koppelvraag - stripduo's", `pair`,
  values `A O` / `S W` / `T B`. qti-components: "Sleepvraag - afbeeldingen koppelen", `directedPair`,
  values `left_auto right_brandstof` etc. This is the biggest divergence in the set.

### Pre-existing failures (not caused by this alignment)

`item001-qti-choice-interaction.regression.browser.test.ts` fails 2 tests on a clean checkout: the
`ITEM001-editor.xml` file snapshot is stale (the committed copy predates the `qti-layout-row` /
`qti-layout-col` divs the import now produces), and one assertion expects `paragraph` where the doc
now yields `qtiLayoutDiv`. Both were failing before 003-017 were touched and were left alone --
`ITEM001-editor.xml` was explicitly reverted after an unfiltered `vitest -u` run picked it up.
Baseline to compare against: 17 of 18 files pass, 87 tests pass, 2 fail.

## Behavioral choices we kept

- Item-by-item parity unit: finish ITEM001, then ITEM002, then continue in order.
- Stories render; tests interact: no play functions or interaction logic in stories.
- Keep layout constraints aligned via story meta/parameters rather than ad hoc wrappers.
- Keep theme parity anchored to qti-components theme; keep editor-only overrides minimal.
- Avoid infra drift during parity work (no unrelated linking/HMR refactors while aligning items).

## Per-item workflow checklist

1. Copy canonical ITEMnnn.xml from qti-components source into both regression fixture folders if needed.
2. Ensure both repos have matching regression story filenames and RoundtripItemnnn export names.
3. Verify story meta title is QTI Kennisnet/Regression in both repos for the regression story.
4. In qti-editor, ensure sibling browser test exists and targets the ITEMnnn story.
5. Validate narrow-first (changed files/lint/tests), then broader storybook checks if needed.

## Copy/paste prompt for future sessions

Use this prompt to continue parity item-by-item:

Align ITEMNNN across qti-components and qti-editor using the established regression pattern from ITEM001/ITEM002.

Requirements:
- Keep the same item number everywhere (ITEMNNN).
- Ensure both repos contain matching fixture files named ITEMNNN.xml under apps/e2e/stories/fixtures/.
- Ensure both repos contain matching regression story files named itemNNN-qti-<interaction>.regression.stories.ts under apps/e2e/stories/.
- Ensure story export naming follows RoundtripItemNNN.
- Keep story title as QTI Kennisnet/Regression.
- In qti-editor, keep interaction behavior in sibling *.browser.test.ts only (stories render only).
- Keep layout/max-width parity in story meta parameters, not ad hoc wrappers.
- Do not perform unrelated infra changes (linking/HMR/tooling) unless it blocks parity.

Deliverables:
- List exact files changed in each repo.
- Explain any differences that remain and why.
- Run targeted validation and report results.

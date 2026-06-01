# Plan: `@qti-editor/qti3-item-import` — transform arbitrary QTI 3.0 items to roundtrip-format

## Goal

Add a new in-repo package `@qti-editor/qti3-item-import` that takes a standard QTI 3.0 **item** XML (with `qti-response-declaration` and `qti-response-processing` blocks) and hoists the correct-response and score values onto the matching interaction elements as `correct-response="..."` and `score="..."` attributes. The output is then importable by the editor's existing `parseDOM` path.

```ts
import { qtiTransformItem } from '@qti-components/transformers';
import { roundtripChoice, roundtripTextEntry, roundtripExtendedText } from '@qti-editor/qti3-item-import';

const editorReady = qtiTransformItem()
  .parse(thirdPartyQti3Xml)
  .fn(roundtripChoice)
  .fn(roundtripTextEntry)
  .fn(roundtripExtendedText)
  .xml();
```

Or via a convenience wrapper:

```ts
import { roundtripQtiItem } from '@qti-editor/qti3-item-import';
const editorReady = roundtripQtiItem(thirdPartyQti3Xml);
```

## Why a new package (not in qti-convert, not our own builder)

- **No new builder**: depends on `@qti-components/transformers` (already published by Citolab, same author). Its `qtiTransformItem()` returns a chainable builder with `.fn((xmlDoc: XMLDocument) => void)` as the extension slot. We author plain functions; consumers wire them in.
- **Why qti-components/transformers, not qti-convert**: it's already the right shape (DOM-based, item-focused, has the `.fn()` plug-in slot), pure DOM, zero deps. qti-convert is cheerio-based and package-focused.
- **In-repo (not as a PR to qti-components)**: the transforms encode QTI-Editor's specific roundtrip-format conventions (which the editor's `parseDOM` reads). They belong with the editor.

## Scope — strict v1 guardrails

Per the user: each transform converts an item only if **ALL THREE** conditions match. Otherwise it passes through untouched.

| Transform | Condition 1 (interaction count) | Condition 2 (correct-response) | Condition 3 (score) |
|---|---|---|---|
| `roundtripChoice` | exactly one `qti-choice-interaction` | `qti-response-declaration` for the choice's `response-identifier` has at least one `qti-value` | score extractable (template match_correct → 1; or literal in `qti-set-outcome-value identifier="SCORE"`; otherwise default 1) |
| `roundtripTextEntry` | exactly one `qti-text-entry-interaction` | same | same |
| `roundtripExtendedText` | exactly one `qti-extended-text-interaction` | sibling `qti-rubric-block view="scorer" use="scoring"` exists with text content, OR `qti-response-declaration` has `qti-correct-response` | same |

If multiple matching interactions are present in the item, **the transform skips** — multi-interaction items are out of v1 scope.

If the correct-response is missing from the response-declaration, the transform skips for that interaction.

If the interaction already has a `correct-response` attribute set, the transform leaves it (idempotency).

## Open question (one)

The user said "two transform functions, which are per interaction." Two readings:

- **(A)** One transform per interaction covering both correct-response and score together. Three total. THIS PLAN ASSUMES (A).
- **(B)** Two transforms per interaction — one for correct-response, one for score. Six total.

(A) is simpler and matches the conservative "all conditions or skip" guardrail (treating an interaction as the unit). If the user meant (B), the helpers in Phase 2 are already factored that way, so it's a trivial refactor: just expose them as separate `.fn()`-able transforms.

## Architecture pivot from the earlier draft

The plan at [plans/qti3-to-roundtrip-converter.md](plans/qti3-to-roundtrip-converter.md) (which proposed a homegrown cheerio-based `@qti-editor/qti-transform`) is **superseded** by this plan and should be deleted at the end of Phase 4.

---

## Phase 0 — Facts (do not re-discover)

### `@qti-components/transformers` API (from `/Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-transformers/`)

- Published name: `@qti-components/transformers`. Current version: `1.6.4`. ESM, no runtime deps.
- Entry: `qtiTransformItem(cache: boolean = false): transformItemApi` ([src/qti-transform-item.ts](file:///Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-transformers/src/qti-transform-item.ts)).
- Relevant `transformItemApi` methods for us (lines 45-66 of that file):
  - `.parse(xmlString: string): transformItemApi` — ingest XML string.
  - `.fn(fn: (xmlFragment: XMLDocument) => void): transformItemApi` — apply a custom mutation. The callback receives the live `XMLDocument` and mutates in place.
  - `.xml(): string` — terminal: serialize back to XML string.
  - `.xmlDoc(): XMLDocument` — terminal: return the live XMLDocument.
- DOM-based; uses standard `new DOMParser().parseFromString(xml, 'text/xml')` ([src/qti-transformers.ts:72,84](file:///Users/patrickklein/Projects/Edtech/QTI/QTI-Components/packages/qti-transformers/src/qti-transformers.ts)). Works in browsers and Node (with jsdom/happy-dom/vitest browser).
- Real-world `.fn()` usage example at `apps/e2e/src/stories/conformance/portable-custom-interaction/q16-portable-custom-interaction.stories.ts:159-171`.

### QTI 3.0 wire format facts

**Response declaration:**
```xml
<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
  <qti-correct-response>
    <qti-value>ChoiceA</qti-value>
  </qti-correct-response>
</qti-response-declaration>
```
Multi-cardinality just adds more `<qti-value>` children. Real examples in `QTI-Components/public/assets/qti-item/example-choice-item.xml` and `.../example-choice-multiple-item.xml`.

**Response processing — the cheap path (template URI):**
```xml
<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
```
The match-correct template implies score=1. The URI may or may not have `.xml` suffix. Reference constant: `MATCH_CORRECT_TEMPLATE` at [packages/prosemirror/interaction-choice/src/composer/metadata.ts:5](packages/prosemirror/interaction-choice/src/composer/metadata.ts#L5).

**Response processing — the explicit path (literal SCORE outcome):**
```xml
<qti-set-outcome-value identifier="SCORE">
  <qti-sum>
    <qti-variable identifier="SCORE" />
    <qti-base-value base-type="float">1</qti-base-value>
  </qti-sum>
</qti-set-outcome-value>
```
Or simpler:
```xml
<qti-set-outcome-value identifier="SCORE">
  <qti-base-value base-type="float">2</qti-base-value>
</qti-set-outcome-value>
```
Real example in `QTI-Components/public/assets/qti-item/example-match.xml:83-101`.

### Editor side facts (what the transform must produce)

**parseDOM contracts** for the three v1 interactions read these DOM attributes directly off the interaction element:
- choice ([qti-choice-interaction.schema.ts:15-31](packages/prosemirror/interaction-choice/src/components/qti-choice-interaction/qti-choice-interaction.schema.ts#L15-L31)): `correct-response`, `score`.
- text-entry ([qti-text-entry-interaction.schema.ts:20-39](packages/prosemirror/interaction-text-entry/src/components/qti-text-entry-interaction/qti-text-entry-interaction.schema.ts#L20-L39)): `correct-response`, `score`.
- extended-text ([qti-extended-text-interaction.schema.ts:23-51](packages/prosemirror/interaction-extended-text/src/components/qti-extended-text-interaction/qti-extended-text-interaction.schema.ts#L23-L51)): `correct-response` (populates `rubricScoringBlock`), `score`.

**Value formats:**
- `correct-response`: comma-separated tokens (single → string, multi → string[]). Parser at [packages/prosemirror/interaction-shared/src/correct-response/codec.ts](packages/prosemirror/interaction-shared/src/correct-response/codec.ts).
- `score`: numeric string; default 1 if unparseable.

**Extended-text rubric block on the source side:**
```xml
<qti-rubric-block view="scorer" use="scoring">
  <qti-content-body>
    <div>
      <p>Line 1 of rubric</p>
      <p>Line 2</p>
    </div>
  </qti-content-body>
</qti-rubric-block>
```
The editor's importer strips this on input ([roundtrip-import/src/index.ts:299-305](packages/qti/roundtrip-import/src/index.ts#L299-L305)) — so the transform must hoist the text content onto the interaction as `correct-response="line1\nline2"` BEFORE handing the XML to the importer. (The DOM attribute is `correct-response` until [plans/rubric-block-attribute.md](plans/rubric-block-attribute.md) renames it to `rubric-block`.)

**The editor's importer strips `qti-response-declaration` and `qti-response-processing`** at [packages/qti/roundtrip-import/src/index.ts:224-238](packages/qti/roundtrip-import/src/index.ts#L224-L238). The transforms must extract data from those blocks BEFORE the importer sees the XML.

**The importer requires a ZIP package.** It does NOT accept bare item XML. To run the editor's parseDOM on transformed output, either:
- Wrap in a one-item zip with a minimal manifest, OR
- Bypass the importer entirely and feed the XML directly to the parseDOM chain (for testing).

---

## Phase 1 — Scaffold the package

### Files to create at `packages/qti/qti3-item-import/`

1. **`package.json`** — copy structure from `packages/qti/roundtrip-import/package.json` and slim down:
   ```json
   {
     "name": "@qti-editor/qti3-item-import",
     "version": "0.0.1",
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "default": "./dist/index.js"
       }
     },
     "dependencies": {
       "@qti-components/transformers": "^1.6.4"
     },
     "scripts": {
       "build": "tsc -p tsconfig.json",
       "typecheck": "tsc -p tsconfig.json --noEmit",
       "test": "vitest run"
     },
     "files": ["dist"]
   }
   ```

2. **`tsconfig.json`** — extend `../../../tsconfig.base.json` (match siblings).

3. **`src/index.ts`** — empty stub barrel for now; populated in Phase 3.

4. **`README.md`** — one-paragraph stub describing the package and pointing at the plan; full content in Phase 4.

### Workspace wiring

If the workspace `pnpm-workspace.yaml` already covers `packages/qti/*` via glob (it should), nothing to add. Run `pnpm install` at the repo root to link the new package.

### Verification

```bash
cd /Users/patrickklein/Projects/Editor/QTI-Editor
pnpm install 2>&1 | tail -5
pnpm --filter @qti-editor/qti3-item-import build 2>&1 | tail -5
pnpm --filter @qti-editor/qti3-item-import typecheck 2>&1 | tail -5
```

- `pnpm install` resolves `@qti-components/transformers` from npm. If the registry is unreachable in the sandbox, document the install requirement.
- `build` and `typecheck` succeed (an empty barrel is valid).
- `import { qtiTransformItem } from '@qti-components/transformers'` resolves when typing into a sibling test file.

### Anti-patterns

- Do NOT add a `dependencies` entry for `cheerio` or `@citolab/qti-convert`. Zero coupling with those.
- Do NOT add a `dependencies` entry for `@qti-editor/qti-roundtrip-import`. The integration test will need it as a `devDependency` only.
- Do NOT make this a runtime dep of `@qti-editor/qti-roundtrip-import`. The two are composable but unrelated at the code level.

---

## Phase 2 — Implement the extraction helpers

Two pure helpers do the heavy lifting. The three per-interaction transforms in Phase 3 are thin wrappers around them.

### `src/_shared/correct-response.ts`

```ts
/**
 * Walk every qti-response-declaration in the document and build a map from
 * response-identifier to a comma-joined correct-response value string.
 *
 * Empty <qti-correct-response> (no <qti-value> children) is treated as
 * "no correct response known" and is omitted from the map (the transform
 * will then skip).
 */
export function buildCorrectResponseIndex(xmlDoc: XMLDocument): Map<string, string> {
  const index = new Map<string, string>();
  const declarations = xmlDoc.querySelectorAll('qti-response-declaration');
  declarations.forEach((decl) => {
    const identifier = decl.getAttribute('identifier');
    if (!identifier) return;
    const values: string[] = [];
    decl.querySelectorAll('qti-correct-response > qti-value').forEach((v) => {
      const text = v.textContent?.trim();
      if (text) values.push(text);
    });
    if (values.length > 0) {
      index.set(identifier, values.join(','));
    }
  });
  return index;
}
```

### `src/_shared/score.ts`

Score extraction strategy (in order):

1. If `qti-response-processing` has a `template` attribute whose value contains `match_correct` (e.g. `https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct` or `.../match_correct.xml`) → score = `1`.
2. If `qti-response-processing` contains a `qti-set-outcome-value identifier="SCORE"` whose direct or `qti-sum`-nested `qti-base-value` has a finite numeric text content → use that.
3. Otherwise → default `1` (matches the editor's compose default).

```ts
const MATCH_CORRECT_PATTERN = /match_correct(?:\.xml)?$/;

export function extractItemScore(xmlDoc: XMLDocument): number {
  const processing = xmlDoc.querySelector('qti-response-processing');
  if (!processing) return 1;

  const template = processing.getAttribute('template');
  if (template && MATCH_CORRECT_PATTERN.test(template)) return 1;

  // Look for any qti-set-outcome-value identifier="SCORE" with a numeric base-value
  const setOutcomes = processing.querySelectorAll('qti-set-outcome-value[identifier="SCORE"]');
  for (const setOutcome of setOutcomes) {
    // Direct numeric literal
    const directBaseValue = setOutcome.querySelector(':scope > qti-base-value');
    const directValue = parseFiniteNumber(directBaseValue?.textContent);
    if (directValue !== null && directValue > 0) return directValue;

    // qti-sum that contains a literal qti-base-value
    const sumBaseValues = setOutcome.querySelectorAll(':scope > qti-sum > qti-base-value');
    for (const bv of sumBaseValues) {
      const value = parseFiniteNumber(bv.textContent);
      if (value !== null && value > 0) return value;
    }
  }

  return 1;
}

function parseFiniteNumber(text: string | null | undefined): number | null {
  if (text == null) return null;
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}
```

Notes:
- Selecting `:scope > qti-base-value` distinguishes "literal score at this level" from "score baked into a comparison" elsewhere in the processing tree.
- The `> 0` guard filters out the initial-state set (`<qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="integer">0</qti-base-value></qti-set-outcome-value>`) so the accumulator inside `qti-sum` wins.
- This is a heuristic. For v1 it's sufficient; partial-credit and mapping-based scoring are out of scope.

### Unit tests

`src/_shared/correct-response.test.ts` and `src/_shared/score.test.ts`. Vitest, fixture-based. Cover:

For `buildCorrectResponseIndex`:
- Single-cardinality: `<qti-value>A</qti-value>` → `{RESPONSE: 'A'}`.
- Multiple-cardinality: two `qti-value` → `{RESPONSE: 'A,B'}`.
- Whitespace trimming and empty filtering.
- Missing `identifier` attribute → declaration skipped.
- Empty `qti-correct-response` → not in map.

For `extractItemScore`:
- Template URL match_correct → 1.
- Template URL match_correct with `.xml` suffix → 1.
- `qti-set-outcome-value` with direct `qti-base-value`=2 → 2.
- `qti-set-outcome-value` containing `qti-sum` with literal `qti-base-value`=3 → 3.
- Initial-set-to-zero followed by accumulator → returns the accumulator value (skips the zero).
- No processing block → 1 (default).
- Empty processing block → 1.

### Verification

```bash
pnpm --filter @qti-editor/qti3-item-import test 2>&1 | tail -10
```

All pass.

### Anti-patterns

- Do NOT mutate the XMLDocument in these helpers. They are read-only.
- Do NOT use `getElementsByTagName` — `querySelectorAll` is consistent across DOM impls and matches the rest of the codebase.
- Do NOT special-case `qti-default-value` on outcome declarations in v1 — that's part of the out-of-scope partial-credit logic.

---

## Phase 3 — Implement the three transforms

Each transform is a thin guardrail wrapper around the helpers.

### `src/roundtrip-choice/index.ts`

```ts
import { buildCorrectResponseIndex, extractItemScore } from '../_shared';

/**
 * Hoist correct-response and score onto a single qti-choice-interaction
 * by reading the matching qti-response-declaration and qti-response-processing.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-choice-interaction in the item.
 * - The interaction's response-identifier maps to a qti-correct-response with
 *   at least one qti-value.
 * - A score is extractable (defaulting to 1 if the response-processing is
 *   absent or unparseable).
 *
 * Idempotent: existing correct-response/score attributes on the interaction
 * are preserved.
 */
export const roundtripChoice = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-choice-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const correctResponses = buildCorrectResponseIndex(xmlDoc);
  const correctResponse = correctResponses.get(responseIdentifier);
  if (correctResponse === undefined) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', correctResponse);
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};
```

### `src/roundtrip-text-entry/index.ts`

Identical shape, selector `qti-text-entry-interaction`.

### `src/roundtrip-extended-text/index.ts`

Slightly different — extended-text's "correct-response" is the rubric content from a sibling `qti-rubric-block`, NOT from `qti-correct-response` in the response declaration:

```ts
import { extractItemScore } from '../_shared';

/**
 * Hoist rubric content and score onto a single qti-extended-text-interaction.
 *
 * Source of rubric content: a <qti-rubric-block view="scorer" use="scoring">
 * element anywhere in the item body. Its <qti-content-body><div><p>... lines
 * are joined with \n to produce the correct-response attribute value.
 *
 * (After plans/rubric-block-attribute.md ships, this should be renamed
 * to write to 'rubric-block' instead of 'correct-response'.)
 *
 * Conditions:
 * - Exactly ONE qti-extended-text-interaction in the item.
 * - The rubric block exists and has at least one <p> with text content.
 * - A score is extractable (default 1).
 *
 * Idempotent.
 */
export const roundtripExtendedText = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-extended-text-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const rubricBlock = xmlDoc.querySelector(
    'qti-rubric-block[view="scorer"][use="scoring"]',
  );
  if (!rubricBlock) return;

  const lines: string[] = [];
  rubricBlock.querySelectorAll('qti-content-body > div > p').forEach((p) => {
    const text = p.textContent ?? '';
    lines.push(text === ' ' ? '' : text);
  });
  if (lines.every((line) => line.length === 0)) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', lines.join('\n'));
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};
```

### Convenience wrapper

`src/roundtrip-qti-item.ts`:

```ts
import { qtiTransformItem } from '@qti-components/transformers';
import { roundtripChoice } from './roundtrip-choice';
import { roundtripTextEntry } from './roundtrip-text-entry';
import { roundtripExtendedText } from './roundtrip-extended-text';

/**
 * Run all three v1 transforms on a QTI 3.0 item XML string and return the
 * resulting XML string. Pure convenience — equivalent to calling
 * qtiTransformItem().parse(xml).fn(roundtripChoice).fn(roundtripTextEntry).fn(roundtripExtendedText).xml().
 */
export function roundtripQtiItem(xmlString: string): string {
  return qtiTransformItem()
    .parse(xmlString)
    .fn(roundtripChoice)
    .fn(roundtripTextEntry)
    .fn(roundtripExtendedText)
    .xml();
}
```

### `src/index.ts` (barrel)

```ts
export { roundtripChoice } from './roundtrip-choice';
export { roundtripTextEntry } from './roundtrip-text-entry';
export { roundtripExtendedText } from './roundtrip-extended-text';
export { roundtripQtiItem } from './roundtrip-qti-item';
```

### Unit tests per transform

For each: vitest + `String.raw` XML + parse + apply + serialize + assert via string search OR by inspecting the resulting XMLDocument.

`roundtripChoice.test.ts` required cases:
1. **Happy path single**: choice with `qti-response-declaration` (`ChoiceA`) and match_correct template → interaction has `correct-response="ChoiceA"` and `score="1"`.
2. **Happy path multi**: cardinality=multiple, two `qti-value` → `correct-response="ChoiceA,ChoiceB"`.
3. **Custom score**: explicit `qti-base-value`=3 inside `qti-set-outcome-value` → `score="3"`.
4. **Two choice interactions**: passed through (neither gets attributes set).
5. **No qti-correct-response**: passed through.
6. **Idempotency**: interaction already has `correct-response="X"` → not overwritten.
7. **Other interactions ignored**: a text-entry sibling in the item is NOT touched by `roundtripChoice`.

`roundtripTextEntry.test.ts` — same shape with `qti-text-entry-interaction`.

`roundtripExtendedText.test.ts` — required cases:
1. **Rubric block with two `<p>` lines** → `correct-response="line1\nline2"` and `score="1"`.
2. **No rubric block**: passed through.
3. **Rubric block with only ` ` placeholders**: passed through (treated as empty).
4. **Two extended-text interactions**: passed through.
5. **Idempotency**.

### Verification

```bash
pnpm --filter @qti-editor/qti3-item-import test 2>&1 | tail -20
pnpm --filter @qti-editor/qti3-item-import build 2>&1 | tail -5
pnpm --filter @qti-editor/qti3-item-import typecheck 2>&1 | tail -5
```

All green.

### Anti-patterns

- Do NOT strip / remove `qti-response-declaration` or `qti-response-processing` from the output. Leave them in place — the editor's importer strips them later, and other consumers may still want them.
- Do NOT strip the `qti-rubric-block` either — the editor's importer strips it ([roundtrip-import/src/index.ts:299-305](packages/qti/roundtrip-import/src/index.ts#L299-L305)). Our job is hoisting, not cleanup.
- Do NOT touch interactions outside the per-transform scope (e.g. `roundtripChoice` must not set attributes on a `qti-text-entry-interaction`).
- Do NOT write `data-correct-response` or `data-score`. Plain `correct-response` and `score` are what `parseDOM` reads (the editor's importer rename step is a no-op when these are already plain).

---

## Phase 4 — Integration test, README, cross-link, supersede the old plan

### Integration test

`src/qti3-item-import.integration.test.ts`:

1. Use one of the fixture-shaped XML strings from Phase 3's unit tests (a complete `qti-assessment-item` with one choice interaction).
2. Run it through `roundtripQtiItem(xml)`.
3. Either:
   - **(a)** Wrap the result in a one-item ZIP (jszip), feed it to `importQtiPackageFromArrayBuffer` from `@qti-editor/qti-roundtrip-import`, assert the resulting ProseMirror JSON has the expected `correctResponse` and `score` PM attrs on the choice node.
   - **(b)** Skip the zip wrapping and directly invoke the editor's ProseMirror schema's `parseDOM` on the relevant `<qti-choice-interaction>` element, assert the resulting node attrs.

(b) is simpler and avoids the JSZip dependency. (a) is more end-to-end. **Recommendation: (b)** for v1. Add `@qti-editor/interaction-choice` as a `devDependency` for the choice schema import.

Add `@qti-editor/qti-roundtrip-import` to `devDependencies` only if going with (a).

### README

`packages/qti/qti3-item-import/README.md` (~30 lines):
- One-paragraph description.
- Usage example chaining transforms.
- Usage example via `roundtripQtiItem(xml)` convenience.
- Scope statement (3 interactions, single-interaction items only, etc.).
- Pointer to this plan and to `apps/site/src/content/docs/packages/itembody-subformat.mdx`.

### Docs site entry (optional for v1)

If a Package Reference entry seems valuable, add `apps/site/src/content/docs/packages/qti3-item-import.mdx` mirroring the structure of `qti-roundtrip-export.mdx`. Update the `astro.config.mjs` sidebar. Skip if Phase 4 estimate is already tight; the README + plan are sufficient documentation for v1.

### Cross-link from other plans

- Edit `plans/unify-non-qti-attribute-metadata.md` "See also" section: replace the existing `qti3-to-roundtrip-converter` reference with one pointing at this plan.
- Edit `plans/rubric-block-attribute.md` "See also" section: replace the same.

### Supersede the earlier draft

The earlier plan at [plans/qti3-to-roundtrip-converter.md](plans/qti3-to-roundtrip-converter.md) proposed a homegrown cheerio builder. It's superseded by this plan. Two options:

- **(a)** Delete it: `rm plans/qti3-to-roundtrip-converter.md`.
- **(b)** Keep it as a history note: prepend a one-line `> SUPERSEDED BY plans/qti3-item-import.md` and leave the rest.

**Recommendation: (a)** — clean is better than archaeological for an unmerged draft. The git history preserves the prior thinking if anyone needs it.

### Verification

```bash
cd /Users/patrickklein/Projects/Editor/QTI-Editor
pnpm --filter @qti-editor/qti3-item-import test 2>&1 | tail -15

# Confirm the deleted plan is gone (if option (a)) or annotated (option (b)):
ls plans/qti3-to-roundtrip-converter.md 2>&1
# (a): "No such file or directory" — expected
# (b): file exists with SUPERSEDED header

# Confirm cross-links resolve from the two plans:
rg -n "qti3-item-import" plans/unify-non-qti-attribute-metadata.md plans/rubric-block-attribute.md
```

All green; integration test passes; cross-links resolve.

### Anti-patterns

- Do NOT make `@qti-editor/qti-roundtrip-import` a runtime dep. The integration test needs it (devDep); production users don't.
- Do NOT publish this package to npm in v1 from the plan execution. Publishing is a separate decision.
- Do NOT add the transform to the importer's pipeline by default. The whole point of separating them is that consumers opt in.

---

## Future (explicit non-goals for v1)

Add as separate small plans when need arises:

- `roundtripCaseSensitive()` — detect `qti-string-match[case-sensitive="true"]` for text-entry, set `case-sensitive="true"` on the interaction.
- `roundtripMappings()` — partial-credit scoring via `qti-mapping` and `qti-map-response`.
- `roundtripAreaMappings()` — for select-point, parse response-processing → emit `area-mappings` JSON.
- Multi-interaction items.
- Other interactions: associate, match, gap-match, order, hottext, select-point, inline-choice.
- A higher-level "import third-party item into the editor" convenience that wraps the transform + the importer's parseDOM path in one call.
- After [plans/rubric-block-attribute.md](plans/rubric-block-attribute.md) ships: update `roundtripExtendedText` to write `rubric-block="..."` instead of `correct-response="..."`.

---

## See also

- [plans/unify-non-qti-attribute-metadata.md](plans/unify-non-qti-attribute-metadata.md) — prerequisite (shipped). Establishes the unified `nonQtiAttributes` registry that the editor's parseDOM contracts depend on.
- [plans/rubric-block-attribute.md](plans/rubric-block-attribute.md) — sibling plan. After it ships, `roundtripExtendedText` here is updated to write `rubric-block` instead of `correct-response`.

## Estimate

- Phase 1 (scaffold): ~20 min
- Phase 2 (helpers + their tests): ~45 min
- Phase 3 (three transforms + their tests): ~60 min
- Phase 4 (integration test + README + cross-link + delete superseded plan): ~30 min

Total: ~2.5 hours.

# Plan: `@qti-editor/qti-transform` — in-repo chainable QTI transformer

## Goal

Add a new in-repo package `@qti-editor/qti-transform` that provides a small chainable QTI 3.0 transformer pipeline (modeled on [`@citolab/qti-convert`'s `qti-transformer`](https://github.com/Citolab/qti-convert)) and ships the editor-specific transforms needed to make third-party QTI 3.0 items importable.

```ts
import { qtiTransform } from '@qti-editor/qti-transform';

const editorReady = qtiTransform(thirdPartyQti3Xml)
  .roundtripChoice()
  .roundtripText()
  .roundtripInlineChoice()
  .xml();

// Then feed `editorReady` into the existing importer:
await importQtiPackageFromArrayBuffer(packageBytes, { schema });
```

**Why in-repo, not in qti-convert:**
- Zero external dependency from the editor on `@citolab/qti-convert`.
- Editor-specific transforms live next to the schemas they target.
- The API shape is intentionally **aligned with `@citolab/qti-convert`**, so a downstream user who wants both can swap or compose them with no friction. Each transform is also exported as a plain `($: CheerioAPI) => void` function, so qti-convert users can drop our transforms into their builder via `.fnCh()`.

## v1 scope (super simple)

Two transforms only. Each hoists the value from `<qti-response-declaration><qti-correct-response><qti-value>X</qti-value>` onto the interaction element as `correct-response="X"`:

- `roundtripChoice()` — targets `qti-choice-interaction` and `qti-inline-choice-interaction` (same shape).
- `roundtripText()` — targets `qti-text-entry-interaction`.

Comma-separated for multi-cardinality. Idempotent. Deferred interactions pass through untouched.

**Not in v1**: score, case-sensitive, area-mappings, rubric blocks, multi-cardinality complex interactions, format spec docs.

## Execution order vs the unification plan

**Do the unification plan first** ([plans/unify-non-qti-attribute-metadata.md](plans/unify-non-qti-attribute-metadata.md)). Then this plan. Reasons:
- Unification is contained, snapshot-guarded, lower-risk.
- After unification, the editor has one canonical declarative source for non-QTI attrs. This package becomes the second consumer of that contract.
- This package itself has a **soft** dependency on unification (the transforms emit the plain `correct-response` attribute, which works whether unification has shipped or not), so order is a preference, not a hard requirement.

---

## Phase 0 — Facts (from prior discovery)

### Why the editor accepts plain `correct-response` (not `data-correct-response`)

The editor's importer at [packages/qti/roundtrip-import/src/index.ts:176-190](packages/qti/roundtrip-import/src/index.ts#L176-L190) renames `data-correct-response` → `correct-response`, then `parseDOM` reads `correct-response`. If the attribute is already named `correct-response` on the element, the rename step is a no-op and `parseDOM` picks it up.

### What the importer strips (and therefore what we must hoist BEFORE handing XML to the importer)

[packages/qti/roundtrip-import/src/index.ts:224-238,299-305](packages/qti/roundtrip-import/src/index.ts#L224-L238) — strips `qti-response-declaration`, `qti-response-processing`, and sibling `qti-rubric-block view="scorer" use="scoring"` elements.

### Value format

`correct-response` is comma-separated tokens, no escaping. Single token → string. Multiple → string[]. See [`parseCorrectResponseAttribute`](packages/prosemirror/interaction-shared/src/correct-response/codec.ts).

### Reference API shape from qti-convert

Mirror this shape (from `/Users/patrickklein/Projects/Edtech/QTI/QTI-Convert/packages/qti-convert-core/src/qti-transformer/qti-transform.ts:109`):

```ts
export const qtiTransform = (xmlValue: string): QtiTransformAPI => { ... }

interface QtiTransformAPI {
  fnCh: (fn: ($: CheerioAPI) => void) => QtiTransformAPI;
  xml: () => string;
  // ... transform methods ...
}
```

Their full API is large (~30 methods, mostly QTI-2.x-to-3.0 stuff we don't need). Our builder is intentionally minimal.

---

## Phase 1 — Scaffold the package

### Create

`packages/qti/qti-transform/`:
- `package.json` — name `@qti-editor/qti-transform`, type module, deps: `cheerio` only.
- `tsconfig.json` — extend `../../../tsconfig.base.json` (match siblings like `roundtrip-import`).
- `src/index.ts` — barrel exporting `qtiTransform` and the transform functions.
- `src/qti-transform.ts` — the fluent builder.
- `src/transforms/roundtrip-choice/index.ts` — `roundtripChoice` transform.
- `src/transforms/roundtrip-text/index.ts` — `roundtripText` transform.
- `src/transforms/index.ts` — barrel for transforms.

### `package.json` shape (copy from `packages/qti/roundtrip-import/package.json` and slim down)

```json
{
  "name": "@qti-editor/qti-transform",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./transforms": {
      "types": "./dist/transforms/index.d.ts",
      "default": "./dist/transforms/index.js"
    }
  },
  "dependencies": {
    "cheerio": "^1.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Add to `pnpm-workspace.yaml` if not already covered by a glob. Match the build/test script conventions of `packages/qti/roundtrip-import/package.json`.

### `src/qti-transform.ts` — the minimal fluent builder

Aligned with qti-convert's shape so users who know one know both. Plain JavaScript / TypeScript, no fancy stuff.

```ts
import * as cheerio from 'cheerio';
import { roundtripChoice } from './transforms/roundtrip-choice';
import { roundtripText } from './transforms/roundtrip-text';

export interface QtiTransformAPI {
  /** Run a custom cheerio transform. Compatible with @citolab/qti-convert's fnCh signature. */
  fnCh: (fn: ($: cheerio.CheerioAPI) => void) => QtiTransformAPI;
  /** Hoist correct-response from response-declaration onto qti-choice-interaction and qti-inline-choice-interaction. */
  roundtripChoice: () => QtiTransformAPI;
  /** Hoist correct-response from response-declaration onto qti-text-entry-interaction. */
  roundtripText: () => QtiTransformAPI;
  /** Convenience: apply every roundtrip-* transform. */
  roundtripAll: () => QtiTransformAPI;
  /** Serialize back to XML. Terminal. */
  xml: () => string;
}

export const qtiTransform = (xmlValue: string): QtiTransformAPI => {
  const $ = cheerio.load(xmlValue, { xmlMode: true, xml: true });

  const api: QtiTransformAPI = {
    fnCh: (fn) => { fn($); return api; },
    roundtripChoice: () => { roundtripChoice($); return api; },
    roundtripText: () => { roundtripText($); return api; },
    roundtripAll: () => { roundtripChoice($); roundtripText($); return api; },
    xml: () => $.xml(),
  };

  return api;
};
```

### `src/transforms/index.ts`

```ts
export { roundtripChoice } from './roundtrip-choice';
export { roundtripText } from './roundtrip-text';
```

### `src/index.ts`

```ts
export { qtiTransform, type QtiTransformAPI } from './qti-transform';
export * from './transforms';
```

Both the builder and the plain transform functions are public. The plain functions exist so a `@citolab/qti-convert` user can do:

```ts
import { qtiTransform } from '@citolab/qti-convert/qti-transformer';
import { roundtripChoice, roundtripText } from '@qti-editor/qti-transform/transforms';

qtiTransform(xml)
  .depConvert()
  .fnCh(roundtripChoice)
  .fnCh(roundtripText)
  .xml();
```

### Verification

- `pnpm install` at repo root succeeds (workspace links the new package).
- `pnpm --filter @qti-editor/qti-transform build` succeeds.
- `pnpm --filter @qti-editor/qti-transform typecheck` green.
- `import { qtiTransform } from '@qti-editor/qti-transform'` resolves in a sibling package's test.

### Anti-patterns

- Do NOT add a `dependencies` entry for `@citolab/qti-convert`. Zero coupling. The API alignment is by convention, not by code.
- Do NOT rebuild every qti-convert transform method. The builder ships exactly the editor's needs — start minimal.
- Do NOT use a different cheerio mode (e.g. HTML mode). Use `xmlMode: true, xml: true` so the XML namespace declarations survive and self-closing tags round-trip.

---

## Phase 2 — Implement `roundtripChoice` and `roundtripText`

Both transforms share the same shape: read `qti-response-declaration` → set `correct-response` on the matching interaction. Factor the common bit out.

### `src/transforms/_shared/hoist.ts`

```ts
import type { CheerioAPI } from 'cheerio';

export function buildCorrectResponseIndex($: CheerioAPI): Map<string, string> {
  const index = new Map<string, string>();
  $('qti-response-declaration').each((_, el) => {
    const $decl = $(el);
    const identifier = $decl.attr('identifier');
    if (!identifier) return;
    const values: string[] = [];
    $decl.find('qti-correct-response qti-value').each((_, valueEl) => {
      const text = $(valueEl).text().trim();
      if (text) values.push(text);
    });
    if (values.length > 0) index.set(identifier, values.join(','));
  });
  return index;
}

export function hoistOntoInteractions(
  $: CheerioAPI,
  interactionTags: readonly string[],
  index: Map<string, string>,
): void {
  if (index.size === 0) return;
  $(interactionTags.join(',')).each((_, el) => {
    const $interaction = $(el);
    if ($interaction.attr('correct-response')) return; // idempotent
    const ri = $interaction.attr('response-identifier');
    if (!ri) return;
    const value = index.get(ri);
    if (value !== undefined) $interaction.attr('correct-response', value);
  });
}
```

### `src/transforms/roundtrip-choice/index.ts`

```ts
import type { CheerioAPI } from 'cheerio';
import { buildCorrectResponseIndex, hoistOntoInteractions } from '../_shared/hoist';

const CHOICE_TAGS = ['qti-choice-interaction', 'qti-inline-choice-interaction'] as const;

/**
 * Hoist correct-response value(s) from qti-response-declaration onto
 * qti-choice-interaction and qti-inline-choice-interaction elements as a
 * plain `correct-response` attribute. Comma-separated for multi-cardinality.
 *
 * The editor's importer strips qti-response-declaration on import
 * (packages/qti/roundtrip-import/src/index.ts:224-238), so the data must
 * live on the interaction itself for the editor to see it.
 *
 * Idempotent: existing `correct-response` is preserved.
 */
export const roundtripChoice = ($: CheerioAPI): void => {
  hoistOntoInteractions($, CHOICE_TAGS, buildCorrectResponseIndex($));
};
```

### `src/transforms/roundtrip-text/index.ts`

```ts
import type { CheerioAPI } from 'cheerio';
import { buildCorrectResponseIndex, hoistOntoInteractions } from '../_shared/hoist';

const TEXT_TAGS = ['qti-text-entry-interaction'] as const;

/**
 * Hoist correct-response value from qti-response-declaration onto
 * qti-text-entry-interaction as a plain `correct-response` attribute.
 *
 * Same rationale as roundtripChoice — the importer strips the declaration.
 *
 * Idempotent: existing `correct-response` is preserved.
 */
export const roundtripText = ($: CheerioAPI): void => {
  hoistOntoInteractions($, TEXT_TAGS, buildCorrectResponseIndex($));
};
```

### Tests

`src/transforms/roundtrip-choice/index.test.ts` and `roundtrip-text/index.test.ts`. Follow vitest + `String.raw` pattern. Required cases:

For `roundtripChoice`:
1. Single-cardinality choice → emits `correct-response="A"`.
2. Multiple-cardinality choice → emits `correct-response="A,B"` (joined by comma).
3. Inline-choice → same hoist works.
4. Existing `correct-response` on the interaction is NOT overwritten (idempotency).
5. No `qti-response-declaration` → no-op.
6. `qti-text-entry-interaction` in the same item is NOT touched by `roundtripChoice` (scoping).
7. Deferred interactions (e.g. `qti-match-interaction`) pass through untouched.

For `roundtripText`:
1. Single-cardinality text-entry → emits `correct-response="Paris"`.
2. Multiple-strings text-entry → emits `correct-response="a,b"`.
3. Idempotency case.
4. No-op when no declaration.
5. `qti-choice-interaction` not touched.

Add one builder-level integration test in `src/qti-transform.test.ts`:

```ts
test('chains roundtripChoice and roundtripText', () => {
  const input = xml`<?xml version="1.0" encoding="UTF-8"?>
    <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i1" title="i1">
      <qti-response-declaration identifier="R1" cardinality="single" base-type="identifier">
        <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
      </qti-response-declaration>
      <qti-response-declaration identifier="R2" cardinality="single" base-type="string">
        <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
      </qti-response-declaration>
      <qti-item-body>
        <qti-choice-interaction response-identifier="R1" max-choices="1">
          <qti-simple-choice identifier="A">A</qti-simple-choice>
        </qti-choice-interaction>
        <p>Capital: <qti-text-entry-interaction response-identifier="R2"/></p>
      </qti-item-body>
    </qti-assessment-item>`;
  const result = qtiTransform(input).roundtripChoice().roundtripText().xml();
  expect(result).toContain('correct-response="A"');
  expect(result).toContain('correct-response="Paris"');
});
```

### Verification

```bash
pnpm --filter @qti-editor/qti-transform test
pnpm --filter @qti-editor/qti-transform build
pnpm --filter @qti-editor/qti-transform typecheck
```

All green, no new errors elsewhere.

### Anti-patterns

- Do NOT strip `qti-response-declaration` / `qti-response-processing` from the output. The transform is additive. The editor's importer handles stripping. The output XML stays valid standard QTI 3.0 for any non-editor consumer.
- Do NOT XML-escape values manually — cheerio handles attribute escaping.
- Do NOT introduce a per-interaction registry abstraction in v1. Two transforms is not enough to justify it. The `_shared/hoist.ts` helpers are sufficient.
- Do NOT add complex `correct-response` parsing (e.g. handling `<qti-mapping>` for partial-credit scoring). v1 reads only `<qti-correct-response><qti-value>`.

---

## Phase 3 — Wire into importer + end-to-end test

### What to do

Add an end-to-end integration test that exercises the full `qtiTransform → importQtiPackage` flow, and document the recommended usage in the README.

### Steps

1. **Integration test** in `packages/qti/qti-transform/src/qti-transform.integration.test.ts`:
   - Take a third-party-style QTI 3.0 fixture (no `data-*` attrs, has `qti-response-declaration`).
   - Run it through `qtiTransform(...).roundtripAll().xml()`.
   - Wrap the result in a minimal QTI package zip (build a one-item package, including `imsmanifest.xml`).
   - Feed the zip to `importQtiPackageFromArrayBuffer` from `@qti-editor/qti-roundtrip-import`.
   - Assert: the resulting ProseMirror JSON's `qtiChoiceInteraction` node has `correctResponse: 'A'` and the `qtiTextEntryInteraction` node has `correctResponse: 'Paris'`.
   - This test requires `@qti-editor/qti-roundtrip-import` as a `devDependency` of `@qti-editor/qti-transform`. Add it.

2. **README** at `packages/qti/qti-transform/README.md`:
   - One-line description.
   - Usage example chaining `roundtripChoice` and `roundtripText`.
   - Note on the cheerio dependency and the intentional API-shape compatibility with `@citolab/qti-convert`.
   - Note on the editor's importer dependency: this package produces XML the importer can consume; using one without the other is fine but reduces utility.

3. **Cross-link** from QTI-Editor's main `README.md` to the new package under the Documentation section.

4. **Optional convenience helper** in `@qti-editor/qti-roundtrip-import`: export a `importThirdPartyQtiPackage(buffer, options)` that internally runs the transform pipeline before importing. Strictly optional — explicit chaining is the recommended path.

### Verification

- The integration test passes.
- A reader of the new README can copy-paste the usage example and have it work.
- `rg "@qti-editor/qti-transform" --type ts` finds the package referenced from at least one consumer test or doc.

### Anti-patterns

- Do NOT make `@qti-editor/qti-roundtrip-import` a runtime dep of `@qti-editor/qti-transform`. The integration test needs it; the production package doesn't.
- Do NOT add the transform to the importer's pipeline by default. The whole point of separating them is that the user opts in.

---

## Future (explicit non-goals for v1)

When real-world need arises, add as separate small plans:

- `roundtripExtendedText()` — hoist rubric content from sibling `qti-rubric-block`. Needs prior decision on `correct-response` vs `rubric-block` DOM attr name (see "extended-text rename" note below).
- `roundtripScore()` — detect score from response-processing template URI (`match_correct` → 1; custom → parse `qti-base-value`).
- `roundtripCaseSensitive()` — detect `case-sensitive="true"` on `qti-string-match` and hoist as `data-case-sensitive`.
- `roundtripAreaMappings()` — for select-point, parse response-processing → emit `data-area-mappings` JSON.
- Multi-cardinality complex interactions: associate, match, gap-match, order, hottext.
- A canonical `roundtrip-format-spec.mdx` doc on the docs site once the transform count grows past ~4.
- Extended-text `correct-response` → `rubric-block` DOM-attribute rename (separate small plan).

Each is a clean additive transform — adding one is a copy of `roundtrip-choice/` with different selectors.

---

## See also

- [plans/unify-non-qti-attribute-metadata.md](plans/unify-non-qti-attribute-metadata.md) — run first. Establishes the unified non-QTI attribute registry inside QTI-Editor. Once it lands, a v2 of this package can derive its target attribute set from the registry instead of hardcoding selector lists.
- [apps/site/src/content/docs/packages/itembody-subformat.mdx](apps/site/src/content/docs/packages/itembody-subformat.mdx) — the conceptual format overview that this package writes into.

## Estimate

- Phase 1 (scaffold package): ~30 min
- Phase 2 (two transforms + tests): ~45 min
- Phase 3 (integration test + README + cross-link): ~30 min

Total: ~1.75 hours.

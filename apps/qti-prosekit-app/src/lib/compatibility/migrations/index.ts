import { jsonV1ToV2 } from './json-v1-to-v2.js';
import { jsonV2ToV3 } from './json-v2-to-v3.js';
import { jsonV3ToV4 } from './json-v3-to-v4.js';
import { jsonV4ToV5 } from './json-v4-to-v5.js';
import { jsonV5ToV6 } from './json-v5-to-v6.js';
import { jsonV6ToV7 } from './json-v6-to-v7.js';

import type { MigrationStep } from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * SCHEMA MIGRATION STEPS
 *
 * Each version transition lives in its own `*-vN-to-vM.ts` file. To add a new
 * schema version:
 *   1. Create a new `json-vN-to-vM.ts` file exporting a step.
 *   2. Append it to `JSON_MIGRATION_STEPS` below.
 *   3. Bump `CURRENT_SCHEMA_VERSION` in `@qti-editor/interfaces`.
 *   4. Add a `schema/document-corpus/v<N>.json` fixture holding a document as it looked at the
 *      version you just left behind, so it stays loadable — and cover the new step's branches in
 *      `ladder.browser.test.ts` beside it. The two suites divide the work: the corpus asks whether
 *      an old document still opens, through the real schema; the ladder test asks whether each step
 *      does what it says and reports what it did. A step's `warning` paths in particular are
 *      unreachable from a fixture, because a fixture is one document and a branch needs several.
 *
 * JSON version history:
 *   v1 — Baseline. Documents without a version marker are treated as v1.
 *   v2 — Normalize legacy hyphenated attrs to canonical camelCase.
 *   v3 — Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.
 *   v4 — Lift rubricScoringBlock into a sibling qtiRubricBlock node.
 *   v5 — Convert prosekit flat `list` nodes to bullet_list/ordered_list + list_item.
 *   v6 — Convert legacy `bold`/`italic` marks to `strong`/`em`.
 *   v7 — Stringify numeric image width/height and wrap block-level images in a
 *        paragraph, for the image node rebuilt on prosemirror-schema-basic.
 *
 * There is no HTML ladder. There was one — a single step renaming camelCase QTI attributes to
 * hyphenated — and it was removed on 2026-08-20 because nothing it fixed had ever existed: every
 * node spec's `toDOM` has always written hyphenated attrs, and no commit in this repo's history
 * ever wrote a camelCase one. Imported XML goes through the `qti3-item-import` transforms and
 * `findUnrepresentableElements` instead; see `../../importXml.ts`.
 *
 * Genuinely camelCase input means QTI 2.x, which is camelCase in ELEMENT names too — and a parse
 * rule keyed on `tag: 'qti-choice-interaction'` never matches `<choiceInteraction>`, so renaming
 * its attributes rescues nothing. That is a transform-layer job, not a migration-ladder one.
 */
export const JSON_MIGRATION_STEPS = [
  jsonV1ToV2,
  jsonV2ToV3,
  jsonV3ToV4,
  jsonV4ToV5,
  jsonV5ToV6,
  jsonV6ToV7,
] satisfies MigrationStep<NodeJSON>[];

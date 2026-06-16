import { htmlV1ToV2 } from './html-v1-to-v2.js';
import { jsonV1ToV2 } from './json-v1-to-v2.js';
import { jsonV2ToV3 } from './json-v2-to-v3.js';
import { jsonV3ToV4 } from './json-v3-to-v4.js';
import { jsonV4ToV5 } from './json-v4-to-v5.js';
import { jsonV5ToV6 } from './json-v5-to-v6.js';

import type { MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * SCHEMA MIGRATION STEPS
 *
 * Each version transition lives in its own `*-vN-to-vM.ts` file. To add a new
 * schema version:
 *   1. Create a new `json-vN-to-vM.ts` (or `html-…`) file exporting a step.
 *   2. Append it to the relevant array below.
 *   3. Bump `CURRENT_SCHEMA_VERSION` in `@qti-editor/interfaces`.
 *
 * JSON version history:
 *   v1 — Baseline. Documents without a version marker are treated as v1.
 *   v2 — Normalize legacy hyphenated attrs to canonical camelCase.
 *   v3 — Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.
 *   v4 — Lift rubricScoringBlock into a sibling qtiRubricBlock node.
 *   v5 — Convert prosekit flat `list` nodes to bullet_list/ordered_list + list_item.
 *   v6 — Convert legacy `bold`/`italic` marks to `strong`/`em`.
 *
 * HTML version history:
 *   v1 — Baseline. HTML/QTI without a version marker is treated as v1.
 *   v2 — Normalize legacy camelCase HTML attrs to canonical hyphenated attrs.
 */
export const JSON_MIGRATION_STEPS = [
  jsonV1ToV2,
  jsonV2ToV3,
  jsonV3ToV4,
  jsonV4ToV5,
  jsonV5ToV6,
] satisfies MigrationStep<NodeJSON>[];

export const HTML_MIGRATION_STEPS = [
  htmlV1ToV2,
] satisfies MigrationStep<string>[];

import { composeJsonStep, jsonRenameAttr } from '../helpers.js';

import type { MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v2 → v3: rename `correctResponse` → `rubricScoringBlock` on
 * `qtiExtendedTextInteraction`.
 */
export const jsonV2ToV3: MigrationStep<NodeJSON> = composeJsonStep({
  id: 'json-v2-to-v3-extended-text-correctResponse-to-rubricScoringBlock',
  fromVersion: 2,
  toVersion: 3,
  description: 'Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.',
  transforms: [
    (attrs, nodeType, path, context) => {
      if (nodeType !== 'qtiExtendedTextInteraction') return attrs;
      return jsonRenameAttr('correctResponse', 'rubricScoringBlock')(attrs, nodeType, path, context);
    },
  ],
});

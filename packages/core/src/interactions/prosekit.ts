/**
 * ProseKit Adapter for QTI Interactions
 *
 * Optional adapter for using the QTI interaction schemas with ProseKit.
 *
 * Usage:
 * ```typescript
 * import { defineQtiInteractionsExtension, defineQtiExtension } from '@qti-editor/core/interactions/prosekit';
 * import { createEditor } from 'prosekit/core';
 *
 * // Option 1: Just QTI nodes (compose with your own basic extension)
 * const editor = createEditor({ extension: union(defineBasicExtension(), defineQtiInteractionsExtension()) });
 *
 * // Option 2: All-in-one (includes basic extension)
 * const editor = createEditor({ extension: defineQtiExtension() });
 * ```
 */
import '@qti-components/theme/item.css';
import '@qti-editor/interactions/components/qti-choice-interaction/qti-choice-interaction.js';
import '@qti-editor/interactions/components/qti-prompt/qti-prompt.js';
import '@qti-editor/interactions/components/qti-select-point-interaction/qti-select-point-interaction.js';
import '@qti-editor/interactions/components/qti-simple-choice/qti-simple-choice.js';
import '@qti-editor/interactions/components/qti-text-entry-interaction/qti-text-entry-interaction.js';

import { insertChoiceInteraction } from '@qti-editor/interactions/components/qti-choice-interaction/qti-choice-interaction.commands.js';
import { qtiChoiceInteractionNodeSpec } from '@qti-editor/interactions/components/qti-choice-interaction/qti-choice-interaction.schema.js';
import { qtiPromptNodeSpec } from '@qti-editor/interactions/components/qti-prompt/qti-prompt.schema.js';
import { insertSelectPointInteraction } from '@qti-editor/interactions/components/qti-select-point-interaction/qti-select-point-interaction.commands.js';
import { imgSelectPointNodeSpec } from '@qti-editor/interactions/components/qti-select-point-interaction/img-select-point.schema.js';
import { qtiSelectPointInteractionNodeSpec } from '@qti-editor/interactions/components/qti-select-point-interaction/qti-select-point-interaction.schema.js';
import { qtiSimpleChoiceNodeSpec } from '@qti-editor/interactions/components/qti-simple-choice/qti-simple-choice.schema.js';
import { insertTextEntryInteraction } from '@qti-editor/interactions/components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import { qtiTextEntryInteractionNodeSpec } from '@qti-editor/interactions/components/qti-text-entry-interaction/qti-text-entry-interaction.schema.js';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, union } from 'prosekit/core';

/**
 * Define QTI interaction nodes only (no basic extension).
 * Use this when you want to compose with your own editor setup.
 */
export function defineQtiInteractionsExtension() {
  return union(
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'imgSelectPoint', ...imgSelectPointNodeSpec }),
    defineNodeSpec({ name: 'qtiSelectPointInteraction', ...qtiSelectPointInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
    defineKeymap({
      'Mod-Shift-q': insertChoiceInteraction,
      'Mod-Shift-p': insertSelectPointInteraction,
      'Mod-Shift-t': insertTextEntryInteraction,
    }),
  );
}

/**
 * Define the complete QTI extension for ProseKit
 *
 * This bundles together:
 * - Basic ProseKit functionality (paragraphs, headings, lists, etc.)
 * - QTI node schemas
 * - QTI keymaps (Mod-Shift-Q, Mod-Shift-P, Mod-Shift-T)
 */
export function defineQtiExtension() {
  return union(
    defineBasicExtension(),
    defineQtiInteractionsExtension(),
  );
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;

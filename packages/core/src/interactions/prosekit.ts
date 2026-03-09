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
import {
  insertChoiceInteraction,
  qtiChoiceEnterCommand,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interactions-qti-choice';
import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec,
} from '@qti-editor/interactions-qti-select-point';
import {
  insertTextEntryInteraction,
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interactions-qti-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-shared';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, union } from 'prosekit/core';

/**
 * Define QTI interaction nodes only (no basic extension).
 * Use this when you want to compose with your own editor setup.
 */
export function defineQtiInteractionsExtension() {
  return union(
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPromptParagraph', ...qtiPromptParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'imgSelectPoint', ...imgSelectPointNodeSpec }),
    defineNodeSpec({ name: 'qtiSelectPointInteraction', ...qtiSelectPointInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoiceParagraph', ...qtiSimpleChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
    defineKeymap({
      Enter: qtiChoiceEnterCommand,
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

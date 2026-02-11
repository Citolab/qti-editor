/**
 * ProseKit Adapter for QTI Plugin
 *
 * Optional adapter for using the QTI plugin with ProseKit.
 * Import from '@qti-editor/plugin-qti-interactions/prosekit' to use.
 *
 * Usage:
 * ```typescript
 * import { defineQtiExtension } from '@qti-editor/plugin-qti-interactions/prosekit';
 * import { createEditor } from 'prosekit/core';
 *
 * const editor = createEditor({ extension: defineQtiExtension() });
 * ```
 */
import '@qti-components/theme/dist/item.css';
import '@qti-components/prosemirror/components/qti-choice-interaction/qti-choice-interaction.js';
import '@qti-components/prosemirror/components/qti-inline-choice-interaction/qti-inline-choice-interaction.js';
import '@qti-components/prosemirror/components/qti-prompt/qti-prompt.js';
import '@qti-components/prosemirror/components/qti-simple-choice/qti-simple-choice.js';
import '@qti-components/prosemirror/components/qti-text-entry-interaction/qti-text-entry-interaction.js';


import {
  insertChoiceInteraction,
} from '@qti-components/prosemirror/components/qti-choice-interaction/qti-choice-interaction.commands.js';
import {
  qtiChoiceInteractionNodeSpec,
} from '@qti-components/prosemirror/components/qti-choice-interaction/qti-choice-interaction.schema.js';
import {
  insertInlineChoiceInteraction,
} from '@qti-components/prosemirror/components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';
import {
  qtiPromptNodeSpec,
} from '@qti-components/prosemirror/components/qti-prompt/qti-prompt.schema.js';
import {
  qtiSimpleChoiceNodeSpec,
} from '@qti-components/prosemirror/components/qti-simple-choice/qti-simple-choice.schema.js';
import {
  insertTextEntryInteraction,
} from '@qti-components/prosemirror/components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import {
  qtiTextEntryInteractionNodeSpec,
} from '@qti-components/prosemirror/components/qti-text-entry-interaction/qti-text-entry-interaction.schema.js';
import { defineBasicExtension } from 'prosekit/basic';
import { union, defineKeymap , defineNodeSpec } from 'prosekit/core';

/**
 * Define the complete QTI extension for ProseKit
 *
 * This bundles together:
 * - Basic ProseKit functionality (paragraphs, headings, lists, etc.)
 * - QTI node schemas
 * - QTI keymaps (Mod-Shift-Q, Mod-Shift-T, Enter, Backspace)
 * - QTI guards (prevent invalid nesting)
 */
export function defineQtiExtension() {
  // Create node extensions for QTI nodes
  const qtiNodeExtensions = [
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
  ];

  return union(
    // Basic editing (paragraphs, headings, lists, etc.)
    defineBasicExtension(),

    // // QTI nodes and marks
    ...qtiNodeExtensions,
    // ...qtiMarkExtensions,

    // // QTI keymaps
    defineKeymap({
      'Mod-Shift-q': insertChoiceInteraction,
      'Mod-Shift-t': insertTextEntryInteraction,
      'Mod-Shift-i': insertInlineChoiceInteraction
    }),

    // QTI guards
    // definePlugin(() => createChoiceInteractionGuards()),
  );
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;

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

import { defineBasicExtension } from 'prosekit/basic';
import { union, definePlugin, defineKeymap , defineNodeSpec, defineMarkSpec } from 'prosekit/core';
import {
  insertChoiceInteraction,
  insertTextEntryInteraction,
  splitQtiSimpleChoice,
  liftEmptyQtiSimpleChoice,
  createChoiceInteractionGuards,
} from './components/index.js';
import { nodes, marks } from './schema/prosemirror-schema';

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
  const qtiNodeExtensions = Object.entries(nodes)
    .filter(([name]) => name.startsWith('qti_'))
    .map(([name, spec]) => defineNodeSpec({ name, ...spec }));

  // Create mark extensions
  const qtiMarkExtensions = Object.entries(marks).map(([name, spec]) =>
    defineMarkSpec({ name, ...spec }),
  );

  return union(
    // Basic editing (paragraphs, headings, lists, etc.)
    defineBasicExtension(),

    // QTI nodes and marks
    ...qtiNodeExtensions,
    ...qtiMarkExtensions,

    // QTI keymaps
    defineKeymap({
      'Mod-Shift-q': insertChoiceInteraction,
      'Mod-Shift-t': insertTextEntryInteraction,
      Enter: splitQtiSimpleChoice,
      Backspace: liftEmptyQtiSimpleChoice,
    }),

    // QTI guards
    definePlugin(() => createChoiceInteractionGuards()),
  );
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;

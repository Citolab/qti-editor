/**
 * Shared Base QTI Node Definitions
 *
 * These are the foundational QTI nodes used across multiple QTI interactions:
 * - qti_prompt: Question or instruction text
 * - qti_simple_choice: Individual answer option
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl
 */

import { union, type Extension } from 'prosekit/core';

import { qtiPromptSpec, qtiPromptCommands, qtiPromptKeymap } from '../prompt';
import { qtiSimpleChoiceSpec, qtiSimpleChoiceCommands, qtiSimpleChoiceKeymap } from '../simple-choice';

// Import QTI schema definitions
import type { QtiPromptSchema, QtiSimpleChoiceSchema } from './qti-schema';

// Export schema types
export type { QtiPromptSchema, QtiSimpleChoiceSchema };

export * from '../prompt';
export * from '../simple-choice';

/**
 * Complete extension for base QTI nodes
 * Includes node specs, commands, and keymaps
 */
export function qtiBaseNodesExtension(): Extension {
  return union([
    qtiPromptSpec,
    qtiSimpleChoiceSpec,
    qtiPromptCommands,
    qtiSimpleChoiceCommands,
    qtiPromptKeymap,
    qtiSimpleChoiceKeymap,
  ]);
}

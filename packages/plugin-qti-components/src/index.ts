/**
 * QTI Components Plugin
 *
 * A modular collection of QTI interaction components.
 * Each component can be imported and registered individually,
 * or use the `allQtiComponentsExtension()` to register all at once.
 */

import type { Extension } from 'prosekit/core';
import { union } from 'prosekit/core';
import { choiceInteractionExtension } from './choice-interaction';
import { orderInteractionExtension } from './order-interaction';
// Import individual extensions
import { qtiBaseNodesExtension } from './shared/base-nodes';
import { textEntryInteractionExtension } from './text-entry-interaction';

// Export QTI 3.0 schemas and validation utilities
export * from './shared/qti-schema';

// Export shared base nodes (qti_prompt, qti_simple_choice)
export * from './shared/base-nodes';

// Export individual component modules
export * from './choice-interaction';
export * from './order-interaction';
export * from './text-entry-interaction';

/**
 * Convenience extension that includes all QTI components.
 * Use this if you want all QTI interactions available.
 *
 * IMPORTANT: This includes the base QTI nodes (qti_prompt, qti_simple_choice)
 * that are required by most QTI interactions.
 *
 * For more granular control, import and register individual
 * component extensions instead, but make sure to also include
 * qtiBaseNodesExtension() if your components need it.
 */
export function allQtiComponentsExtension(): Extension {
  return union([
    qtiBaseNodesExtension(),
    choiceInteractionExtension(),
    orderInteractionExtension(),
    textEntryInteractionExtension(),
  ]);
}

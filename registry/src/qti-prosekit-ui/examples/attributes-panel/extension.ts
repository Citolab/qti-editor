/**
 * Attributes Panel Extension Configuration
 *
 * This file shows how to configure the qtiAttributesExtension for your editor.
 */

import { union, type Extension } from 'prosekit/core';
import { qtiAttributesExtension, type QtiAttributesOptions } from '@qti-editor/core/attributes';

export interface AttributesPanelExtensionOptions extends QtiAttributesOptions {
  // Add any additional options specific to this example
}

/**
 * Returns the extension configured for the attributes panel example.
 * Customize the options to match your editor's needs.
 */
export function defineExtension(options: AttributesPanelExtensionOptions = {}): Extension {
  return union(
    qtiAttributesExtension({
      eventName: options.eventName ?? 'qti:attributes:update',
      eventTarget: options.eventTarget ?? document,
      eligible: options.eligible,
      trigger: options.trigger,
      onUpdate: options.onUpdate,
    }),
  );
}

export type { QtiAttributesOptions } from '@qti-editor/core/attributes';

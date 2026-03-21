/**
 * Attributes Panel Extension Configuration
 *
 * Source: registry/prosekit-ui/attributes-panel
 * Status: synced
 */

import { union, type Extension } from 'prosekit/core';
import { qtiAttributesExtension, type QtiAttributesOptions } from '@qti-editor/core/attributes';

export interface AttributesPanelExtensionOptions extends QtiAttributesOptions {
  // Add any additional options specific to your editor
}

/**
 * Returns the extension configured for the attributes panel.
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

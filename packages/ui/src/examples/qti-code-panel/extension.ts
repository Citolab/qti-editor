/**
 * QTI Code Panel Extension Configuration
 *
 * This file shows how to configure the qtiCodePanelExtension for your editor.
 */

import { union, type Extension } from 'prosekit/core';
import { qtiCodePanelExtension, type QtiCodePanelOptions } from '@qti-editor/qti-editor-kit/code';

export interface CodePanelExtensionOptions extends QtiCodePanelOptions {
  // Add any additional options specific to this example
}

/**
 * Returns the extension configured for the code panel example.
 * Customize the options to match your editor's needs.
 */
export function defineExtension(options: CodePanelExtensionOptions = {}): Extension {
  return union(
    qtiCodePanelExtension({
      eventName: options.eventName ?? 'qti:code:update',
      eventTarget: options.eventTarget ?? document,
      emitOnInit: options.emitOnInit ?? true,
    }),
  );
}

export type { QtiCodePanelOptions } from '@qti-editor/qti-editor-kit/code';

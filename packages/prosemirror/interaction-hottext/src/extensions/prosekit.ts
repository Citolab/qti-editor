/**
 * ProseKit extension wrappers for hottext interaction plugins.
 * Only import this file when using ProseKit.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import { createHottextWrapSelectionPlugin } from './wrap-selection.js';

/**
 * ProseKit extension that wraps the hottext wrap selection plugin.
 * Use this when integrating with ProseKit.
 */
export function defineHottextWrapSelectionExtension(): Extension {
  return definePlugin(createHottextWrapSelectionPlugin);
}

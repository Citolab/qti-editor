/**
 * ProseKit extension wrappers for match interaction plugins.
 * Only import this file when using ProseKit.
 */

import { definePlugin, type Extension } from 'prosekit/core';
import { createMatchCorrectResponsePlugin } from './correct-response.js';

/**
 * ProseKit extension that wraps the match correct response plugin.
 * Use this when integrating with ProseKit.
 */
export function defineMatchCorrectResponseExtension(): Extension {
  return definePlugin(createMatchCorrectResponsePlugin);
}

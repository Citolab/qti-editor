/**
 * ProseKit extension wrappers for order interaction plugins.
 * Only import this file when using ProseKit.
 */

import { definePlugin, type Extension } from 'prosekit/core';

import { createOrderCorrectResponsePlugin } from './correct-response.js';

/**
 * ProseKit extension that wraps the order correct response plugin.
 * Use this when integrating with ProseKit.
 */
export function defineOrderCorrectResponseExtension(): Extension {
  return definePlugin(createOrderCorrectResponsePlugin);
}

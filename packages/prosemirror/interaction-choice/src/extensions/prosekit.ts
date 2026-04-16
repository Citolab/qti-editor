/**
 * ProseKit extension wrappers for choice interaction plugins.
 * Only import this file when using ProseKit.
 */

import { definePlugin, type Extension } from 'prosekit/core';

import { createCorrectResponseClickPlugin } from './correct-response-click.js';

/**
 * ProseKit extension that wraps the correct response click plugin.
 * Use this when integrating with ProseKit.
 */
export function defineCorrectResponseClickExtension(): Extension {
  return definePlugin(createCorrectResponseClickPlugin);
}

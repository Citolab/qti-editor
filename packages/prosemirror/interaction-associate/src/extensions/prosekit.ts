/**
 * ProseKit extension wrappers for associate interaction plugins.
 * Only import this file when using ProseKit.
 */

import { definePlugin, type Extension } from 'prosekit/core';

import { createAssociateCorrectResponsePlugin } from './correct-response.js';

/**
 * ProseKit extension that wraps the associate correct response plugin.
 * Use this when integrating with ProseKit.
 */
export function defineAssociateCorrectResponseExtension(): Extension {
  return definePlugin(createAssociateCorrectResponsePlugin);
}

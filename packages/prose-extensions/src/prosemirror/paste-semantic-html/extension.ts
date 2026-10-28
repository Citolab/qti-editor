/**
 * ProseKit extension that wraps the semantic paste ProseMirror plugin.
 * Use this when integrating with ProseKit. Requires the `prosekit` peer dependency.
 */

import { definePlugin } from 'prosekit/core';

import { createSemanticPastePlugin, type SemanticPasteOptions } from './semantic-paste-plugin.js';

export function defineSemanticPasteExtension(options?: SemanticPasteOptions) {
  return definePlugin(() => createSemanticPastePlugin(options));
}

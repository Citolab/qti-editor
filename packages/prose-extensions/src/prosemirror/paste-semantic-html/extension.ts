/**
 * ProseKit extension that wraps the semantic paste ProseMirror plugin.
 * Use this when integrating with ProseKit. Requires the `prosekit` peer dependency.
 */

import { definePlugin } from 'prosekit/core';

import { createSemanticPastePlugin } from './semantic-paste-plugin.js';

export function defineSemanticPasteExtension() {
  return definePlugin(() => createSemanticPastePlugin());
}

/**
 * ProseKit extension that wraps the node attrs sync ProseMirror plugin.
 * Use this when integrating with ProseKit. Requires the `prosekit` peer dependency.
 */

import { definePlugin } from 'prosekit/core';

import { nodeAttrsSyncPlugin } from './node-attrs-sync-plugin.js';

export const nodeAttrsSyncExtension = definePlugin(() => nodeAttrsSyncPlugin);

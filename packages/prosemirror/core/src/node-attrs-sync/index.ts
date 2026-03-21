/**
 * Block Select Plugin
 *
 * ProseMirror plugin for selecting entire block nodes.
 */

export { nodeAttrsSyncPlugin } from './node-attrs-sync-plugin.js';

// ProseKit extension wrapper (optional - only works when prosekit is available)
import { definePlugin } from 'prosekit/core';
import { nodeAttrsSyncPlugin } from './node-attrs-sync-plugin.js';

/**
 * ProseKit extension that wraps the block select ProseMirror plugin.
 * Use this when integrating with ProseKit.
 */
export const nodeAttrsSyncExtension = definePlugin(() => nodeAttrsSyncPlugin);
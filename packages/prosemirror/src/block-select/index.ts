/**
 * Block Select Plugin
 *
 * ProseMirror plugin for selecting entire block nodes.
 */

export { blockSelectPlugin, NodeRangeSelection } from './block-select-plugin.js';

// ProseKit extension wrapper (optional - only works when prosekit is available)
import { definePlugin } from 'prosekit/core';
import { blockSelectPlugin } from './block-select-plugin.js';

/**
 * ProseKit extension that wraps the block select ProseMirror plugin.
 * Use this when integrating with ProseKit.
 */
export const blockSelectExtension = definePlugin(() => blockSelectPlugin);

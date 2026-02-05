import { definePlugin } from 'prosekit/core';
import { blockSelectPlugin } from './block-select-plugin';

/**
 * ProseKit extension that wraps the block select ProseMirror plugin
 */
export const blockSelectExtension = definePlugin(blockSelectPlugin);

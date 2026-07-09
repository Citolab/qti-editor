/**
 * ProseKit extension that wraps the block select ProseMirror plugin.
 * Use this when integrating with ProseKit. Requires the `prosekit` peer dependency.
 */

import { definePlugin } from 'prosekit/core';

import { blockSelectPlugin } from './block-select-plugin.js';

export const blockSelectExtension = definePlugin(() => blockSelectPlugin);

/**
 * @qti-editor/prosemirror-block-select
 */

export { blockSelectPlugin, NodeRangeSelection } from './block-select-plugin.js';

import { definePlugin } from 'prosekit/core';
import { blockSelectPlugin } from './block-select-plugin.js';

export const blockSelectExtension = definePlugin(() => blockSelectPlugin);

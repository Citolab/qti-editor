/**
 * @qti-editor/prosemirror-node-attrs-sync
 */

export { nodeAttrsSyncPlugin } from './node-attrs-sync-plugin.js';

import { definePlugin } from 'prosekit/core';
import { nodeAttrsSyncPlugin } from './node-attrs-sync-plugin.js';

export const nodeAttrsSyncExtension = definePlugin(() => nodeAttrsSyncPlugin);

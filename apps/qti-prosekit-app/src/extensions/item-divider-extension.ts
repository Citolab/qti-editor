/**
 * Registers the local qtiItemDivider node spec into the ProseKit schema and
 * imports the web component as a side effect. Replaces the descriptor-based
 * registration that previously came from @citolab/prose-qti.
 */

import { defineNodeSpec, type Extension } from 'prosekit/core';

import { qtiItemDividerNodeSpec } from '../components/item-divider/qti-item-divider.schema.js';
import '../components/item-divider/qti-item-divider.js';

export function defineItemDividerExtension(): Extension {
  return defineNodeSpec({ name: 'qtiItemDivider', ...qtiItemDividerNodeSpec });
}

/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * ProseMirror NodeSpec for qti-text-entry-interaction
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T14:03:01.331Z
 */

import type { NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from '../../schema/generated/schema-helpers.js';

const attrMap = {
    'responseIdentifier': 'response-identifier'
  };

/**
 * ProseMirror NodeSpec for qti-text-entry-interaction
 */
export const textEntryInteractionSchema: NodeSpec = {
  attrs: {
  'responseIdentifier': { default: null }
},
  parseDOM: [{ tag: 'qti-text-entry-interaction', getAttrs: (dom) => parseDomAttrs(dom, attrMap) }],
  toDOM: createToDOM('qti-text-entry-interaction', false, true, attrMap),
  inline: true,
  group: 'inline',
  marks: '_',
  atom: true,
  selectable: true,
};

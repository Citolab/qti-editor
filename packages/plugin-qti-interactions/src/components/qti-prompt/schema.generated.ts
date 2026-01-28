/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * ProseMirror NodeSpec for qti-prompt
 *
 * Generated from: src/scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T15:34:07.459Z
 */

import type { NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from '../../schema/schema-helpers';

const attrMap = {};

export const promptSchema: NodeSpec = {
  attrs: {},
  parseDOM: [{ tag: 'qti-prompt', getAttrs: (dom) => parseDomAttrs(dom, attrMap) }],
  toDOM: createToDOM('qti-prompt', true, false, attrMap),
  group: 'qti',
  content: 'block+',
  defining: true,
};

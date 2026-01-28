/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * ProseMirror NodeSpec for qti-prompt
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T14:03:01.331Z
 */

import type { NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from '../../schema/generated/schema-helpers.js';

const attrMap = {};

/**
 * ProseMirror NodeSpec for qti-prompt
 */
export const promptSchema: NodeSpec = {
  attrs: {},
  parseDOM: [{ tag: 'qti-prompt', getAttrs: (dom) => parseDomAttrs(dom, attrMap) }],
  toDOM: createToDOM('qti-prompt', true, false, attrMap),
  group: 'qti',
  content: 'block+',
  defining: true,
};

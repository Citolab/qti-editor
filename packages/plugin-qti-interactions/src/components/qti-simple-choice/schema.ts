/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * ProseMirror NodeSpec for qti-simple-choice
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T14:03:01.331Z
 */

import type { NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from '../../schema/generated/schema-helpers.js';

const attrMap = {
    'disabled': 'disabled',
    'fixed': 'fixed',
    'identifier': 'identifier',
    'readonly': 'readonly',
    'selected': 'selected'
  };

/**
 * ProseMirror NodeSpec for qti-simple-choice
 */
export const simpleChoiceSchema: NodeSpec = {
  attrs: {
  'disabled': { default: null },
  'fixed': { default: null },
  'identifier': { default: null },
  'readonly': { default: null },
  'selected': { default: null }
},
  parseDOM: [{ tag: 'qti-simple-choice', getAttrs: (dom) => parseDomAttrs(dom, attrMap) }],
  toDOM: createToDOM('qti-simple-choice', true, false, attrMap),
  group: 'qti',
  content: 'paragraph+',
  marks: '_',
  defining: true,
};

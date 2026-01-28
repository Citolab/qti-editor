/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * ProseMirror NodeSpec for qti-choice-interaction
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T14:03:01.331Z
 */

import type { NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from '../../schema/generated/schema-helpers.js';

const attrMap = {
    'disabled': 'disabled',
    'enabled': 'enabled',
    'maxChoices': 'max-choices',
    'minChoices': 'min-choices',
    'readonly': 'readonly',
    'required': 'required',
    'responseIdentifier': 'response-identifier',
    'shuffle': 'shuffle'
  };

/**
 * ProseMirror NodeSpec for qti-choice-interaction
 */
export const choiceInteractionSchema: NodeSpec = {
  attrs: {
  'disabled': { default: null },
  'enabled': { default: null },
  'maxChoices': { default: null },
  'minChoices': { default: null },
  'readonly': { default: null },
  'required': { default: null },
  'responseIdentifier': { default: null },
  'shuffle': { default: null }
},
  parseDOM: [{ tag: 'qti-choice-interaction', getAttrs: (dom) => parseDomAttrs(dom, attrMap) }],
  toDOM: createToDOM('qti-choice-interaction', true, false, attrMap),
  group: 'block',
  content: 'qti_prompt? qti_simple_choice+',
  defining: true,
  isolating: true,
};

/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * Combined ProseMirror schema for all QTI elements.
 * For per-component schemas, see the individual component folders.
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: 2026-01-28T14:03:01.330Z
 */

import type { MarkSpec, NodeSpec } from 'prosemirror-model';
import { parseDomAttrs, createToDOM } from './schema-helpers.js';

export const nodes: Record<string, NodeSpec> = {
  'qti_choice_interaction': {
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
    parseDOM: [{ tag: 'qti-choice-interaction', getAttrs: (dom) => parseDomAttrs(dom, {
    'disabled': 'disabled',
    'enabled': 'enabled',
    'maxChoices': 'max-choices',
    'minChoices': 'min-choices',
    'readonly': 'readonly',
    'required': 'required',
    'responseIdentifier': 'response-identifier',
    'shuffle': 'shuffle'
  }) }],
    toDOM: createToDOM('qti-choice-interaction', true, false, {
    'disabled': 'disabled',
    'enabled': 'enabled',
    'maxChoices': 'max-choices',
    'minChoices': 'min-choices',
    'readonly': 'readonly',
    'required': 'required',
    'responseIdentifier': 'response-identifier',
    'shuffle': 'shuffle'
  }),
    group: 'block',
    content: 'qti_prompt? qti_simple_choice+',
    defining: true,
    isolating: true,
  },
  'qti_prompt': {
    attrs: {},
    parseDOM: [{ tag: 'qti-prompt', getAttrs: (dom) => parseDomAttrs(dom, {}) }],
    toDOM: createToDOM('qti-prompt', true, false, {}),
    group: 'qti',
    content: 'block+',
    defining: true,
  },
  'qti_simple_choice': {
    attrs: {
  'disabled': { default: null },
  'fixed': { default: null },
  'identifier': { default: null },
  'readonly': { default: null },
  'selected': { default: null }
},
    parseDOM: [{ tag: 'qti-simple-choice', getAttrs: (dom) => parseDomAttrs(dom, {
    'disabled': 'disabled',
    'fixed': 'fixed',
    'identifier': 'identifier',
    'readonly': 'readonly',
    'selected': 'selected'
  }) }],
    toDOM: createToDOM('qti-simple-choice', true, false, {
    'disabled': 'disabled',
    'fixed': 'fixed',
    'identifier': 'identifier',
    'readonly': 'readonly',
    'selected': 'selected'
  }),
    group: 'qti',
    content: 'paragraph+',
    marks: '_',
    defining: true,
  },
  'qti_text_entry_interaction': {
    attrs: {
  'responseIdentifier': { default: null }
},
    parseDOM: [{ tag: 'qti-text-entry-interaction', getAttrs: (dom) => parseDomAttrs(dom, {
    'responseIdentifier': 'response-identifier'
  }) }],
    toDOM: createToDOM('qti-text-entry-interaction', false, true, {
    'responseIdentifier': 'response-identifier'
  }),
    inline: true,
    group: 'inline',
    marks: '_',
    atom: true,
    selectable: true,
  },
};

export const marks: Record<string, MarkSpec> = {};

export const tagNameToNodeName: Record<string, string> = {
  'qti-choice-interaction': 'qti_choice_interaction',
  'qti-prompt': 'qti_prompt',
  'qti-simple-choice': 'qti_simple_choice',
  'qti-text-entry-interaction': 'qti_text_entry_interaction'
};

export const toolbarNodeNames: string[] = [
  'qti_choice_interaction',
  'qti_text_entry_interaction'
];

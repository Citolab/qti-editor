import { Schema, type MarkSpec, type NodeSpec } from 'prosemirror-model';

const parseAttrValue = (value: string | null) => {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
};

const parseDomAttrs = (dom: Element, attrMap: Record<string, string>) => {
  const attrs: Record<string, string | number | boolean | undefined> = {};
  for (const [name, domAttr] of Object.entries(attrMap)) {
    const raw = dom.getAttribute(domAttr);
    const parsed = parseAttrValue(raw);
    if (parsed !== undefined) {
      attrs[name] = parsed;
    }
  }
  return attrs;
};

const toDomAttrs = (attrs: Record<string, unknown>, attrMap: Record<string, string>) => {
  const domAttrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    const domAttr = attrMap[key] || key;
    domAttrs[domAttr] = String(value);
  }
  return domAttrs;
};

const createToDOM = (
  tagName: string,
  hasContent: boolean,
  isAtom: boolean,
  attrMap: Record<string, string>
) => {
  return (node: { attrs: Record<string, unknown> }) => {
    const attrs = toDomAttrs(node.attrs || {}, attrMap);
    if (isAtom || !hasContent) {
      return [tagName, attrs];
    }
    return [tagName, attrs, 0];
  };
};

export const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  "qti_choice_interaction": {
    attrs: {
  "disabled": {},
  "enabled": {},
  "maxChoices": {},
  "minChoices": {},
  "readonly": {},
  "required": {},
  "responseIdentifier": {},
  "shuffle": {}
},
    parseDOM: [{ tag: "qti-choice-interaction", getAttrs: (dom) => parseDomAttrs(dom, {
    "disabled": "disabled",
    "enabled": "enabled",
    "maxChoices": "max-choices",
    "minChoices": "min-choices",
    "readonly": "readonly",
    "required": "required",
    "responseIdentifier": "response-identifier",
    "shuffle": "shuffle"
  }) }],
    toDOM: createToDOM("qti-choice-interaction", true, false, {
    "disabled": "disabled",
    "enabled": "enabled",
    "maxChoices": "max-choices",
    "minChoices": "min-choices",
    "readonly": "readonly",
    "required": "required",
    "responseIdentifier": "response-identifier",
    "shuffle": "shuffle"
  }),
    group: "block",
    content: "qti_prompt? qti_simple_choice+",
    defining: true,
    isolating: true,
  },
  "qti_prompt": {
    attrs: {},
    parseDOM: [{ tag: "qti-prompt", getAttrs: (dom) => parseDomAttrs(dom, {}) }],
    toDOM: createToDOM("qti-prompt", true, false, {}),
    group: "qti",
    content: "block+",
    defining: true,
  },
  "qti_simple_choice": {
    attrs: {
  "disabled": {},
  "fixed": {},
  "identifier": {},
  "readonly": {},
  "selected": {}
},
    parseDOM: [{ tag: "qti-simple-choice", getAttrs: (dom) => parseDomAttrs(dom, {
    "disabled": "disabled",
    "fixed": "fixed",
    "identifier": "identifier",
    "readonly": "readonly",
    "selected": "selected"
  }) }],
    toDOM: createToDOM("qti-simple-choice", true, false, {
    "disabled": "disabled",
    "fixed": "fixed",
    "identifier": "identifier",
    "readonly": "readonly",
    "selected": "selected"
  }),
    group: "qti",
    content: "paragraph+",
    marks: "_",
    defining: true,
  },
  "qti_text_entry_interaction": {
    attrs: {
  "responseIdentifier": {}
},
    parseDOM: [{ tag: "qti-text-entry-interaction", getAttrs: (dom) => parseDomAttrs(dom, {
    "responseIdentifier": "response-identifier"
  }) }],
    toDOM: createToDOM("qti-text-entry-interaction", false, true, {
    "responseIdentifier": "response-identifier"
  }),
    inline: true,
    group: "inline",
    marks: "_",
    atom: true,
    selectable: true,
  },
};

export const marks: Record<string, MarkSpec> = {};

export const schema = new Schema({ nodes, marks });

export const tagNameToNodeName = {
  "qti-choice-interaction": "qti_choice_interaction",
  "qti-prompt": "qti_prompt",
  "qti-simple-choice": "qti_simple_choice",
  "qti-text-entry-interaction": "qti_text_entry_interaction"
};

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
  "responseIdentifier": {},
  "shuffle": {},
  "maxChoices": {},
  "minChoices": {},
  "disabled": {},
  "readonly": {},
  "required": {},
  "enabled": {}
},
    parseDOM: [{ tag: "qti-choice-interaction", getAttrs: (dom) => parseDomAttrs(dom, {
    "responseIdentifier": "response-identifier",
    "shuffle": "shuffle",
    "maxChoices": "max-choices",
    "minChoices": "min-choices",
    "disabled": "disabled",
    "readonly": "readonly",
    "required": "required",
    "enabled": "enabled"
  }) }],
    toDOM: createToDOM("qti-choice-interaction", true, false, {
    "responseIdentifier": "response-identifier",
    "shuffle": "shuffle",
    "maxChoices": "max-choices",
    "minChoices": "min-choices",
    "disabled": "disabled",
    "readonly": "readonly",
    "required": "required",
    "enabled": "enabled"
  }),
    group: "block",
    content: "inline*",
  },
  "qti_prompt": {
    attrs: {},
    parseDOM: [{ tag: "qti-prompt", getAttrs: (dom) => parseDomAttrs(dom, {}) }],
    toDOM: createToDOM("qti-prompt", true, false, {}),
    group: "block",
    content: "inline*",
  },
  "qti_simple_choice": {
    attrs: {
  "identifier": {},
  "selected": {},
  "fixed": {},
  "disabled": {},
  "readonly": {}
},
    parseDOM: [{ tag: "qti-simple-choice", getAttrs: (dom) => parseDomAttrs(dom, {
    "identifier": "identifier",
    "selected": "selected",
    "fixed": "fixed",
    "disabled": "disabled",
    "readonly": "readonly"
  }) }],
    toDOM: createToDOM("qti-simple-choice", true, false, {
    "identifier": "identifier",
    "selected": "selected",
    "fixed": "fixed",
    "disabled": "disabled",
    "readonly": "readonly"
  }),
    group: "block",
    content: "inline*",
  },
  "qti_text_entry_interaction": {
    attrs: {
  "responseIdentifier": {}
},
    parseDOM: [{ tag: "qti-text-entry-interaction", getAttrs: (dom) => parseDomAttrs(dom, {
    "responseIdentifier": "response-identifier"
  }) }],
    toDOM: createToDOM("qti-text-entry-interaction", true, false, {
    "responseIdentifier": "response-identifier"
  }),
    group: "block",
    content: "inline*",
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

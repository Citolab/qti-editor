/**
 * QTI Text Entry Interaction Component
 *
 * Provides the text entry interaction node for fill-in-the-blank questions.
 * Exports schema, commands, and keymaps for text entry interactions.
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl#h.m12qketwgcxe
 */

// Import styles
import "./styles.css";

import { defineCommands, defineKeymap, defineNodeSpec, union } from "prosekit/core";
import type { Extension } from "prosekit/core";
import type { Command } from "prosekit/pm/state";

// Import QTI schema definitions
import type { QtiTextEntryInteractionSchema } from "../shared/qti-schema";

export type { QtiTextEntryInteractionSchema };

/**
 * Text Entry Interaction node specification
 * Implements QTI 3.0 textEntryInteraction element
 *
 * @see QtiTextEntryInteractionSchema for full attribute definitions
 */
export const qtiTextEntryInteractionSpec = defineNodeSpec({
  name: "qti_text_entry_interaction",
  group: "inline",
  inline: true,
  atom: true,
  attrs: {
    // Required attributes
    responseIdentifier: { default: "RESPONSE" },
    // Optional attributes (QTI 3.0 spec)
    baseType: { default: null },
    format: { default: null },
    expectedLength: { default: null },
    patternMask: { default: null },
    placeholderText: { default: null },
    required: { default: false },
    // Base attributes
    class: { default: null },
    lang: { default: null },
    dir: { default: null },
  },
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      class: node.attrs.class || "qti-text-entry-interaction",
      "response-identifier": node.attrs.responseIdentifier,
    };

    // Optional attributes
    if (node.attrs.baseType) attrs["base-type"] = node.attrs.baseType;
    if (node.attrs.format) attrs.format = node.attrs.format;
    if (node.attrs.expectedLength !== null) attrs["expected-length"] = String(node.attrs.expectedLength);
    if (node.attrs.patternMask) attrs["pattern-mask"] = node.attrs.patternMask;
    if (node.attrs.placeholderText) attrs["placeholder-text"] = node.attrs.placeholderText;
    if (node.attrs.required) attrs.required = "true";
    if (node.attrs.lang) attrs.lang = node.attrs.lang;
    if (node.attrs.dir) attrs.dir = node.attrs.dir;

    return ["qti-text-entry-interaction", attrs];
  },
  parseDOM: [
    {
      tag: "qti-text-entry-interaction",
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          responseIdentifier: el.getAttribute("response-identifier") || "RESPONSE",
          baseType: el.getAttribute("base-type") as "string" | "integer" | "float" | null,
          format: el.getAttribute("format") as "plain" | "preFormatted" | null,
          expectedLength: el.getAttribute("expected-length")
            ? parseInt(el.getAttribute("expected-length")!, 10)
            : null,
          patternMask: el.getAttribute("pattern-mask"),
          placeholderText: el.getAttribute("placeholder-text"),
          required: el.getAttribute("required") === "true",
          class: el.getAttribute("class"),
          lang: el.getAttribute("lang"),
          dir: el.getAttribute("dir") as "ltr" | "rtl" | null,
        };
      },
    },
  ],
});

// Command to insert a text entry interaction
export const insertTextEntryInteraction: Command = (state, dispatch) => {
  const type = state.schema.nodes.qti_text_entry_interaction;
  if (!type) return false;

  const textEntry = type.create({
    responseIdentifier: `TEXT_${Date.now()}`,
    expectedLength: 10,
    placeholderText: "Enter your answer...",
  });

  if (dispatch) dispatch(state.tr.replaceSelectionWith(textEntry).scrollIntoView());
  return true;
};

// Commands for text entry interaction
export const textEntryInteractionCommands = defineCommands({
  insertTextEntryInteraction: () => insertTextEntryInteraction,
});

// Keymaps for text entry interaction
export const textEntryInteractionKeymap = defineKeymap({
  "Mod-Shift-t": insertTextEntryInteraction,
});

// Complete extension for text entry interaction
export function textEntryInteractionExtension(): Extension {
  return union([
    qtiTextEntryInteractionSpec,
    textEntryInteractionCommands,
    textEntryInteractionKeymap,
  ]);
}

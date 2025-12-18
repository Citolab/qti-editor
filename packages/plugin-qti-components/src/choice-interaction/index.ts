/**
 * QTI Choice Interaction Component
 *
 * Provides the choice interaction node for multiple choice questions.
 * Exports schema, commands, and keymaps for choice interactions.
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl#h.m12qketwgcxe
 */

// Import styles
import "./styles.css";

import { defineCommands, defineKeymap, defineNodeSpec, union } from "prosekit/core";
import type { Extension } from "prosekit/core";
import type { Command } from "prosekit/pm/state";

// Import QTI schema definitions
import type { QtiChoiceInteractionSchema } from "../shared/qti-schema";

// Import and export interaction-specific keymaps
import { choiceInteractionKeymapExtension } from "./keymaps";
export * from "./keymaps";
export type { QtiChoiceInteractionSchema };

/**
 * Choice Interaction node specification
 * Implements QTI 3.0 choiceInteraction element
 *
 * @see QtiChoiceInteractionSchema for full attribute definitions
 */
export const qtiChoiceInteractionSpec = defineNodeSpec({
  name: "qti_choice_interaction",
  content: "qti_prompt? qti_simple_choice+",
  group: "block",
  defining: true,
  isolating: true,
  attrs: {
    // Required attributes
    responseIdentifier: { default: "RESPONSE" },
    maxChoices: { default: 1 },
    // Optional attributes (QTI 3.0 spec)
    minChoices: { default: null },
    shuffle: { default: false },
    orientation: { default: "vertical" },
    required: { default: false },
    // Base attributes
    class: { default: null },
    lang: { default: null },
    dir: { default: null },
  },
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      class: node.attrs.class || "qti-choice-interaction",
      "response-identifier": node.attrs.responseIdentifier,
      "max-choices": String(node.attrs.maxChoices),
    };

    // Optional attributes
    if (node.attrs.minChoices !== null) attrs["min-choices"] = String(node.attrs.minChoices);
    if (node.attrs.shuffle) attrs.shuffle = "true";
    if (node.attrs.orientation !== "vertical") attrs.orientation = node.attrs.orientation;
    if (node.attrs.required) attrs.required = "true";
    if (node.attrs.lang) attrs.lang = node.attrs.lang;
    if (node.attrs.dir) attrs.dir = node.attrs.dir;

    return ["qti-choice-interaction", attrs, 0];
  },
  parseDOM: [
    {
      tag: "qti-choice-interaction",
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          responseIdentifier: el.getAttribute("response-identifier") || "RESPONSE",
          maxChoices: parseInt(el.getAttribute("max-choices") || "1", 10),
          minChoices: el.getAttribute("min-choices")
            ? parseInt(el.getAttribute("min-choices")!, 10)
            : null,
          shuffle: el.getAttribute("shuffle") === "true",
          orientation: el.getAttribute("orientation") || "vertical",
          required: el.getAttribute("required") === "true",
          class: el.getAttribute("class"),
          lang: el.getAttribute("lang"),
          dir: el.getAttribute("dir") as "ltr" | "rtl" | null,
        };
      },
    },
  ],
});

// Command to insert a choice interaction
export const insertChoiceInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const promptType = schema.nodes.qti_prompt;
  const choiceType = schema.nodes.qti_simple_choice;
  const interactionType = schema.nodes.qti_choice_interaction;
  if (!promptType || !choiceType || !interactionType) return false;

  const prompt = promptType.create(
    null,
    schema.nodes.paragraph.create(null, schema.text("Which option is correct?"))
  );

  const choices = [
    choiceType.create(
      { identifier: "choice_A" },
      schema.nodes.paragraph.create(null, schema.text("Option A"))
    ),
    choiceType.create(
      { identifier: "choice_B" },
      schema.nodes.paragraph.create(null, schema.text("Option B"))
    ),
    choiceType.create(
      { identifier: "choice_C" },
      schema.nodes.paragraph.create(null, schema.text("Option C"))
    ),
  ];

  const interaction = interactionType.create(
    { responseIdentifier: `CHOICE_${Date.now()}`, maxChoices: 1 },
    [prompt, ...choices]
  );

  if (dispatch) dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  return true;
};

// Commands for choice interaction
export const choiceInteractionCommands = defineCommands({
  insertChoiceInteraction: () => insertChoiceInteraction,
});

// Keymaps for choice interaction
export const choiceInteractionKeymap = defineKeymap({
  "Mod-Shift-q": insertChoiceInteraction,
});

// Complete extension for choice interaction
export function choiceInteractionExtension(): Extension {
  return union([
    qtiChoiceInteractionSpec,
    choiceInteractionCommands,
    choiceInteractionKeymap,
    choiceInteractionKeymapExtension(), // Include interaction-specific keymaps
  ]);
}

/**
 * QTI 3.0 Schema Definitions
 *
 * TypeScript schemas based on the IMS QTI 3.0 specification:
 * https://www.imsglobal.org/spec/qti/v3p0/impl
 *
 * These schemas define:
 * - Valid attributes for each QTI element
 * - Allowed content (child elements)
 * - Validation rules according to QTI spec
 */

/**
 * Base QTI attributes shared across multiple elements
 */
export interface QtiBaseAttributes {
  identifier?: string;
  class?: string;
  lang?: string;
  dir?: "ltr" | "rtl";
  [key: `data-${string}`]: string | undefined;
}

/**
 * Response identifier attribute
 * Used by interactions to bind to response variables
 */
export interface QtiResponseIdentifier {
  responseIdentifier: string;
}

/**
 * Prompt Schema
 * Container for question text or instructions
 *
 * QTI Spec: assessmentItem/itemBody/prompt
 * Content: Block-level flow content
 */
export interface QtiPromptSchema extends QtiBaseAttributes {
  type: "qti_prompt";
  content: "block+";
}

/**
 * Simple Choice Schema
 * An individual option in a choice or order interaction
 *
 * QTI Spec: choiceInteraction/simpleChoice, orderInteraction/simpleChoice
 * Content: Block-level flow content
 */
export interface QtiSimpleChoiceSchema extends QtiBaseAttributes {
  type: "qti_simple_choice";
  identifier: string;
  fixed?: boolean;
  templateIdentifier?: string;
  showHide?: "show" | "hide";
  content: "block+";
}

/**
 * Choice Interaction Schema
 * Multiple choice or multiple response question
 *
 * QTI Spec: assessmentItem/itemBody/choiceInteraction
 * Content: prompt?, simpleChoice+
 */
export interface QtiChoiceInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_choice_interaction";
  maxChoices: number;
  minChoices?: number;
  shuffle?: boolean;
  orientation?: "vertical" | "horizontal";
  required?: boolean;
  content: "qti_prompt? qti_simple_choice+";
}

/**
 * Order Interaction Schema
 * Question where user must arrange items in correct sequence
 *
 * QTI Spec: assessmentItem/itemBody/orderInteraction
 * Content: prompt?, simpleChoice+
 */
export interface QtiOrderInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_order_interaction";
  shuffle?: boolean;
  minChoices?: number;
  maxChoices?: number;
  orientation?: "vertical" | "horizontal";
  required?: boolean;
  content: "qti_prompt? qti_simple_choice+";
}

/**
 * Text Entry Interaction Schema
 * Inline text input for fill-in-the-blank questions
 *
 * QTI Spec: assessmentItem/itemBody/textEntryInteraction
 * Content: Empty (inline atom)
 */
export interface QtiTextEntryInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_text_entry_interaction";
  baseType?: "string" | "integer" | "float";
  format?: "plain" | "preFormatted";
  expectedLength?: number;
  patternMask?: string;
  placeholderText?: string;
  required?: boolean;
  content: null;
}

/**
 * Extended Text Interaction Schema
 * Multi-line text area for essay responses
 *
 * QTI Spec: assessmentItem/itemBody/extendedTextInteraction
 * Content: prompt?
 */
export interface QtiExtendedTextInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_extended_text_interaction";
  baseType?: "string";
  format?: "plain" | "preFormatted" | "xhtml";
  expectedLines?: number;
  expectedLength?: number;
  maxStrings?: number;
  minStrings?: number;
  placeholderText?: string;
  required?: boolean;
  content: "qti_prompt?";
}

/**
 * Match Interaction Schema
 * Question where user matches items from two sets
 *
 * QTI Spec: assessmentItem/itemBody/matchInteraction
 */
export interface QtiMatchInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_match_interaction";
  shuffle?: boolean;
  maxAssociations?: number;
  minAssociations?: number;
  required?: boolean;
  content: "qti_prompt? qti_simple_match_set qti_simple_match_set";
}

/**
 * Inline Choice Interaction Schema
 * Dropdown selection within text (gap match inline)
 *
 * QTI Spec: assessmentItem/itemBody/inlineChoiceInteraction
 */
export interface QtiInlineChoiceInteractionSchema
  extends QtiBaseAttributes,
    QtiResponseIdentifier {
  type: "qti_inline_choice_interaction";
  shuffle?: boolean;
  required?: boolean;
  content: "qti_inline_choice+";
}

/**
 * Validation helper types
 */

/** All QTI interaction schemas */
export type QtiInteractionSchema =
  | QtiChoiceInteractionSchema
  | QtiOrderInteractionSchema
  | QtiTextEntryInteractionSchema
  | QtiExtendedTextInteractionSchema
  | QtiMatchInteractionSchema
  | QtiInlineChoiceInteractionSchema;

/** All QTI node schemas */
export type QtiNodeSchema =
  | QtiPromptSchema
  | QtiSimpleChoiceSchema
  | QtiInteractionSchema;

/**
 * Content validation rules
 * Maps element types to their allowed child elements
 */
export const QTI_CONTENT_RULES: Record<string, string[]> = {
  qti_prompt: ["paragraph", "heading", "list", "blockquote", "pre", "hr"],
  qti_simple_choice: [
    "paragraph",
    "heading",
    "list",
    "blockquote",
    "pre",
    "hr",
  ],
  qti_choice_interaction: ["qti_prompt", "qti_simple_choice"],
  qti_order_interaction: ["qti_prompt", "qti_simple_choice"],
  qti_text_entry_interaction: [],
  qti_extended_text_interaction: ["qti_prompt"],
} as const;

/**
 * Attribute validation rules
 * Defines which attributes are required/optional for each element type
 */
export const QTI_ATTRIBUTE_RULES = {
  qti_prompt: {
    required: [],
    optional: ["identifier", "class", "lang", "dir"],
  },
  qti_simple_choice: {
    required: ["identifier"],
    optional: [
      "fixed",
      "templateIdentifier",
      "showHide",
      "class",
      "lang",
      "dir",
    ],
  },
  qti_choice_interaction: {
    required: ["responseIdentifier", "maxChoices"],
    optional: [
      "minChoices",
      "shuffle",
      "orientation",
      "required",
      "class",
      "lang",
      "dir",
    ],
  },
  qti_order_interaction: {
    required: ["responseIdentifier"],
    optional: [
      "shuffle",
      "minChoices",
      "maxChoices",
      "orientation",
      "required",
      "class",
      "lang",
      "dir",
    ],
  },
  qti_text_entry_interaction: {
    required: ["responseIdentifier"],
    optional: [
      "baseType",
      "format",
      "expectedLength",
      "patternMask",
      "placeholderText",
      "required",
      "class",
      "lang",
      "dir",
    ],
  },
  qti_extended_text_interaction: {
    required: ["responseIdentifier"],
    optional: [
      "baseType",
      "format",
      "expectedLines",
      "expectedLength",
      "maxStrings",
      "minStrings",
      "placeholderText",
      "required",
      "class",
      "lang",
      "dir",
    ],
  },
} as const;

/**
 * Validator function type
 * Can be used to build validation plugins
 */
export type QtiValidator = (
  nodeType: string,
  attributes: Record<string, any>,
  content: any[]
) => {
  valid: boolean;
  errors: string[];
};

/**
 * Helper to validate QTI node attributes
 */
export function validateQtiAttributes(
  nodeType: string,
  attributes: Record<string, any>
): { valid: boolean; errors: string[] } {
  const rules =
    QTI_ATTRIBUTE_RULES[nodeType as keyof typeof QTI_ATTRIBUTE_RULES];
  if (!rules) {
    return { valid: false, errors: [`Unknown QTI node type: ${nodeType}`] };
  }

  const errors: string[] = [];

  // Check required attributes
  for (const attr of rules.required) {
    if (
      !(attr in attributes) ||
      attributes[attr] === null ||
      attributes[attr] === undefined
    ) {
      errors.push(`Missing required attribute: ${attr}`);
    }
  }

  // Check for unknown attributes
  const allAllowed: string[] = [...rules.required, ...rules.optional];
  for (const attr of Object.keys(attributes)) {
    if (!allAllowed.includes(attr) && !attr.startsWith("data-")) {
      errors.push(`Unknown attribute: ${attr}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

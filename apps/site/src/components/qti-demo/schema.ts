/**
 * Landing-page demo schema — the minimal-subset shape from the
 * TypeScript Integration guide (`/docs/frameworks/vanilla`), trimmed to the
 * two interactions the live demo shows: choice and text entry.
 */

import { Schema } from 'prosemirror-model';
import { nodes as basicNodes, marks } from 'prosemirror-schema-basic';
import { qtiChoiceInteractionNodeSpec } from '@citolab/prose-qti/components/choice';
import { qtiTextEntryInteractionNodeSpec } from '@citolab/prose-qti/components/text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@citolab/prose-qti/components/shared';

export const demoSchema = new Schema({
  marks,
  nodes: {
    doc: { content: 'block+', attrs: { identifier: {}, title: {} } },
    paragraph: { ...basicNodes.paragraph, content: 'inline*', group: 'block' },
    text: basicNodes.text,

    // QTI shared building blocks
    qtiPrompt: { ...qtiPromptNodeSpec },
    qtiPromptParagraph: { ...qtiPromptParagraphNodeSpec },
    qtiSimpleChoice: { ...qtiSimpleChoiceNodeSpec },
    qtiSimpleChoiceParagraph: { ...qtiSimpleChoiceParagraphNodeSpec },

    // QTI interactions
    qtiChoiceInteraction: { ...qtiChoiceInteractionNodeSpec },
    qtiTextEntryInteraction: { ...qtiTextEntryInteractionNodeSpec },
  },
});

export interface QtiElementDefinition {
  // Identity
  id: string; // 'choice-interaction'
  nodeType: string; // 'qti_choice_interaction' (ProseMirror node name)
  tagName: string; // 'qti-choice-interaction' (DOM tag name)

  // Display
  label: string; // 'Multiple Choice'
  description: string; // 'A question with selectable options'
  icon: string; // '☑️' or icon name

  // Discovery (for search/filtering)
  keywords: string[]; // ['choice', 'quiz', 'mcq', 'select']
  category: 'interaction' | 'content' | 'structure';

  // Behavior
  insertable: boolean; // Can this be inserted via UI?
  defaultAttrs: Record<string, unknown>;

  // Command - generic factory
  createInsertCommand: (editor: any) => () => boolean;
}

import { qtiChoiceInteractionDefinition } from '../components/qti-choice-interaction/element-definition.generated';
import { qtiPromptDefinition } from '../components/qti-prompt/element-definition.generated';
import { qtiSimpleChoiceDefinition } from '../components/qti-simple-choice/element-definition.generated';
import { qtiTextEntryInteractionDefinition } from '../components/qti-text-entry-interaction/element-definition.generated';

export const qtiElements: QtiElementDefinition[] = [
  qtiChoiceInteractionDefinition,
  qtiPromptDefinition,
  qtiSimpleChoiceDefinition,
  qtiTextEntryInteractionDefinition,
];

// Convenience filters
export const insertableElements = qtiElements.filter((el) => el.insertable);
export const interactionElements = qtiElements.filter(
  (el) => el.category === 'interaction',
);
export const contentElements = qtiElements.filter((el) => el.category === 'content');
export const structureElements = qtiElements.filter(
  (el) => el.category === 'structure',
);

// Helper functions for common UI integrations
export function toSlashMenuFormat(elements: QtiElementDefinition[], editor: any) {
  return elements.map((el) => ({
    id: el.id,
    label: el.label,
    keywords: el.keywords,
    onSelect: () => el.createInsertCommand(editor)(),
  }));
}

export function toToolbarFormat(elements: QtiElementDefinition[], editor: any) {
  return elements.map((el) => ({
    icon: el.icon,
    title: el.label,
    onClick: () => el.createInsertCommand(editor)(),
  }));
}

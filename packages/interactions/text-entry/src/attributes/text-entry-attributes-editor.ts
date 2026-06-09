import type { AttributeFriendlyEditorDefinition } from '@qti-editor/interfaces';

export interface TextEntryAttributesFriendlyEditorDefinition
  extends AttributeFriendlyEditorDefinition {
  kind: 'textEntryAttributes';
}

export const textEntryAttributesFriendlyEditor = {
  attribute: 'correctResponse',
  kind: 'textEntryAttributes',
} as const satisfies TextEntryAttributesFriendlyEditorDefinition;

export const textEntryWidthClassOptions = [
  'qti-input-width-2',
  'qti-input-width-4',
  'qti-input-width-6',
  'qti-input-width-10',
  'qti-input-width-15',
  'qti-input-width-20',
] as const;

export type TextEntryWidthClassOption = (typeof textEntryWidthClassOptions)[number];

export interface TextEntryClassState {
  widthClass: TextEntryWidthClassOption | null;
  unknownClasses: string[];
}

const textEntryWidthClassSet = new Set<string>(textEntryWidthClassOptions);

function tokenizeClassValue(classValue: string | null | undefined): string[] {
  if (!classValue) return [];

  return classValue
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

export function parseTextEntryClassState(classValue: string | null | undefined): TextEntryClassState {
  const tokens = tokenizeClassValue(classValue);

  let widthClass: TextEntryWidthClassOption | null = null;
  for (const token of tokens) {
    if (textEntryWidthClassSet.has(token)) {
      widthClass = token as TextEntryWidthClassOption;
    }
  }

  return {
    widthClass,
    unknownClasses: tokens.filter(token => !textEntryWidthClassSet.has(token)),
  };
}

export function serializeTextEntryClassState(state: Partial<TextEntryClassState>): string | null {
  const tokens: string[] = [];

  for (const token of state.unknownClasses ?? []) {
    if (!token || textEntryWidthClassSet.has(token) || tokens.includes(token)) continue;
    tokens.push(token);
  }

  if (state.widthClass && !tokens.includes(state.widthClass)) {
    tokens.push(state.widthClass);
  }

  return tokens.length > 0 ? tokens.join(' ') : null;
}

export function parseTextEntryCaseSensitiveAttribute(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

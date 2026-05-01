import type { AttributeFriendlyEditorDefinition } from '@qti-editor/interfaces';

export interface ExtendedTextAttributesFriendlyEditorDefinition
  extends AttributeFriendlyEditorDefinition {
  kind: 'extendedTextAttributes';
}

export const extendedTextAttributesFriendlyEditor = {
  attribute: 'correctResponse',
  kind: 'extendedTextAttributes',
} as const satisfies ExtendedTextAttributesFriendlyEditorDefinition;

export const extendedTextHeightClassOptions = [
  'qti-height-lines-3',
  'qti-height-lines-6',
  'qti-height-lines-15',
] as const;

export type ExtendedTextHeightClassOption = (typeof extendedTextHeightClassOptions)[number];

export interface ExtendedTextClassState {
  heightClass: ExtendedTextHeightClassOption | null;
  unknownClasses: string[];
}

const extendedTextHeightClassSet = new Set<string>(extendedTextHeightClassOptions);

function tokenizeClassValue(classValue: string | null | undefined): string[] {
  if (!classValue) return [];

  return classValue
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

export function parseExtendedTextClassState(classValue: string | null | undefined): ExtendedTextClassState {
  const tokens = tokenizeClassValue(classValue);

  let heightClass: ExtendedTextHeightClassOption | null = null;
  for (const token of tokens) {
    if (extendedTextHeightClassSet.has(token)) {
      heightClass = token as ExtendedTextHeightClassOption;
    }
  }

  return {
    heightClass,
    unknownClasses: tokens.filter(token => !extendedTextHeightClassSet.has(token)),
  };
}

export function serializeExtendedTextClassState(state: Partial<ExtendedTextClassState>): string | null {
  const tokens: string[] = [];

  for (const token of state.unknownClasses ?? []) {
    if (!token || extendedTextHeightClassSet.has(token) || tokens.includes(token)) continue;
    tokens.push(token);
  }

  if (state.heightClass && !tokens.includes(state.heightClass)) {
    tokens.push(state.heightClass);
  }

  return tokens.length > 0 ? tokens.join(' ') : null;
}

/**
 * Get appropriate height class based on expectedLines value
 */
export function getHeightClassFromExpectedLines(expectedLines: number | null): ExtendedTextHeightClassOption | null {
  if (expectedLines == null) return null;
  if (expectedLines <= 3) return 'qti-height-lines-3';
  if (expectedLines <= 6) return 'qti-height-lines-6';
  return 'qti-height-lines-15';
}

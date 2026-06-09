import type { AttributeFriendlyEditorDefinition } from '@qti-editor/interfaces';

export type ChoiceInteractionClassGroupId =
  | 'labels'
  | 'labelsSuffix'
  | 'orientation'
  | 'inputControlHidden'
  | 'choicesStacking';

export interface ChoiceInteractionClassOption {
  value: string;
  label: string;
  description?: string;
}

export interface ChoiceInteractionClassGroup {
  id: ChoiceInteractionClassGroupId;
  title: string;
  description?: string;
  selection: 'single' | 'boolean';
  options: readonly ChoiceInteractionClassOption[];
}

export interface ChoiceInteractionClassState {
  labels: string | null;
  labelsSuffix: string | null;
  orientation: string | null;
  inputControlHidden: boolean;
  choicesStacking: string | null;
  unknownClasses: string[];
}

export interface ChoiceInteractionClassFriendlyEditorDefinition
  extends AttributeFriendlyEditorDefinition {
  kind: 'choiceInteractionClass';
}

const LABEL_OPTIONS: readonly ChoiceInteractionClassOption[] = [
  { value: 'qti-labels-none', label: 'No labels' },
  { value: 'qti-labels-decimal', label: 'Decimal labels' },
  { value: 'qti-labels-lower-alpha', label: 'Lower alpha labels' },
  { value: 'qti-labels-upper-alpha', label: 'Upper alpha labels' },
] as const;

const LABEL_SUFFIX_OPTIONS: readonly ChoiceInteractionClassOption[] = [
  { value: 'qti-labels-suffix-none', label: 'No suffix' },
  { value: 'qti-labels-suffix-period', label: 'Period suffix' },
  { value: 'qti-labels-suffix-parenthesis', label: 'Parenthesis suffix' },
] as const;

const ORIENTATION_OPTIONS: readonly ChoiceInteractionClassOption[] = [
  { value: 'qti-orientation-horizontal', label: 'Horizontal' },
  { value: 'qti-orientation-vertical', label: 'Vertical' },
] as const;

const INPUT_CONTROL_OPTIONS: readonly ChoiceInteractionClassOption[] = [
  { value: 'qti-input-control-hidden', label: 'Hide input control' },
] as const;

const STACKING_OPTIONS: readonly ChoiceInteractionClassOption[] = [
  { value: 'qti-choices-stacking-1', label: '1 column' },
  { value: 'qti-choices-stacking-2', label: '2 columns' },
  { value: 'qti-choices-stacking-3', label: '3 columns' },
  { value: 'qti-choices-stacking-4', label: '4 columns' },
  { value: 'qti-choices-stacking-5', label: '5 columns' },
] as const;

export const choiceInteractionClassGroups = [
  {
    id: 'labels',
    title: 'Labels',
    description: 'Choose how simple choices are labeled.',
    selection: 'single',
    options: LABEL_OPTIONS,
  },
  {
    id: 'labelsSuffix',
    title: 'Label suffix',
    description: 'Choose the suffix appended to each label.',
    selection: 'single',
    options: LABEL_SUFFIX_OPTIONS,
  },
  {
    id: 'orientation',
    title: 'Orientation',
    description: 'Choose whether choices are laid out horizontally or vertically.',
    selection: 'single',
    options: ORIENTATION_OPTIONS,
  },
  {
    id: 'inputControlHidden',
    title: 'Input control',
    description: 'Toggle visibility of the built-in input control.',
    selection: 'boolean',
    options: INPUT_CONTROL_OPTIONS,
  },
  {
    id: 'choicesStacking',
    title: 'Stacking',
    description: 'Choose how many columns choices are stacked into.',
    selection: 'single',
    options: STACKING_OPTIONS,
  },
] as const satisfies readonly ChoiceInteractionClassGroup[];

export const choiceInteractionClassFriendlyEditor = {
  attribute: 'class',
  kind: 'choiceInteractionClass',
} as const satisfies ChoiceInteractionClassFriendlyEditorDefinition;

const managedTokensByGroup = {
  labels: new Set(LABEL_OPTIONS.map(option => option.value)),
  labelsSuffix: new Set(LABEL_SUFFIX_OPTIONS.map(option => option.value)),
  orientation: new Set(ORIENTATION_OPTIONS.map(option => option.value)),
  inputControlHidden: new Set(INPUT_CONTROL_OPTIONS.map(option => option.value)),
  choicesStacking: new Set(STACKING_OPTIONS.map(option => option.value)),
} as const;

const managedTokens = new Set<string>(
  Object.values(managedTokensByGroup).flatMap(groupTokens => Array.from(groupTokens)),
);

function tokenizeClassValue(classValue: string | null | undefined): string[] {
  if (!classValue) return [];

  return classValue
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

export function parseChoiceInteractionClasses(
  classValue: string | null | undefined,
): ChoiceInteractionClassState {
  const tokens = tokenizeClassValue(classValue);

  const getLastManagedToken = (groupId: keyof typeof managedTokensByGroup): string | null => {
    let selected: string | null = null;
    for (const token of tokens) {
      if (managedTokensByGroup[groupId].has(token)) {
        selected = token;
      }
    }
    return selected;
  };

  return {
    labels: getLastManagedToken('labels'),
    labelsSuffix: getLastManagedToken('labelsSuffix'),
    orientation: getLastManagedToken('orientation'),
    inputControlHidden: tokens.includes('qti-input-control-hidden'),
    choicesStacking: getLastManagedToken('choicesStacking'),
    unknownClasses: tokens.filter(token => !managedTokens.has(token)),
  };
}

export function serializeChoiceInteractionClasses(
  state: Partial<ChoiceInteractionClassState>,
): string | null {
  const tokens: string[] = [];

  for (const token of state.unknownClasses ?? []) {
    if (!token || managedTokens.has(token) || tokens.includes(token)) continue;
    tokens.push(token);
  }

  const managedSelections = [
    state.labels ?? null,
    state.labelsSuffix ?? null,
    state.orientation ?? null,
    state.inputControlHidden ? 'qti-input-control-hidden' : null,
    state.choicesStacking ?? null,
  ];

  for (const token of managedSelections) {
    if (!token || tokens.includes(token)) continue;
    tokens.push(token);
  }

  return tokens.length > 0 ? tokens.join(' ') : null;
}

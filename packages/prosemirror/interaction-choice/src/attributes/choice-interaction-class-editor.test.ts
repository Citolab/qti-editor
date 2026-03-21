import {
  choiceInteractionClassFriendlyEditor,
  choiceInteractionClassGroups,
  parseChoiceInteractionClasses,
  serializeChoiceInteractionClasses,
} from './choice-interaction-class-editor';

describe('choice interaction class editor metadata', () => {
  it('declares the friendly class editor kind', () => {
    expect(choiceInteractionClassFriendlyEditor.attribute).toBe('class');
    expect(choiceInteractionClassFriendlyEditor.kind).toBe('choiceInteractionClass');
  });

  it('defines the expected editable groups', () => {
    expect(choiceInteractionClassGroups.map(group => group.id)).toEqual([
      'labels',
      'labelsSuffix',
      'orientation',
      'inputControlHidden',
      'choicesStacking',
    ]);
  });
});

describe('parseChoiceInteractionClasses', () => {
  it('parses grouped managed classes and preserves unknown classes', () => {
    const parsed = parseChoiceInteractionClasses(
      'custom-a qti-labels-suffix-period qti-orientation-vertical custom-b qti-choices-stacking-3',
    );

    expect(parsed.labels).toBeNull();
    expect(parsed.labelsSuffix).toBe('qti-labels-suffix-period');
    expect(parsed.orientation).toBe('qti-orientation-vertical');
    expect(parsed.choicesStacking).toBe('qti-choices-stacking-3');
    expect(parsed.inputControlHidden).toBe(false);
    expect(parsed.unknownClasses).toEqual(['custom-a', 'custom-b']);
  });

  it('keeps the last managed token for an exclusive group', () => {
    const parsed = parseChoiceInteractionClasses(
      'qti-orientation-horizontal qti-orientation-vertical qti-choices-stacking-2 qti-choices-stacking-5',
    );

    expect(parsed.orientation).toBe('qti-orientation-vertical');
    expect(parsed.choicesStacking).toBe('qti-choices-stacking-5');
  });
});

describe('serializeChoiceInteractionClasses', () => {
  it('serializes managed groups into a normalized class string', () => {
    const serialized = serializeChoiceInteractionClasses({
      labelsSuffix: 'qti-labels-suffix-period',
      orientation: 'qti-orientation-vertical',
      choicesStacking: 'qti-choices-stacking-3',
      inputControlHidden: true,
    });

    expect(serialized).toBe(
      'qti-labels-suffix-period qti-orientation-vertical qti-input-control-hidden qti-choices-stacking-3',
    );
  });

  it('preserves unknown classes but drops managed conflicts from unknowns', () => {
    const serialized = serializeChoiceInteractionClasses({
      unknownClasses: ['custom-a', 'qti-orientation-horizontal', 'custom-b'],
      orientation: 'qti-orientation-vertical',
      labels: 'qti-labels-decimal',
    });

    expect(serialized).toBe('custom-a custom-b qti-labels-decimal qti-orientation-vertical');
  });

  it('round-trips through parse and serialize stably', () => {
    const source =
      'custom-a qti-labels-lower-alpha qti-labels-suffix-parenthesis qti-orientation-horizontal qti-choices-stacking-2';

    const roundTripped = serializeChoiceInteractionClasses(parseChoiceInteractionClasses(source));

    expect(roundTripped).toBe(source);
  });

  it('returns null when no classes remain', () => {
    expect(serializeChoiceInteractionClasses({})).toBeNull();
  });
});

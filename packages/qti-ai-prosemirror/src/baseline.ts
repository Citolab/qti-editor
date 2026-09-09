/**
 * The versioned capability baseline: what the QTI-Editor schema family means, independent of any
 * one host's configuration.
 *
 * Two kinds of knowledge live here, and neither can be read off a ProseMirror schema:
 *
 * - **Attribute semantics.** A NodeSpec says `maxChoices: { default: 0 }` and nothing else. That a
 *   zero means "unlimited", that the value must be a non-negative integer, that `correctResponse`
 *   is a response value rather than a string — none of that is in the spec, and inferring a type
 *   from `typeof default` is wrong the moment the default is `null`.
 * - **Shared vocabulary.** QTI 3 layout and presentation are class tokens. Which tokens exist, which
 *   are mutually exclusive, and which the installed components actually render is knowledge about
 *   the standard and the runtime, not about the editor's document model.
 *
 * `createCapabilities` derives each host's effective manifest by intersecting this baseline with the
 * host's actual schema: an annotation for an attribute the schema lacks is dropped, a schema
 * attribute this baseline does not know gets a conservative derived entry, and a host can override
 * or extend the vocabulary through `AuthoringOptions`.
 *
 * Support is tracked per dimension, as the plan requires. `rendering: 'components'` means the token
 * is referenced by the `@qti-components` packages the editor pins (checked against the installed
 * dists on 2026-09-09). `'unverified'` means the token is standard QTI 3 shared vocabulary that the
 * editor will preserve and export, but no component stylesheet was found to honour it — an author
 * may see no visual change in the editor or player.
 */

export const BASELINE_VERSION = 1 as const;

/** Explicit value types. `response` is a correct-response value; `enum` is one of `values`. */
export type AttributeType = 'string' | 'integer' | 'number' | 'boolean' | 'response' | 'enum';

export interface AttributeAnnotation {
  type: AttributeType;
  /** Whether `null` is a valid value (usually meaning "unset"). */
  nullable: boolean;
  /** The HTML attribute name, when it is not derivable by probing `toDOM`. */
  htmlName?: string;
  /** Whether the agent may set this attribute directly with `setAttributes`. */
  editable: boolean;
  /** Lower bound for `integer` / `number`. */
  min?: number;
  /** Allowed values for `enum`. */
  values?: readonly string[];
  description: { en: string; nl: string };
  examples?: readonly string[];
}

/**
 * Attribute annotations, keyed by ProseMirror attribute name. Names are shared across the
 * interaction family (a `score` is a `score` on every interaction), which is what makes one table
 * sufficient; a node-specific meaning would need a node-scoped override, and none exists today.
 */
export const attributeAnnotations: Readonly<Record<string, AttributeAnnotation>> = {
  responseIdentifier: {
    type: 'string',
    nullable: true,
    htmlName: 'response-identifier',
    editable: false,
    description: {
      en: 'Identifier of the response variable. Unique per item; managed by the editor.',
      nl: 'Identifier van de responsvariabele. Uniek per item; beheerd door de editor.'
    }
  },
  identifier: {
    type: 'string',
    nullable: true,
    htmlName: 'identifier',
    editable: false,
    description: {
      en: 'Identifier of a choice, gap or hottext. Unique within its interaction; referenced by correctResponse.',
      nl: 'Identifier van een keuze, gat of hottext. Uniek binnen de interactie; gebruikt in correctResponse.'
    }
  },
  class: {
    type: 'string',
    nullable: true,
    htmlName: 'class',
    editable: false,
    description: {
      en: 'Space-separated class tokens. Change shared vocabulary with setVocabulary, never by rewriting this value.',
      nl: 'Klassen gescheiden door spaties. Wijzig gedeelde vocabulaire met setVocabulary, nooit door deze waarde te herschrijven.'
    }
  },
  correctResponse: {
    type: 'response',
    nullable: true,
    htmlName: 'correct-response',
    editable: true,
    description: {
      en: 'The correct answer(s): comma-separated identifiers for choices, answer strings for text entry, "source target" pairs for matching and gap match, ordered identifiers for ordering.',
      nl: 'Het juiste antwoord: identifiers gescheiden door komma’s voor keuzes, antwoordteksten voor tekstinvoer, "bron doel"-paren voor koppelen en gaten, geordende identifiers voor ordenen.'
    },
    examples: ['B', 'A,C', 'Paris', 'G1 A,G2 B']
  },
  score: {
    type: 'number',
    nullable: false,
    min: 0,
    htmlName: 'score',
    editable: true,
    description: {
      en: 'Points awarded for a fully correct response. Defaults to 1.',
      nl: 'Punten voor een volledig juist antwoord. Standaard 1.'
    }
  },
  maxChoices: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'max-choices',
    editable: true,
    description: {
      en: 'Maximum number of selections. 1 renders radio buttons; 0 means unlimited checkboxes; n > 1 allows at most n checkboxes.',
      nl: 'Maximaal aantal selecties. 1 geeft keuzerondjes; 0 betekent onbeperkt aanvinken; n > 1 staat hoogstens n vinkjes toe.'
    }
  },
  minChoices: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'min-choices',
    editable: true,
    description: {
      en: 'Minimum number of selections required. 0 means no minimum.',
      nl: 'Minimaal vereist aantal selecties. 0 betekent geen minimum.'
    }
  },
  maxAssociations: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'max-associations',
    editable: true,
    description: {
      en: 'Maximum number of associations the candidate may make. 0 means unlimited.',
      nl: 'Maximaal aantal koppelingen dat de kandidaat mag maken. 0 betekent onbeperkt.'
    }
  },
  minAssociations: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'min-associations',
    editable: true,
    description: { en: 'Minimum number of associations required.', nl: 'Minimaal vereist aantal koppelingen.' }
  },
  matchMax: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'match-max',
    editable: true,
    description: {
      en: 'How many times this choice may be used in associations. 0 means unlimited.',
      nl: 'Hoe vaak deze keuze in koppelingen gebruikt mag worden. 0 betekent onbeperkt.'
    }
  },
  matchMin: {
    type: 'integer',
    nullable: false,
    min: 0,
    htmlName: 'match-min',
    editable: true,
    description: {
      en: 'How many times this choice must be used at least.',
      nl: 'Hoe vaak deze keuze minimaal gebruikt moet worden.'
    }
  },
  shuffle: {
    type: 'boolean',
    nullable: false,
    htmlName: 'shuffle',
    editable: true,
    description: {
      en: 'Whether choices are presented in random order. Choices marked fixed keep their position.',
      nl: 'Of keuzes in willekeurige volgorde worden getoond. Keuzes met fixed houden hun plek.'
    }
  },
  fixed: {
    type: 'boolean',
    nullable: false,
    htmlName: 'fixed',
    editable: true,
    description: {
      en: 'Keep this choice in place when the interaction shuffles.',
      nl: 'Houd deze keuze op zijn plek wanneer de interactie schudt.'
    }
  },
  orientation: {
    type: 'enum',
    nullable: true,
    values: ['vertical', 'horizontal'],
    htmlName: 'orientation',
    editable: true,
    description: {
      en: 'Layout direction of an order interaction. Prefer the orientation vocabulary group; this attribute is the legacy form.',
      nl: 'Richting van een ordeningsinteractie. Gebruik liever de vocabulairegroep orientation; dit attribuut is de oude vorm.'
    }
  },
  expectedLength: {
    type: 'integer',
    nullable: true,
    min: 0,
    htmlName: 'expected-length',
    editable: true,
    description: {
      en: 'Hint for the expected answer length in characters.',
      nl: 'Indicatie van de verwachte antwoordlengte in tekens.'
    }
  },
  expectedLines: {
    type: 'integer',
    nullable: true,
    min: 0,
    htmlName: 'expected-lines',
    editable: true,
    description: {
      en: 'Hint for the expected number of lines of an extended answer.',
      nl: 'Indicatie van het verwachte aantal regels van een open antwoord.'
    }
  },
  placeholderText: {
    type: 'string',
    nullable: true,
    htmlName: 'placeholder-text',
    editable: true,
    description: { en: 'Placeholder shown in an empty input.', nl: 'Placeholder in een leeg invoerveld.' }
  },
  patternMask: {
    type: 'string',
    nullable: true,
    htmlName: 'pattern-mask',
    editable: true,
    description: {
      en: 'Regular expression the response must match.',
      nl: 'Reguliere expressie waaraan het antwoord moet voldoen.'
    },
    examples: ['[0-9]+', '-?\\d{0,3}']
  },
  caseSensitive: {
    type: 'boolean',
    nullable: false,
    htmlName: 'case-sensitive',
    editable: true,
    description: {
      en: 'Whether text answers are compared case-sensitively.',
      nl: 'Of tekstantwoorden hoofdlettergevoelig worden vergeleken.'
    }
  },
  dataPrompt: {
    type: 'string',
    nullable: true,
    htmlName: 'data-prompt',
    editable: true,
    description: {
      en: 'Prompt shown as the unselected option of an inline choice.',
      nl: 'Tekst van de niet-gekozen optie in een inline keuze.'
    }
  },
  dataFirstColumnHeader: {
    type: 'string',
    nullable: true,
    htmlName: 'data-first-column-header',
    editable: true,
    description: {
      en: 'Header of the first column of a tabular match interaction.',
      nl: 'Kop van de eerste kolom van een tabelkoppelinteractie.'
    }
  },
  areaMappings: {
    type: 'string',
    nullable: true,
    htmlName: 'area-mappings',
    editable: false,
    description: {
      en: 'JSON list of scored areas of a select-point interaction. Edited through the image, not by hand.',
      nl: 'JSON-lijst van gescoorde gebieden van een select-point-interactie. Wordt via de afbeelding bewerkt, niet met de hand.'
    }
  },
  imageSrc: {
    type: 'string',
    nullable: true,
    htmlName: 'src',
    editable: false,
    description: { en: 'Image source.', nl: 'Afbeeldingsbron.' }
  },
  imageAlt: {
    type: 'string',
    nullable: true,
    htmlName: 'alt',
    editable: true,
    description: { en: 'Alternative text of the image.', nl: 'Alternatieve tekst van de afbeelding.' }
  },
  imageWidth: {
    type: 'integer',
    nullable: true,
    min: 0,
    htmlName: 'width',
    editable: false,
    description: { en: 'Image width in pixels.', nl: 'Afbeeldingsbreedte in pixels.' }
  },
  imageHeight: {
    type: 'integer',
    nullable: true,
    min: 0,
    htmlName: 'height',
    editable: false,
    description: { en: 'Image height in pixels.', nl: 'Afbeeldingshoogte in pixels.' }
  }
};

export interface VocabularyOption {
  value: string;
  label: string;
}

export interface VocabularySupport {
  /** Whether the pinned `@qti-components` packages style this token. */
  rendering: 'components' | 'unverified';
  /** All shared vocabulary here is standard QTI 3 and exports unchanged. */
  export: 'standard';
}

export interface VocabularyGroup {
  id: string;
  /** `single`: at most one option at a time. `boolean`: the one option is present or absent. */
  selection: 'single' | 'boolean';
  options: VocabularyOption[];
  description: { en: string; nl: string };
  support: VocabularySupport;
}

const rendered: VocabularySupport = { rendering: 'components', export: 'standard' };
const unverified: VocabularySupport = { rendering: 'unverified', export: 'standard' };

const columns: VocabularyGroup = {
  id: 'columns',
  selection: 'single',
  options: [1, 2, 3, 4, 5].map(n => ({
    value: `qti-choices-stacking-${n}`,
    label: n === 1 ? '1 column' : `${n} columns`
  })),
  description: {
    en: 'Number of columns the choices are stacked into.',
    nl: 'Aantal kolommen waarin de keuzes worden gezet.'
  },
  support: rendered
};

const orientation: VocabularyGroup = {
  id: 'orientation',
  selection: 'single',
  options: [
    { value: 'qti-orientation-vertical', label: 'Vertical' },
    { value: 'qti-orientation-horizontal', label: 'Horizontal' }
  ],
  description: {
    en: 'Whether choices flow vertically or horizontally.',
    nl: 'Of keuzes verticaal of horizontaal staan.'
  },
  support: rendered
};

const choicesPlacement: VocabularyGroup = {
  id: 'choicesPlacement',
  selection: 'single',
  options: ['top', 'bottom', 'left', 'right'].map(side => ({ value: `qti-choices-${side}`, label: `Choices ${side}` })),
  description: {
    en: 'Where the draggable choices sit relative to the targets.',
    nl: 'Waar de versleepbare keuzes staan ten opzichte van de doelen.'
  },
  support: rendered
};

const inputWidth: VocabularyGroup = {
  id: 'inputWidth',
  selection: 'single',
  options: [1, 2, 3, 4, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 72].map(n => ({
    value: `qti-input-width-${n}`,
    label: `${n} characters wide`
  })),
  description: { en: 'Width of the input, in characters.', nl: 'Breedte van het invoerveld, in tekens.' },
  support: rendered
};

/**
 * Vocabulary groups per ProseMirror node type. Only interactions carry shared vocabulary; general
 * purpose classes (layout columns, alignment) are out of scope for attribute operations and belong
 * to content generation.
 */
export const vocabularyBaseline: Readonly<Record<string, readonly VocabularyGroup[]>> = {
  qtiChoiceInteraction: [
    {
      id: 'labels',
      selection: 'single',
      options: [
        { value: 'qti-labels-none', label: 'No labels' },
        { value: 'qti-labels-decimal', label: 'Decimal labels' },
        { value: 'qti-labels-lower-alpha', label: 'Lower alpha labels' },
        { value: 'qti-labels-upper-alpha', label: 'Upper alpha labels' }
      ],
      description: { en: 'How the choices are labelled.', nl: 'Hoe de keuzes worden gelabeld.' },
      support: rendered
    },
    {
      id: 'labelsSuffix',
      selection: 'single',
      options: [
        { value: 'qti-labels-suffix-none', label: 'No suffix' },
        { value: 'qti-labels-suffix-period', label: 'Period suffix' },
        { value: 'qti-labels-suffix-parenthesis', label: 'Parenthesis suffix' }
      ],
      description: { en: 'Suffix after each label.', nl: 'Achtervoegsel na elk label.' },
      support: rendered
    },
    orientation,
    {
      id: 'inputControlHidden',
      selection: 'boolean',
      options: [{ value: 'qti-input-control-hidden', label: 'Hide radio buttons / checkboxes' }],
      description: {
        en: 'Hide the radio buttons or checkboxes; the choice itself becomes the control.',
        nl: 'Verberg de keuzerondjes of vinkjes; de keuze zelf wordt de knop.'
      },
      support: rendered
    },
    columns
  ],
  qtiOrderInteraction: [orientation, choicesPlacement],
  qtiMatchInteraction: [
    {
      id: 'presentation',
      selection: 'boolean',
      options: [{ value: 'qti-match-tabular', label: 'Table presentation' }],
      description: {
        en: 'Present the match as a table instead of drag and drop.',
        nl: 'Toon het koppelen als tabel in plaats van slepen.'
      },
      support: rendered
    },
    choicesPlacement
  ],
  qtiGapMatchInteraction: [choicesPlacement],
  qtiTextEntryInteraction: [inputWidth],
  qtiInlineChoiceInteraction: [inputWidth],
  qtiExtendedTextInteraction: [
    {
      id: 'height',
      selection: 'single',
      options: [3, 6, 15].map(n => ({ value: `qti-height-lines-${n}`, label: `${n} lines high` })),
      description: { en: 'Height of the answer area, in lines.', nl: 'Hoogte van het antwoordvak, in regels.' },
      support: rendered
    },
    {
      id: 'counter',
      selection: 'single',
      options: [
        { value: 'qti-counter-up', label: 'Count characters up' },
        { value: 'qti-counter-down', label: 'Count remaining characters down' }
      ],
      description: {
        en: 'Show a character counter against expectedLength.',
        nl: 'Toon een tekenteller ten opzichte van expectedLength.'
      },
      support: unverified
    }
  ],
  qtiHottextInteraction: [
    {
      id: 'unselectedHidden',
      selection: 'boolean',
      options: [{ value: 'qti-unselected-hidden', label: 'Hide unselected hottexts' }],
      description: {
        en: 'Show only the selected hottexts as highlighted.',
        nl: 'Toon alleen geselecteerde hottexts als gemarkeerd.'
      },
      support: rendered
    }
  ]
};

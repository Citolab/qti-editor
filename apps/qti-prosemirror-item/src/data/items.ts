/**
 * Sample item catalog — the hardcoded Kennisnet items this demo can open.
 */

export interface SampleItem {
  /** Filename under public/qti/kennisnet (without extension). */
  id: string;
  title: string;
  kind: string;
}

/** The Kennisnet items that use the supported interactions. */
export const ITEMS: SampleItem[] = [
  { id: 'ITEM001', title: 'Meerkeuzevraag één antwoord', kind: 'choice' },
  { id: 'ITEM002', title: 'Meerkeuzevraag meerdere antwoorden', kind: 'choice' },
  { id: 'ITEM003', title: 'Tekstvraag – hoofdletterongevoelig', kind: 'text-entry' },
  { id: 'ITEM004', title: 'Tekstvraag – exacte match', kind: 'text-entry' },
  { id: 'ITEM005', title: 'Open tekstvraag', kind: 'extended-text' }
];

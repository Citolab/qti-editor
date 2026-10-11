/**
 * The identifier strategy: the default must keep minting exactly what the package always minted,
 * and `readableIdentifierStrategy` must give the short scheme on every route that mints — insert,
 * Enter, gap insertion, paste rescue, the copy action's re-mint and the composer's duplicate guard.
 *
 * Driving the commands rather than a mounted editor where possible: the question is what lands in
 * the document.
 */
import { createEditor } from 'prosekit/core';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test } from 'vitest';

import { buildAssessmentItemXml } from '../../../core/composer/index.js';
import { defineQtiExtension } from '../../../integration/interactions/prosekit.js';
import { createQtiSchema } from '../../../schema/create-qti-schema.js';
import { qtiPasteRescuePlugin } from '../../../schema/paste-rescue.js';
import {
  insertChoiceInteraction,
  insertSimpleChoiceOnEnter,
} from '../../choice/components/qti-choice-interaction/commands/insert-choice-interaction.commands.js';
import { insertExtendedTextInteraction } from '../../extended-text/components/qti-extended-text-interaction/qti-extended-text-interaction.commands.js';
import {
  insertGap,
  insertGapMatchInteraction,
} from '../../gap-match/components/qti-gap-match-interaction/qti-gap-match-interaction.commands.js';
import { insertHottextInteraction } from '../../hottext/components/qti-hottext-interaction/qti-hottext-interaction.commands.js';
import { insertInlineChoiceInteraction } from '../../inline-choice/components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';
import {
  insertMatchInteraction,
  insertSimpleAssociableChoiceOnEnter,
} from '../../match/components/qti-match-interaction/qti-match-interaction.commands.js';
import { insertOrderInteraction } from '../../order/components/qti-order-interaction/qti-order-interaction.commands.js';
import { insertSelectPointInteraction } from '../../select-point/components/qti-select-point-interaction/qti-select-point-interaction.commands.js';
import { insertTextEntryInteraction } from '../../text-entry/components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import { remintIdentifiers } from '../extensions/node-decorations.js';
import {
  createIdentifierStrategyPlugin,
  getIdentifierStrategy,
  readableIdentifierStrategy,
  uuidIdentifierStrategy,
} from './identifier-strategy.js';

import type { Node as PmNode } from 'prosemirror-model';
import type { Command, Plugin } from 'prosemirror-state';

const schema = createQtiSchema();
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const uuidShaped = (prefix: string) => new RegExp(`^${prefix}_${UUID}$`);

const readable = () => [createIdentifierStrategyPlugin(readableIdentifierStrategy)];

function emptyState(plugins: Plugin[] = [], doc?: PmNode): EditorState {
  return EditorState.create({
    doc: doc ?? schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]),
    schema,
    plugins,
  });
}

function run(state: EditorState, command: Command): EditorState {
  let next: EditorState | null = null;
  const handled = command(state, tr => {
    next = state.apply(tr);
  });
  if (!handled || !next) throw new Error('command declined');
  return next;
}

/** Every `[attr]` value of nodes named `typeName`, in document order. */
function attrsOf(doc: PmNode, typeName: string, attr = 'identifier'): string[] {
  const out: string[] = [];
  doc.descendants(node => {
    if (node.type.name === typeName) out.push(node.attrs[attr] as string);
  });
  return out;
}

const responses = (doc: PmNode) => {
  const out: string[] = [];
  doc.descendants(node => {
    if (typeof node.attrs.responseIdentifier === 'string') out.push(node.attrs.responseIdentifier);
  });
  return out;
};

/** Cursor at the end of the first textblock whose text matches. */
function cursorAtEndOf(state: EditorState, text: string): EditorState {
  let pos = -1;
  state.doc.descendants((node, at) => {
    if (pos === -1 && node.isTextblock && node.textContent === text) pos = at + node.nodeSize - 1;
  });
  if (pos === -1) throw new Error(`No textblock with text ${JSON.stringify(text)}`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
}

describe('readableIdentifierStrategy, on its own', () => {
  const response = (existing: string[]) =>
    readableIdentifierStrategy.responseIdentifier({ interactionType: 'x', prefix: 'RESPONSE', doc: null, existing });
  const option = (role: Parameters<typeof readableIdentifierStrategy.optionIdentifier>[0]['role'], existing: string[]) =>
    readableIdentifierStrategy.optionIdentifier({ interactionType: 'x', role, prefix: 'P', doc: null, existing });

  test('responses: RESPONSE first, then the lowest free RESPONSEn', () => {
    expect(response([])).toBe('RESPONSE');
    expect(response(['RESPONSE'])).toBe('RESPONSE2');
    expect(response(['RESPONSE', 'RESPONSE2'])).toBe('RESPONSE3');
    expect(response(['RESPONSE', 'RESPONSE3'])).toBe('RESPONSE2');
    expect(response(['RESPONSE2'])).toBe('RESPONSE');
  });

  test('choices, gap texts and areas: letters, lowest free first, AA after Z', () => {
    expect(option('choice', [])).toBe('A');
    expect(option('choice', ['A', 'B'])).toBe('C');
    expect(option('choice', ['A', 'C'])).toBe('B');
    expect(option('gapText', ['A'])).toBe('B');
    expect(option('area', [])).toBe('A');
    const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    expect(option('choice', alphabet)).toBe('AA');
  });

  test('match sources S, targets T, gaps G — numbered from 1', () => {
    expect(option('source', [])).toBe('S1');
    expect(option('source', ['S1', 'T1'])).toBe('S2');
    expect(option('target', ['S1', 'S2'])).toBe('T1');
    expect(option('gap', ['G1', 'A'])).toBe('G2');
  });
});

describe('configuration', () => {
  test('no plugin means the UUID strategy', () => {
    expect(getIdentifierStrategy(emptyState())).toBe(uuidIdentifierStrategy);
    expect(getIdentifierStrategy(null)).toBe(uuidIdentifierStrategy);
  });

  test('defineQtiExtension({ identifierStrategy }) installs it; defineQtiExtension() does not', () => {
    const configured = createEditor({ extension: defineQtiExtension({ identifierStrategy: readableIdentifierStrategy }) });
    expect(getIdentifierStrategy(configured.state)).toBe(readableIdentifierStrategy);

    const plain = createEditor({ extension: defineQtiExtension() });
    expect(getIdentifierStrategy(plain.state)).toBe(uuidIdentifierStrategy);
  });
});

describe('default strategy: identifiers are unchanged', () => {
  test('choice interaction', () => {
    const doc = run(emptyState(), insertChoiceInteraction).doc;
    expect(responses(doc)).toEqual([expect.stringMatching(uuidShaped('RESPONSE'))]);
    const ids = attrsOf(doc, 'qtiSimpleChoice');
    expect(ids).toHaveLength(3);
    ids.forEach(id => expect(id).toMatch(uuidShaped('SIMPLE_CHOICE')));
    expect(new Set(ids).size).toBe(3);
  });

  test('order, match, gap match, hottext, inline choice', () => {
    attrsOf(run(emptyState(), insertOrderInteraction).doc, 'qtiSimpleChoice').forEach(id =>
      expect(id).toMatch(uuidShaped('CHOICE')),
    );

    const match = attrsOf(run(emptyState(), insertMatchInteraction).doc, 'qtiSimpleAssociableChoice');
    expect(match.slice(0, 3).every(id => uuidShaped('SOURCE').test(id))).toBe(true);
    expect(match.slice(3).every(id => uuidShaped('TARGET').test(id))).toBe(true);

    const gapMatch = run(emptyState(), insertGapMatchInteraction).doc;
    attrsOf(gapMatch, 'qtiGap').forEach(id => expect(id).toMatch(uuidShaped('GAP')));
    attrsOf(gapMatch, 'qtiGapText').forEach(id => expect(id).toMatch(uuidShaped('GAP_TEXT')));

    attrsOf(run(emptyState(), insertHottextInteraction).doc, 'qtiHottext').forEach(id =>
      expect(id).toMatch(uuidShaped('HOTTEXT')),
    );
    attrsOf(run(emptyState(), insertInlineChoiceInteraction).doc, 'qtiInlineChoice').forEach(id =>
      expect(id).toMatch(uuidShaped('INLINE_CHOICE')),
    );
  });

  test('response-only interactions', () => {
    for (const command of [insertTextEntryInteraction, insertExtendedTextInteraction, insertSelectPointInteraction]) {
      expect(responses(run(emptyState(), command).doc)).toEqual([expect.stringMatching(uuidShaped('RESPONSE'))]);
    }
  });

  test('copy re-mint keeps the per-node-type prefixes', () => {
    const interaction = run(emptyState(), insertMatchInteraction).doc.child(0);
    const copy = remintIdentifiers(interaction);
    expect(copy.attrs.responseIdentifier).toMatch(uuidShaped('RESPONSE'));
    attrsOf(copy, 'qtiSimpleAssociableChoice').forEach(id => expect(id).toMatch(uuidShaped('SIMPLE_ASSOCIABLE_CHOICE')));
  });
});

describe('readable strategy: inserting', () => {
  test('choice interaction: RESPONSE and A, B, C; a second one gets RESPONSE2 and its own A, B, C', () => {
    const first = run(emptyState(readable()), insertChoiceInteraction);
    expect(responses(first.doc)).toEqual(['RESPONSE']);
    expect(attrsOf(first.doc, 'qtiSimpleChoice')).toEqual(['A', 'B', 'C']);

    const second = run(first, insertChoiceInteraction);
    expect(responses(second.doc)).toEqual(['RESPONSE', 'RESPONSE2']);
    expect(attrsOf(second.doc, 'qtiSimpleChoice')).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
  });

  test('order, inline choice and hottext use letters', () => {
    expect(attrsOf(run(emptyState(readable()), insertOrderInteraction).doc, 'qtiSimpleChoice')).toEqual(['A', 'B', 'C']);
    expect(attrsOf(run(emptyState(readable()), insertInlineChoiceInteraction).doc, 'qtiInlineChoice')).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(attrsOf(run(emptyState(readable()), insertHottextInteraction).doc, 'qtiHottext')).toEqual(['A', 'B']);
  });

  test('match: sources S1.., targets T1..', () => {
    const doc = run(emptyState(readable()), insertMatchInteraction).doc;
    expect(responses(doc)).toEqual(['RESPONSE']);
    expect(attrsOf(doc, 'qtiSimpleAssociableChoice')).toEqual(['S1', 'S2', 'S3', 'T1', 'T2', 'T3']);
  });

  test('gap match: gaps G1.., gap texts A..', () => {
    const doc = run(emptyState(readable()), insertGapMatchInteraction).doc;
    expect(attrsOf(doc, 'qtiGap')).toEqual(['G1', 'G2']);
    expect(attrsOf(doc, 'qtiGapText')).toEqual(['A', 'B', 'C']);
  });

  test('response-only interactions', () => {
    for (const command of [insertTextEntryInteraction, insertExtendedTextInteraction, insertSelectPointInteraction]) {
      expect(responses(run(emptyState(readable()), command).doc)).toEqual(['RESPONSE']);
    }
  });

  test('picks the next free response identifier when some exist', () => {
    const p = (response: string) =>
      schema.nodes.paragraph.create(null, schema.nodes.qtiTextEntryInteraction.create({ responseIdentifier: response }));
    const doc = schema.nodes.doc.create(null, [p('RESPONSE'), p('RESPONSE3'), schema.nodes.paragraph.create()]);
    const state = emptyState(readable(), doc);
    const atEnd = state.apply(state.tr.setSelection(TextSelection.atEnd(state.doc)));

    expect(responses(run(atEnd, insertTextEntryInteraction).doc)).toEqual(['RESPONSE', 'RESPONSE3', 'RESPONSE2']);
  });
});

describe('readable strategy: adding to an existing interaction', () => {
  test('Enter on a choice takes the next free letter in that interaction', () => {
    let state = run(emptyState(readable()), insertChoiceInteraction);
    const lastChoiceText = state.doc.child(0).lastChild!.textContent;
    state = run(cursorAtEndOf(state, lastChoiceText), insertSimpleChoiceOnEnter);
    expect(attrsOf(state.doc, 'qtiSimpleChoice')).toEqual(['A', 'B', 'C', 'D']);
  });

  test('Enter in the target set adds T4; Enter in the source set adds S4', () => {
    let state = run(emptyState(readable()), insertMatchInteraction);
    const choices: PmNode[] = [];
    state.doc.descendants(node => {
      if (node.type.name === 'qtiSimpleAssociableChoice') choices.push(node);
    });
    state = run(cursorAtEndOf(state, choices[5].textContent), insertSimpleAssociableChoiceOnEnter);
    state = run(cursorAtEndOf(state, choices[0].textContent), insertSimpleAssociableChoiceOnEnter);
    expect(attrsOf(state.doc, 'qtiSimpleAssociableChoice').sort()).toEqual(
      ['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3', 'T4'].sort(),
    );
  });

  test('inserting a gap takes the next free G', () => {
    let state = run(emptyState(readable()), insertGapMatchInteraction);
    let paragraphEnd = -1;
    state.doc.descendants((node, pos) => {
      if (paragraphEnd === -1 && node.type.name === 'paragraph' && node.textContent) paragraphEnd = pos + node.nodeSize - 1;
    });
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, paragraphEnd)));
    state = run(state, insertGap);
    expect(attrsOf(state.doc, 'qtiGap').sort()).toEqual(['G1', 'G2', 'G3']);
  });
});

describe('readable strategy: copy re-mint', () => {
  test('the copy gets the next free response identifier; options restart per interaction', () => {
    const state = run(emptyState(readable()), insertMatchInteraction);
    const interaction = state.doc.child(0);
    const copy = remintIdentifiers(interaction, {
      strategy: getIdentifierStrategy(state),
      doc: state.doc,
      interactionType: 'qti-match-interaction',
    });

    expect(copy.attrs.responseIdentifier).toBe('RESPONSE2');
    expect(attrsOf(copy, 'qtiSimpleAssociableChoice')).toEqual(['S1', 'S2', 'S3', 'T1', 'T2', 'T3']);
  });
});

describe('readable strategy: composer duplicate guard', () => {
  test('a duplicated response identifier is renamed to the next free one', () => {
    const itemBody = new DOMParser().parseFromString(
      '<qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">' +
        '<p><qti-text-entry-interaction response-identifier="RESPONSE"></qti-text-entry-interaction></p>' +
        '<p><qti-text-entry-interaction response-identifier="RESPONSE"></qti-text-entry-interaction></p>' +
        '</qti-item-body>',
      'application/xml',
    );
    const xml = buildAssessmentItemXml({ identifier: 'item', itemBody, identifierStrategy: readableIdentifierStrategy });
    const declarations = Array.from(
      new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('qti-response-declaration'),
      element => element.getAttribute('identifier'),
    );
    expect(declarations).toEqual(['RESPONSE', 'RESPONSE2']);
  });
});

describe('readable strategy: paste rescue', () => {
  let teardown: Array<() => void> = [];
  afterEach(() => {
    teardown.forEach(fn => fn());
    teardown = [];
  });

  function mount(state: EditorState) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = new EditorView(host, { state });
    teardown.push(() => {
      view.destroy();
      host.remove();
    });
    return view;
  }

  function paste(view: EditorView, html: string) {
    const data = new DataTransfer();
    data.setData('text/html', html);
    view.dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }

  test('pasted paragraphs become choices with the next free letters', () => {
    const plugins = [...readable(), qtiPasteRescuePlugin];
    const view = mount(run(emptyState(plugins), insertChoiceInteraction));
    const lastChoiceText = view.state.doc.child(0).lastChild!.textContent;
    view.updateState(cursorAtEndOf(view.state, lastChoiceText));

    paste(view, '<p>alpha</p><p>beta</p><p>gamma</p>');

    // The first block merges into the choice the cursor is in (C); the other two become D and E.
    expect(attrsOf(view.state.doc, 'qtiSimpleChoice')).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  test('a minted identifier never collides with one the slice keeps further down', () => {
    const plugins = [...readable(), qtiPasteRescuePlugin];
    const view = mount(run(emptyState(plugins), insertChoiceInteraction));
    view.updateState(cursorAtEndOf(view.state, view.state.doc.child(0).lastChild!.textContent));

    paste(view, '<p>x</p><p>plain</p><qti-simple-choice identifier="D"><p>kept</p></qti-simple-choice>');

    const ids = attrsOf(view.state.doc, 'qtiSimpleChoice');
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['A', 'B', 'C', 'E', 'D']);
  });

  test('pasting into a match source set mints the next free S', () => {
    const plugins = [...readable(), qtiPasteRescuePlugin];
    const view = mount(run(emptyState(plugins), insertMatchInteraction));
    const choices: PmNode[] = [];
    view.state.doc.descendants(node => {
      if (node.type.name === 'qtiSimpleAssociableChoice') choices.push(node);
    });
    view.updateState(cursorAtEndOf(view.state, choices[2].textContent));

    paste(view, '<p>one</p><p>two</p>');

    expect(attrsOf(view.state.doc, 'qtiSimpleAssociableChoice')).toEqual(['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3']);
  });

  test('default strategy: a paste into the source set behind a prompt mints SOURCE_, not TARGET_', () => {
    const view = mount(run(emptyState([qtiPasteRescuePlugin]), insertMatchInteraction));
    const choices: PmNode[] = [];
    view.state.doc.descendants(node => {
      if (node.type.name === 'qtiSimpleAssociableChoice') choices.push(node);
    });
    view.updateState(cursorAtEndOf(view.state, choices[2].textContent));

    paste(view, '<p>one</p><p>two</p>');

    const ids = attrsOf(view.state.doc, 'qtiSimpleAssociableChoice');
    expect(ids).toHaveLength(7);
    expect(ids[3]).toMatch(uuidShaped('SOURCE'));
  });
});

/**
 * Schema recovery, against a hand-built schema.
 *
 * Deliberately not the QTI schema: every assertion here is about the *rules* — what happens to a
 * node type the schema does not have, a mark it does not have, an attribute value it rejects — and a
 * schema small enough to read in one screen makes those rules checkable by eye. The QTI schema is
 * exercised by the corpus tests in `schema/`, which ask a different question.
 */
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import {
  createRecoveryMarkerPlugin,
  findUnrepresentableElements,
  findSchemaViolation,
  focusRecoverySite,
  listRecoverySites,
  recoveryKindOf,
  recoveryMarkerPluginKey,
  resolveRecoverySites,
  salvageJsonDocument,
  setRecoverySites,
} from './index.js';

import type { NodeJson } from './types.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    image: {
      group: 'block',
      attrs: { src: { default: '' }, width: { default: null, validate: 'string|null' } },
      parseDOM: [{ tag: 'img[src]' }],
      toDOM: () => ['img'],
    },
    text: { group: 'inline' },
  },
  marks: {
    em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', 0] },
  },
});

const paragraph = (text: string): NodeJson => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

describe('salvageJsonDocument', () => {
  test('unwraps an unknown node, keeps its children, and quotes what it removed', () => {
    const salvage = salvageJsonDocument(schema, {
      type: 'doc',
      content: [
        paragraph('before'),
        {
          type: 'qtiGapMatchInteraction',
          attrs: { identifier: 'RESPONSE' },
          content: [paragraph('Drag each city to its province'), paragraph('Amsterdam')],
        },
        paragraph('after'),
      ],
    });

    // The wrapper is gone; all four paragraphs are at the top level, in order.
    expect(salvage.document.content?.map(node => node.type)).toEqual([
      'paragraph', 'paragraph', 'paragraph', 'paragraph',
    ]);
    expect(findSchemaViolation(schema, salvage.document)).toBeNull();

    expect(salvage.changes).toHaveLength(1);
    expect(salvage.changes[0].data?.excerpt).toBe('Drag each city to its province Amsterdam');
    expect(salvage.changes[0].data?.unwrappedChildren).toBe(2);

    // The site points at where the children landed — index 1, covering both of them.
    expect(salvage.sites).toEqual([expect.objectContaining({
      kind: 'unwrapped-node',
      path: [1],
      span: 2,
      expectedType: 'paragraph',
      removedType: 'qtiGapMatchInteraction',
    })]);
    expect(salvage.changes[0].data?.siteId).toBe(salvage.sites[0].id);

    // And the original is kept verbatim, which is the only thing a future migration could run on.
    expect(salvage.preservedFragments[0].payload).toMatchObject({ type: 'qtiGapMatchInteraction' });
  });

  test('site paths survive earlier unwrapping, which shifts every later index', () => {
    const salvage = salvageJsonDocument(schema, {
      type: 'doc',
      content: [
        { type: 'unknownWrapper', content: [paragraph('one'), paragraph('two')] },
        { type: 'unknownAtom' },
        paragraph('three'),
        { type: 'anotherWrapper', content: [paragraph('four')] },
      ],
    });

    // Input indexes 0..3 produce output indexes 0,1 / — / 2 / 3.
    expect(salvage.document.content).toHaveLength(4);
    expect(salvage.sites.map(site => [site.path, site.span])).toEqual([
      [[0], 2], // unknownWrapper's two children
      [[2], 0], // unknownAtom left nothing behind, so the site is the gap before 'three'
      [[3], 1], // anotherWrapper's single child
    ]);

    // Resolved against the real document, each site covers exactly its own content.
    const doc = schema.nodeFromJSON(salvage.document);
    const resolved = resolveRecoverySites(doc, salvage.sites);
    expect(resolved.map(site => doc.textBetween(site.from, site.to, ' '))).toEqual([
      'one two',
      '',
      'four',
    ]);
  });

  test('drops an unknown mark and keeps the text it covered', () => {
    const salvage = salvageJsonDocument(schema, {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Amsterdam', marks: [{ type: 'highlight' }] }],
      }],
    });

    expect(salvage.document.content?.[0].content?.[0]).toEqual({
      type: 'text',
      text: 'Amsterdam',
      marks: [],
    });
    expect(salvage.changes[0].data?.excerpt).toBe('Amsterdam');
    expect(salvage.sites[0]).toMatchObject({ kind: 'dropped-mark', path: [0, 0], span: 1 });

    const resolved = resolveRecoverySites(schema.nodeFromJSON(salvage.document), salvage.sites);
    expect(resolved[0].inline).toBe(true);
  });

  test('resets an attribute value the schema rejects, and drops one it does not declare', () => {
    const salvage = salvageJsonDocument(schema, {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'a.png', width: 320, legacyAlign: 'left' } }],
    });

    expect(salvage.document.content?.[0].attrs).toEqual({ src: 'a.png' });
    expect(findSchemaViolation(schema, salvage.document)).toBeNull();
    expect(salvage.changes.map(change => change.attributeName).sort()).toEqual(['legacyAlign', 'width']);
    expect(salvage.changes.find(change => change.attributeName === 'width')?.data?.rejectedValue).toBe(320);
  });
});

describe('replaceable messages', () => {
  const doc: NodeJson = {
    type: 'doc',
    content: [
      { type: 'unknownWrapper', content: [paragraph('kept')] },
      { type: 'image', attrs: { src: 'a.png', width: 320, legacyAlign: 'left' } },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Amsterdam', marks: [{ type: 'highlight' }] }],
      },
    ],
  };

  test('every change declares its kind, so a message table needs no guesswork', () => {
    const salvage = salvageJsonDocument(schema, doc);

    // Attribute order follows the stored object, so `width` (rejected value) is reached before
    // `legacyAlign` (not declared at all).
    expect(salvage.changes.map(change => change.kind)).toEqual([
      'unwrapped-node',
      'reset-attribute',
      'dropped-attribute',
      'dropped-mark',
    ]);
    // And it survives the trip through a plain `CompatibilityChange` — a report, an event, JSON.
    expect(recoveryKindOf(JSON.parse(JSON.stringify(salvage.changes[0])))).toBe('unwrapped-node');
  });

  test('getMessage replaces the wording, per kind, without touching the facts', () => {
    const salvage = salvageJsonDocument(schema, doc, {
      getMessage: change => (change.kind === 'dropped-mark'
        ? `NL: opmaak ${String(change.data?.markType)} verwijderd`
        : undefined),
    });

    const mark = salvage.changes.find(change => change.kind === 'dropped-mark');
    expect(mark?.message).toBe('NL: opmaak highlight verwijderd');
    expect(mark?.data?.excerpt).toBe('Amsterdam');

    // Everything it declined to translate keeps the built-in English.
    expect(salvage.changes.find(change => change.kind === 'unwrapped-node')?.message)
      .toContain('Removed unknown node');
  });

  test('the DOM scan takes the same resolver', () => {
    const container = document.createElement('div');
    container.innerHTML = '<qti-companion-materials-info>ruler</qti-companion-materials-info>';

    const outcome = findUnrepresentableElements(schema, container, {
      getMessage: change => `<${change.nodeType}> kan hier niet`,
    });

    expect(outcome.changes[0].kind).toBe('unrepresentable-element');
    expect(outcome.changes[0].message).toBe('<qti-companion-materials-info> kan hier niet');
  });

  test('a resolver that throws costs a translation, not the recovery', () => {
    // Host code, running in the path that only executes when something has already gone wrong.
    const salvage = salvageJsonDocument(schema, doc, {
      getMessage: () => { throw new Error('missing translation key'); },
    });

    expect(salvage.document.content).toHaveLength(3);
    expect(salvage.changes).toHaveLength(4);
    expect(salvage.changes[0].message).toContain('Removed unknown node');

    const container = document.createElement('div');
    container.innerHTML = '<qti-companion-materials-info>ruler</qti-companion-materials-info>';
    const outcome = findUnrepresentableElements(schema, container, {
      getMessage: () => { throw new Error('missing translation key'); },
    });
    expect(outcome.changes[0].message).toContain('cannot represent');
  });

  test('a resolver that returns nothing changes nothing', () => {
    const withResolver = salvageJsonDocument(schema, doc, { getMessage: () => undefined });
    const without = salvageJsonDocument(schema, doc);

    expect(withResolver.changes.map(change => change.message))
      .toEqual(without.changes.map(change => change.message));
  });
});

describe('resolveRecoverySites', () => {
  test('discards a site whose expected type is no longer there', () => {
    const doc = schema.nodeFromJSON({ type: 'doc', content: [paragraph('kept')] });

    expect(resolveRecoverySites(doc, [
      { id: 'a', kind: 'unwrapped-node', path: [0], span: 1, expectedType: 'paragraph' },
    ])).toHaveLength(1);

    // A host that rewrote the document after salvage — inserting a required header, say — must lose
    // the marker rather than point it at innocent content.
    expect(resolveRecoverySites(doc, [
      { id: 'a', kind: 'unwrapped-node', path: [0], span: 1, expectedType: 'image' },
    ])).toEqual([]);
    expect(resolveRecoverySites(doc, [
      { id: 'a', kind: 'unwrapped-node', path: [7], span: 1 },
    ])).toEqual([]);
  });
});

describe('findUnrepresentableElements', () => {
  const parse = (html: string): Element => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  };

  test('names the elements no parse rule can match, and quotes their text', () => {
    const outcome = findUnrepresentableElements(
      schema,
      parse('<p>kept <em>emphasis</em></p><qti-companion-materials-info>ruler and compass</qti-companion-materials-info>'),
    );

    expect(outcome.changes).toHaveLength(1);
    expect(outcome.changes[0].nodeType).toBe('qti-companion-materials-info');
    expect(outcome.changes[0].data?.excerpt).toBe('ruler and compass');
    expect(outcome.preservedFragments[0].payload).toContain('ruler and compass');
  });

  test('stays silent on everything the schema can parse', () => {
    const outcome = findUnrepresentableElements(schema, parse('<p><em>a</em></p><img src="a.png">'));
    expect(outcome.changes).toEqual([]);
  });

  test('honours ignoreTags for content the host knows is consumed elsewhere', () => {
    const outcome = findUnrepresentableElements(schema, parse('<qti-response-declaration/>'), {
      ignoreTags: ['qti-response-declaration'],
    });
    expect(outcome.changes).toEqual([]);
  });
});

describe('recovery markers', () => {
  const stateWith = (doc: NodeJson) => EditorState.create({
    doc: schema.nodeFromJSON(doc),
    plugins: [createRecoveryMarkerPlugin()],
  });

  test('marks the sites that resolve and leaves the document untouched', () => {
    const state = stateWith({ type: 'doc', content: [paragraph('one'), paragraph('two')] });
    const marked = apply(state, setRecoverySites([
      { id: 'a', kind: 'unwrapped-node', path: [1], span: 1, expectedType: 'paragraph' },
      { id: 'gone', kind: 'unwrapped-node', path: [0], span: 1, expectedType: 'image' },
    ]));

    expect(listRecoverySites(marked).map(site => site.id)).toEqual(['a']);
    expect(marked.doc.eq(state.doc)).toBe(true);
  });

  test('a site covering several nodes gets a decoration apiece', () => {
    // `Decoration.node` describes exactly one node and is silently discarded when its range spans
    // more, so a two-paragraph site marked as one range renders nothing at all. Measured that way
    // first — the editor reported the site and showed no mark.
    const state = stateWith({
      type: 'doc',
      content: [paragraph('one'), paragraph('two'), paragraph('three')],
    });
    const marked = apply(state, setRecoverySites([
      { id: 'a', kind: 'unwrapped-node', path: [1], span: 2, expectedType: 'paragraph' },
    ]));

    const decorations = recoveryMarkerPluginKey.getState(marked)!.decorations;
    expect(decorations.find().length).toBe(2);
    expect(listRecoverySites(marked)[0].ranges).toHaveLength(2);
  });

  test('markers follow the content they mark', () => {
    const state = stateWith({ type: 'doc', content: [paragraph('one'), paragraph('two')] });
    const marked = apply(state, setRecoverySites([
      { id: 'a', kind: 'unwrapped-node', path: [1], span: 1, expectedType: 'paragraph' },
    ]));
    const before = listRecoverySites(marked)[0];

    // Insert text ahead of the site: it must move by as much.
    const edited = marked.apply(marked.tr.insertText('!!', 1));
    const after = listRecoverySites(edited)[0];

    expect(after.from).toBe(before.from + 2);
    expect(edited.doc.textBetween(after.from, after.to, ' ')).toBe('two');
  });

  test('focusRecoverySite selects at the site, and refuses an id that is not marked', () => {
    const state = stateWith({ type: 'doc', content: [paragraph('one'), paragraph('two')] });
    const marked = apply(state, setRecoverySites([
      { id: 'a', kind: 'unwrapped-node', path: [1], span: 1, expectedType: 'paragraph' },
    ]));

    expect(focusRecoverySite('nope')(marked, () => {})).toBe(false);

    const focused = apply(marked, focusRecoverySite('a'));
    expect(focused.selection.from).toBe(listRecoverySites(marked)[0].from + 1);
  });
});

/** Runs a command against a state and returns the resulting state. */
function apply(state: EditorState, command: (s: EditorState, d: (tr: never) => void) => boolean): EditorState {
  let next = state;
  command(state, (tr => { next = state.apply(tr); }) as never);
  return next;
}

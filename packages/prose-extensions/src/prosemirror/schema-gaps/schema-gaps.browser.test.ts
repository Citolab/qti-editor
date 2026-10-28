/**
 * Schema recovery, against a hand-built schema.
 *
 * Deliberately not the QTI schema: every assertion here is about the *rule* — what happens to an
 * element no `parseDOM` rule can match — and a schema small enough to read in one screen makes that
 * rule checkable by eye. The QTI schema is exercised by the corpus tests in `schema/`, which ask a
 * different question.
 */
import { Schema } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { findUnrepresentableElements } from './index.js';

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
    // Text only, like a `text*` interaction choice or a code block: it cannot hold the formula.
    plain: {
      group: 'block',
      content: 'text*',
      parseDOM: [{ tag: 'x-plain' }],
      toDOM: () => ['x-plain', 0],
    },
    text: { group: 'inline' },
    // A leaf the parser reads whole, children and all — like a MathML formula held as its source.
    formula: {
      group: 'inline',
      inline: true,
      atom: true,
      parseDOM: [{ tag: 'x-formula' }],
      toDOM: () => ['x-formula'],
    },
  },
  marks: {
    em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', 0] },
  },
});

const parse = (html: string): Element => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
};

describe('findUnrepresentableElements', () => {
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

  test('reports how many children survive in the unwrapped element’s place', () => {
    const outcome = findUnrepresentableElements(
      schema,
      parse('<qti-rubric-block><p>one</p><p>two</p></qti-rubric-block>'),
    );

    expect(outcome.changes[0].data?.unwrappedChildren).toBe(2);
    expect(outcome.changes[0].message).toContain('kept its 2 child element(s)');
  });

  test('stays silent on everything the schema can parse', () => {
    const outcome = findUnrepresentableElements(schema, parse('<p><em>a</em></p><img src="a.png">'));
    expect(outcome.changes).toEqual([]);
  });

  test('does not look inside a leaf, because the parser does not either', () => {
    const outcome = findUnrepresentableElements(schema, parse('<p><x-formula><x-fraction>½</x-fraction></x-formula></p>'));
    expect(outcome.changes).toEqual([]);
  });

  test('still reports the same element outside a leaf', () => {
    const outcome = findUnrepresentableElements(schema, parse('<p><x-fraction>½</x-fraction></p>'));
    expect(outcome.changes.map(change => change.nodeType)).toEqual(['x-fraction']);
  });

  test('reports an inline leaf whose parent cannot hold it, because the parser moves it out', () => {
    const outcome = findUnrepresentableElements(
      schema,
      parse('<x-plain>before <em><x-formula><x-fraction>½</x-fraction></x-formula></em></x-plain>'),
    );
    // The formula, once: not its inside, and the <em> (a mark) is passed through to <x-plain>.
    expect(outcome.changes).toHaveLength(1);
    expect(outcome.changes[0]).toMatchObject({
      nodeType: 'x-formula',
      message: 'Moved <x-formula> out of <x-plain>, which cannot hold it.',
      data: { movedOutOf: 'x-plain', excerpt: '½' },
    });
    expect(outcome.preservedFragments[0].payload).toBe('<x-formula><x-fraction>½</x-fraction></x-formula>');
  });

  test('stays silent on an inline leaf its parent holds, through a mark, or by wrapping it', () => {
    // In a paragraph, inside a mark the parser passes through, and loose at the top, where the
    // parser wraps it in a paragraph.
    const outcome = findUnrepresentableElements(
      schema,
      parse('<p><em><x-formula>a</x-formula></em></p><x-formula>b</x-formula>'),
    );
    expect(outcome.changes).toEqual([]);
  });

  test('honours ignoreTags for content the host knows is consumed elsewhere', () => {
    const outcome = findUnrepresentableElements(schema, parse('<qti-response-declaration/>'), {
      ignoreTags: ['qti-response-declaration'],
    });
    expect(outcome.changes).toEqual([]);
  });
});

describe('replaceable messages', () => {
  const dropped = () => parse('<qti-companion-materials-info>ruler</qti-companion-materials-info>');

  test('every change declares its kind, so a message table needs no guesswork', () => {
    const outcome = findUnrepresentableElements(schema, dropped());
    expect(outcome.changes.map(change => change.kind)).toEqual(['unrepresentable-element']);
  });

  test('getMessage replaces the wording without touching the facts', () => {
    const outcome = findUnrepresentableElements(schema, dropped(), {
      getMessage: change => `<${change.nodeType}> kan hier niet`,
    });

    expect(outcome.changes[0].message).toBe('<qti-companion-materials-info> kan hier niet');
    expect(outcome.changes[0].nodeType).toBe('qti-companion-materials-info');
    expect(outcome.changes[0].data?.excerpt).toBe('ruler');
  });

  test('a resolver may translate selectively and leave the rest in English', () => {
    const outcome = findUnrepresentableElements(
      schema,
      parse('<qti-companion-materials-info>ruler</qti-companion-materials-info><qti-rubric-block>note</qti-rubric-block>'),
      {
        getMessage: change => (change.nodeType === 'qti-rubric-block'
          ? 'NL: toelichting verwijderd'
          : undefined),
      },
    );

    expect(outcome.changes.find(change => change.nodeType === 'qti-rubric-block')?.message)
      .toBe('NL: toelichting verwijderd');
    expect(outcome.changes.find(change => change.nodeType === 'qti-companion-materials-info')?.message)
      .toContain('cannot represent');
  });

  test('a resolver that throws costs a translation, not the scan', () => {
    // Host code, running in the path that only executes when something has already gone wrong.
    const outcome = findUnrepresentableElements(schema, dropped(), {
      getMessage: () => { throw new Error('missing translation key'); },
    });

    expect(outcome.changes).toHaveLength(1);
    expect(outcome.changes[0].message).toContain('cannot represent');
  });

  test('a resolver that returns nothing changes nothing', () => {
    const withResolver = findUnrepresentableElements(schema, dropped(), { getMessage: () => undefined });
    const without = findUnrepresentableElements(schema, dropped());

    expect(withResolver.changes.map(change => change.message))
      .toEqual(without.changes.map(change => change.message));
  });
});

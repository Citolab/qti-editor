import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { clearFormattingInRange } from './clear-formatting.js';

const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks,
});

function apply(doc: ReturnType<typeof schema.nodes.doc.createChecked>, from: number, to: number) {
  const state = EditorState.create({ schema, doc });
  const tr = state.tr;
  const changed = clearFormattingInRange(tr, { from, to });
  return { changed, doc: state.apply(tr).doc };
}

describe('clearFormattingInRange', () => {
  test('strips every mark from the range', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.paragraph.createChecked(null, [
        schema.text('hello ', [schema.marks.strong.create()]),
        schema.text('world', [schema.marks.em.create()]),
      ]),
    ]);

    const { changed, doc: result } = apply(doc, 0, doc.content.size);

    expect(changed).toBe(true);
    expect(result.firstChild!.textContent).toBe('hello world');
    result.firstChild!.forEach(child => expect(child.marks).toHaveLength(0));
  });

  test('resets a heading to a plain paragraph', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.heading.createChecked({ level: 2 }, [schema.text('Title')]),
    ]);

    const { changed, doc: result } = apply(doc, 0, doc.content.size);

    expect(changed).toBe(true);
    expect(result.childCount).toBe(1);
    expect(result.firstChild!.type.name).toBe('paragraph');
    expect(result.firstChild!.textContent).toBe('Title');
  });

  test('unwraps a fully-selected blockquote into its plain paragraph', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.blockquote.createChecked(null, [
        schema.nodes.paragraph.createChecked(null, [schema.text('Quoted')]),
      ]),
    ]);

    const { changed, doc: result } = apply(doc, 0, doc.content.size);

    expect(changed).toBe(true);
    expect(result.childCount).toBe(1);
    expect(result.firstChild!.type.name).toBe('paragraph');
    expect(result.firstChild!.textContent).toBe('Quoted');
  });

  test('unwraps a fully-selected bullet list into flat paragraphs', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.bullet_list.createChecked(null, [
        schema.nodes.list_item.createChecked(null, [
          schema.nodes.paragraph.createChecked(null, [schema.text('One')]),
        ]),
        schema.nodes.list_item.createChecked(null, [
          schema.nodes.paragraph.createChecked(null, [schema.text('Two')]),
        ]),
      ]),
    ]);

    const { changed, doc: result } = apply(doc, 0, doc.content.size);

    expect(changed).toBe(true);
    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe('paragraph');
    expect(result.child(0).textContent).toBe('One');
    expect(result.child(1).type.name).toBe('paragraph');
    expect(result.child(1).textContent).toBe('Two');
  });

  test('flattens a nested bullet list (and a blockquote inside a list item) in one pass', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.bullet_list.createChecked(null, [
        schema.nodes.list_item.createChecked(null, [
          schema.nodes.paragraph.createChecked(null, [schema.text('Outer')]),
          schema.nodes.bullet_list.createChecked(null, [
            schema.nodes.list_item.createChecked(null, [
              schema.nodes.paragraph.createChecked(null, [schema.text('Inner')]),
            ]),
          ]),
        ]),
        schema.nodes.list_item.createChecked(null, [
          schema.nodes.paragraph.createChecked(null, [schema.text('Third')]),
          schema.nodes.blockquote.createChecked(null, [
            schema.nodes.paragraph.createChecked(null, [schema.text('Quoted')]),
          ]),
        ]),
      ]),
    ]);

    const { changed, doc: result } = apply(doc, 0, doc.content.size);

    expect(changed).toBe(true);
    expect(result.childCount).toBe(4);
    expect(result.child(0).type.name).toBe('paragraph');
    expect(result.child(0).textContent).toBe('Outer');
    expect(result.child(1).type.name).toBe('paragraph');
    expect(result.child(1).textContent).toBe('Inner');
    expect(result.child(2).type.name).toBe('paragraph');
    expect(result.child(2).textContent).toBe('Third');
    expect(result.child(3).type.name).toBe('paragraph');
    expect(result.child(3).textContent).toBe('Quoted');
  });

  test('dissolves a wrapper when the range covers only its inline content, not its own delimiters', () => {
    // This is the ordinary shape of a real selection: clicking into a block and
    // selecting its line (or triple-clicking it) never reaches past the block's
    // own opening/closing tokens. If dissolving required the range to include
    // those, "select this quote's text and clear formatting" would silently do
    // nothing — which is the bug this test pins.
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.blockquote.createChecked(null, [
        schema.nodes.paragraph.createChecked(null, [
          schema.text('Bold', [schema.marks.strong.create()]),
        ]),
      ]),
    ]);
    const from = 2; // start of "Bold", one position inside paragraph-inside-blockquote
    const to = doc.content.size - 2; // end of "Bold", symmetric on the way out

    const { changed, doc: result } = apply(doc, from, to);

    expect(changed).toBe(true);
    expect(result.childCount).toBe(1);
    expect(result.firstChild!.type.name).toBe('paragraph');
    expect(result.firstChild!.textContent).toBe('Bold');
    expect(result.firstChild!.firstChild!.marks).toHaveLength(0);
  });

  test('leaves a wrapper alone when the range covers only one of its several children', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.blockquote.createChecked(null, [
        schema.nodes.paragraph.createChecked(null, [
          schema.text('Bold', [schema.marks.strong.create()]),
        ]),
        schema.nodes.paragraph.createChecked(null, [schema.text('Untouched')]),
      ]),
    ]);
    // Covers only the first paragraph's text, not the second — genuinely partial.
    const from = 2;
    const to = 6;

    const { changed, doc: result } = apply(doc, from, to);

    expect(changed).toBe(true); // the mark still gets stripped
    expect(result.firstChild!.type.name).toBe('blockquote'); // but the wrapper survives
    expect(result.firstChild!.child(0).textContent).toBe('Bold');
    expect(result.firstChild!.child(0).firstChild!.marks).toHaveLength(0);
    expect(result.firstChild!.child(1).textContent).toBe('Untouched');
  });

  test('resets a heading to a paragraph when selected by its own text, elsewhere in the document', () => {
    // Regression test: a real "select this heading's line" selection sits one
    // position inside the heading's own delimiters on each side. An earlier
    // version of this function required the range to reach the heading's own
    // outer position, which happened to be satisfied by every prior test here
    // because they all used `apply(doc, 0, doc.content.size)` and the heading
    // was the document's first child — position 0 trivially "reached" it. A
    // heading preceded by a sibling exposes the bug: its own position is > 0,
    // so a content-only range starting just past that position must still work.
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.paragraph.createChecked(null, [schema.text('Intro')]),
      schema.nodes.heading.createChecked({ level: 1 }, [schema.text('Title')]),
    ]);
    const headingPos = doc.firstChild!.nodeSize; // start of the heading node itself
    const from = headingPos + 1; // start of "Title"
    const to = headingPos + 1 + 'Title'.length; // end of "Title"

    const { changed, doc: result } = apply(doc, from, to);

    expect(changed).toBe(true);
    expect(result.child(1).type.name).toBe('paragraph');
    expect(result.child(1).textContent).toBe('Title');
  });

  test('is a no-op on an empty range', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.paragraph.createChecked(null, [schema.text('hi')]),
    ]);

    const { changed } = apply(doc, 1, 1);

    expect(changed).toBe(false);
  });
});

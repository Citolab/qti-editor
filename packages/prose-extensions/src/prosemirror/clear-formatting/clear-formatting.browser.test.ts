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

  test('leaves a wrapper alone when the range only partially covers it', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.blockquote.createChecked(null, [
        schema.nodes.paragraph.createChecked(null, [
          schema.text('Bold', [schema.marks.strong.create()]),
        ]),
      ]),
    ]);
    // Range covers only the paragraph's inline content, not the blockquote's own boundaries.
    const from = 2;
    const to = doc.content.size - 2;

    const { changed, doc: result } = apply(doc, from, to);

    expect(changed).toBe(true); // the mark still gets stripped
    expect(result.firstChild!.type.name).toBe('blockquote'); // but the wrapper survives
    expect(result.firstChild!.firstChild!.textContent).toBe('Bold');
    expect(result.firstChild!.firstChild!.firstChild!.marks).toHaveLength(0);
  });

  test('is a no-op on an empty range', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.paragraph.createChecked(null, [schema.text('hi')]),
    ]);

    const { changed } = apply(doc, 1, 1);

    expect(changed).toBe(false);
  });
});

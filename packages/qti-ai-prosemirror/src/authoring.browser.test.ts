import { expect, test } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';

import {
  createAuthoringPlugin,
  captureAuthoringContext,
  prepareProposal,
  acceptProposal,
  discardProposal
} from './index.js';
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    qtiChoiceInteraction: {
      group: 'block',
      content: 'paragraph+',
      attrs: { class: { default: null }, maxChoices: { default: 1 } },
      toDOM: n => ['qti-choice-interaction', { class: n.attrs.class, 'max-choices': n.attrs.maxChoices }, 0],
      parseDOM: [{ tag: 'qti-choice-interaction' }]
    }
  }
});
function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const p = (s: string) => schema.nodes.paragraph.create(null, schema.text(s));
  const view = new EditorView(host, {
    state: EditorState.create({
      schema,
      doc: schema.nodes.doc.create(null, [
        p('Before'),
        schema.nodes.qtiChoiceInteraction.create({ class: 'custom qti-choices-stacking-1' }, p('Answer'))
      ]),
      plugins: [createAuthoringPlugin(), history()]
    })
  });
  return {
    view,
    close: () => {
      view.destroy();
      host.remove();
    }
  };
}
function proposal(view: EditorView) {
  const c = captureAuthoringContext(view);
  const t = c.targets.find(t => t.nodeType === 'qtiChoiceInteraction')!;
  return {
    version: 1,
    requestId: c.requestId,
    capabilityId: c.capabilityId,
    summary: 'Two columns',
    operations: [{ kind: 'setVocabulary', target: t.id, group: 'columns', value: 'qti-choices-stacking-2' }],
    suggestions: []
  };
}
test('stages without mutation, maps over earlier text edits, preserves classes, supports undo/redo', () => {
  const { view, close } = setup();
  try {
    const p = prepareProposal(view, proposal(view));
    expect(view.state.doc.lastChild?.attrs.class).toContain('stacking-1');
    view.dispatch(view.state.tr.insertText(' new', 3));
    const text = view.state.doc.firstChild!.textContent;
    acceptProposal(view, p);
    expect(view.state.doc.lastChild?.attrs.class).toBe('custom qti-choices-stacking-2');
    expect(view.state.doc.firstChild!.textContent).toBe(text);
    undo(view.state, view.dispatch);
    expect(view.state.doc.lastChild?.attrs.class).toContain('stacking-1');
    redo(view.state, view.dispatch);
    expect(view.state.doc.lastChild?.attrs.class).toContain('stacking-2');
    expect(() => acceptProposal(view, p)).toThrow();
  } finally {
    close();
  }
});
test('rejecting never erases author text', () => {
  const { view, close } = setup();
  try {
    const p = prepareProposal(view, proposal(view));
    view.dispatch(view.state.tr.insertText('new', 2));
    const doc = view.state.doc;
    discardProposal(view, p.reply.requestId);
    expect(view.state.doc.eq(doc)).toBe(true);
    expect(() => acceptProposal(view, p)).toThrow();
  } finally {
    close();
  }
});
test('refuses edits to stale targets and bad capability IDs', () => {
  const { view, close } = setup();
  try {
    const r = proposal(view);
    expect(() => prepareProposal(view, { ...r, capabilityId: 'wrong' })).toThrow();
    const p = prepareProposal(view, r);
    view.dispatch(view.state.tr.setNodeMarkup(8, undefined, { class: 'author' }));
    expect(() => acceptProposal(view, p)).toThrow();
  } finally {
    close();
  }
});
test('unsupported classes and attributes fail atomically', () => {
  const { view, close } = setup();
  try {
    const r = proposal(view);
    const doc = view.state.doc;
    expect(() =>
      prepareProposal(view, {
        ...r,
        operations: [
          ...r.operations,
          { kind: 'setAttributes', target: r.operations[0].target, attributes: { unknown: true } }
        ]
      })
    ).toThrow();
    expect(view.state.doc.eq(doc)).toBe(true);
  } finally {
    close();
  }
});

import {
  DOMParser,
  DOMSerializer,
  type Node as PmNode,
  type ResolvedPos,
  type Slice,
} from 'prosekit/pm/model';

import type { Editor } from 'prosekit/core';

function ownerDoc(editor: Editor): Document {
  return editor.view.dom.ownerDocument;
}

export function serializeDocToHtml(editor: Editor): string {
  const view = editor.view;
  const doc = ownerDoc(editor);
  const root = doc.createElement('div');
  DOMSerializer.fromSchema(view.state.schema).serializeFragment(
    view.state.doc.content,
    { document: doc },
    root
  );
  return root.innerHTML;
}

export function serializeRangeToHtml(editor: Editor, from: number, to: number): string {
  if (from === to) return '';
  const view = editor.view;
  const doc = ownerDoc(editor);
  const slice = view.state.doc.slice(from, to);
  const root = doc.createElement('div');
  DOMSerializer.fromSchema(view.state.schema).serializeFragment(
    slice.content,
    { document: doc },
    root
  );
  return root.innerHTML;
}

export function serializeSelectionToHtml(editor: Editor): string | undefined {
  const { from, to } = editor.view.state.selection;
  if (from === to) return undefined;
  return serializeRangeToHtml(editor, from, to);
}

// Pass `context` (a ResolvedPos) when inserting block-level HTML into an inline
// range — ProseMirror needs it to compute openStart/openEnd so the slice fits.
export function parseHtmlToSlice(
  editor: Editor,
  html: string,
  context?: ResolvedPos
): Slice {
  const doc = ownerDoc(editor);
  const tmp = doc.createElement('div');
  tmp.innerHTML = html;
  return DOMParser.fromSchema(editor.view.state.schema).parseSlice(
    tmp,
    context ? { context } : undefined
  );
}

export function parseHtmlToDoc(editor: Editor, html: string): PmNode {
  const doc = ownerDoc(editor);
  const tmp = doc.createElement('div');
  tmp.innerHTML = html;
  return DOMParser.fromSchema(editor.view.state.schema).parse(tmp);
}

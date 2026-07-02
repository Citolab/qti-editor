// `getChanges` and `decorateDeletion` are inlined here because the installed
// version of @prosekit/extensions (0.17.3) does not yet export them.
// Sourced from upstream @prosekit/extensions/src/commit/index.ts.

import { DOMSerializer, Fragment, Slice, type ProseMirrorNode } from 'prosekit/pm/model';
import { Decoration, type EditorView } from 'prosekit/pm/view';
import { ChangeSet, type Change } from 'prosemirror-changeset';

import type { Step } from 'prosekit/pm/transform';

export function getChanges(
  doc: ProseMirrorNode,
  parent: ProseMirrorNode,
  steps: Step[]
): readonly Change[] {
  const initSet = ChangeSet.create(parent);
  const currSet = initSet.addSteps(
    doc,
    steps.map(step => step.getMap()),
    null
  );
  return currSet.changes;
}

function renderDivWeight(view: EditorView): HTMLElement {
  return view.dom.ownerDocument.createElement('div');
}

function decorateDeletionSlice(slice: Slice): Array<(view: EditorView) => HTMLElement> {
  let { openStart, openEnd, content } = slice;

  while (openStart > 0 && openEnd > 0 && content.childCount === 1) {
    openStart--;
    openEnd--;
    content = content.child(0).content;
  }

  if (content.childCount === 0) return [];

  if (openStart > 0 && openEnd > 0 && content.childCount === 2) {
    const head = Fragment.from([content.child(0)]);
    const tail = Fragment.from([content.child(1)]);
    return [
      ...decorateDeletionSlice(new Slice(head, openStart, openStart)),
      renderDivWeight,
      ...decorateDeletionSlice(new Slice(tail, openEnd, openEnd)),
    ];
  }

  if (openStart > 0 && content.childCount >= 2) {
    const nodes = content.content;
    const head = Fragment.from(nodes.slice(0, 1));
    const body = Fragment.from(nodes.slice(1));
    return [
      ...decorateDeletionSlice(new Slice(head, openStart, openStart)),
      ...decorateDeletionSlice(new Slice(body, 0, openEnd)),
    ];
  }

  if (openEnd > 0 && content.childCount >= 2) {
    const nodes = content.content;
    const body = Fragment.from(nodes.slice(0, -1));
    const tail = Fragment.from(nodes.slice(-1));
    return [
      ...decorateDeletionSlice(new Slice(body, openStart, 0)),
      ...decorateDeletionSlice(new Slice(tail, openEnd, openEnd)),
    ];
  }

  const schema = content.child(0).type.schema;
  const isInline = content.child(0).isInline;

  const render = (view: EditorView): HTMLElement => {
    const document = view.dom.ownerDocument;
    const element = document.createElement(isInline ? 'span' : 'div');
    const serializer = DOMSerializer.fromSchema(schema);
    serializer.serializeFragment(content, { document }, element);
    element.classList.add('prosekit-commit-deletion');
    return element;
  };

  return [render];
}

export function decorateDeletion(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  pos: number,
  extraAttrs?: Readonly<Record<string, string>>
): Decoration[] {
  const slice = doc.slice(from, to);
  const renders = decorateDeletionSlice(slice);
  const count = renders.length;

  return renders.map((render, index) => {
    const wrappedRender = extraAttrs
      ? (view: EditorView): HTMLElement => {
          const el = render(view);
          for (const [k, v] of Object.entries(extraAttrs)) {
            el.setAttribute(k, v);
          }
          return el;
        }
      : render;
    return Decoration.widget(pos, wrappedRender, {
      side: -20 - count + index,
      ignoreSelection: true,
    });
  });
}

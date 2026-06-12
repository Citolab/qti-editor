/**
 * Editor mount — wires a ProseMirror document into a host element with the
 * shared plugin stack plus a per-editor attributes panel.
 *
 * This module also carries the side-effect imports that register the QTI
 * interaction edit elements (custom elements used by the node views) and the
 * ProseMirror CSS.
 */

import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { attributesPanelPlugin } from '@qti-editor/prosemirror-plugins';

import { editableAttrs } from './schema.js';
import { editorPlugins } from './plugins.js';

// Register the interaction edit elements (custom elements used by the views).
import '@qti-editor/interaction-choice/register.js';
import '@qti-editor/interaction-extended-text/register.js';
import '@qti-editor/interaction-text-entry/register.js';
import '@qti-editor/interaction-shared/components/qti-prompt/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-choice/register.js';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-menu/style/menu.css';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

/** Mount an editor for `doc` into `container`, wiring the attributes panel into `panelEl`. */
export function mountEditor(container: HTMLElement, doc: ProseMirrorNode, panelEl: HTMLElement): EditorView {
  const view = new EditorView(container, {
    state: EditorState.create({
      doc,
      plugins: [...editorPlugins, attributesPanelPlugin(panelEl, { editableAttrs })]
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
}

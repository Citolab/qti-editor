/**
 * Pure-ProseMirror QTI roundtrip regression for ITEM009 (match — directedPair multiple).
 *
 *   ITEM009.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripMatch            (hoist correct-response/score onto interactions)
 *     → roundtripXmlToPm   (import item-body + doc attrs into the PM doc)
 *     → pmToRoundtripXml   (export PM doc back to the editor-origin item-body)
 *     → buildSingleAssessmentItemXml (compose the complete QTI assessment item)
 *
 * The import/export pipeline is exported so the regression test can drive it
 * directly (without rendering); the story is a thin visual wrapper around it.
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { Schema, type Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes, marks } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { roundtripMatch, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import { exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import { blockSelectPlugin } from '@citolab/prose-extensions/prosemirror';
import { matchInteractionDescriptor } from '@citolab/prose-qti/components/match';
import sourceXML from '@qti-editor/example-items/ITEM009.xml?raw';

import '@citolab/prose-qti/components/match/register.js';
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import { attributesPanelPlugin } from '../../qti-prosemirror-item/src/components/attributes-panel-plugin';

import 'prosemirror-view/style/prosemirror.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...matchInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

// match's qti-simple-associable-choice content references the qtiMedia node
// group. We don't render real media in regression tests; stub it so the
// schema compiles.
const qtiMediaStub = {
  group: 'block qtiMedia',
  atom: true,
  selectable: true,
  parseDOM: [{ tag: 'qti-media-stub' }],
  toDOM: () => ['qti-media-stub'] as const,
};

const baseNodes = {
  ...nodes,
  paragraph: { ...nodes.paragraph, group: 'block richtext' },
  qtiMediaStub,
  ...qtiNodes,
};

export const schema = new Schema({
  nodes: {
    ...baseNodes,
    doc: {
      ...baseNodes.doc,
      attrs: {
        identifier: {},
        title: {}
      }
    }
  },
  marks
});

const editorPlugins: Plugin[] = [keymap(baseKeymap), blockSelectPlugin];

export const importItem009 = (): ProseMirrorNode =>
  importItemFromString(sourceXML, schema, {
    assetBasePath: '/qti/kennisnet',
    transforms: [roundtripMatch, roundtripItemBody]
  });

export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
  new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl)]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem009(), schema, plugins }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
};

const meta: Meta = {
  title: 'QTI ProseMirror/Roundtrip Regression',
  excludeStories: ['schema', 'importItem009', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem009: StoryObj = {
  render: () => {
    let panelEl: HTMLElement | null = null;
    return html`
      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <aside
          ${ref(el => {
            if (el) panelEl = el as HTMLElement;
          })}
        ></aside>
        <div
          class="editor-container"
          style="flex: 1 1 auto; min-width: 0;"
          ${ref(el => {
            if (el) mountEditor(el as HTMLElement, { panelEl: panelEl ?? undefined });
          })}
        ></div>
      </div>
    `;
  }
};

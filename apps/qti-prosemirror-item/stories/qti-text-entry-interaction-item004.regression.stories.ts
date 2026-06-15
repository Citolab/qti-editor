/**
 * Pure-ProseMirror QTI roundtrip regression for ITEM004 (text entry).
 *
 *   ITEM004.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripTextEntry        (hoist correct-response/score onto interactions)
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
import { roundtripTextEntry, roundtripItemBody } from '@qti-editor/qti3-item-import';
import { exportItemXml, importItemFromString } from '@qti-editor/qti-item-roundtrip';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';

import { blockSelectPlugin } from '@qti-editor/prosemirror-plugins';
import { textEntryInteractionDescriptor } from '@qti-editor/interaction-text-entry';
import '@qti-editor/interaction-text-entry/register.js';
import { attributesPanelPlugin } from '../src/attributes-panel-plugin';
import 'prosemirror-view/style/prosemirror.css';
import sourceXML from '../assets/qti/kennisnet/ITEM004.xml?raw';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...textEntryInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

const baseNodes = { ...nodes, ...qtiNodes };

/** The editor schema used for the ITEM004 roundtrip. */
export const schema = new Schema({
  nodes: {
    ...baseNodes,
    doc: {
      ...baseNodes.doc,
      // identifier/title are always supplied from the item-body on import.
      attrs: {
        identifier: {},
        title: {}
      }
    }
  },
  marks
});

/** Minimal plugin set: base keymap and block-select. */
const editorPlugins: Plugin[] = [keymap(baseKeymap), blockSelectPlugin];

/** Import ITEM004.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem004 = (): ProseMirrorNode =>
  importItemFromString(sourceXML, schema, {
    assetBasePath: '/qti/kennisnet',
    transforms: [roundtripTextEntry, roundtripItemBody]
  });

/**
 * Export a ProseMirror doc to the complete editor-origin QTI assessment item
 * (item-body wrapped with response/outcome declarations + response processing),
 * parsed as an XML `Document`. This is the editor's "save" output.
 */
export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
  new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

/** Mount the ITEM004 editor into `container`, optionally wiring the attributes panel. */
export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl)]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem004(), schema, plugins }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
};

const meta: Meta = {
  title: 'QTI ProseMirror/Roundtrip Regression',
  // These exports are the reusable import/export pipeline (consumed by the
  // regression test), not stories.
  excludeStories: ['schema', 'importItem004', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem004: StoryObj = {
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

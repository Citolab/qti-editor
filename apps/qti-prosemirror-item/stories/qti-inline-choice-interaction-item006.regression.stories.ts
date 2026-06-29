/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   ITEM006.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripInteractions    (hoist correct-response/score onto interactions)
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
import { roundtripInteractions, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import { exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';
import { inlineChoiceInteractionDescriptor } from '@citolab/prose-qti/components/inline-choice';

import '@citolab/prose-qti/components/inline-choice/register.js';
import { attributesPanelPlugin } from '../src/components/attributes-panel-plugin';
import 'prosemirror-view/style/prosemirror.css';
import sourceXML from '@qti-editor/example-items/ITEM006.xml?raw';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...inlineChoiceInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

const baseNodes = { ...nodes, paragraph: { ...nodes.paragraph, group: 'block richtext' }, ...qtiNodes };

/** The editor schema used for the ITEM006 roundtrip. */
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

/** Minimal plugin set: enter/base keymaps, the inline-choice interaction plugins, node-attrs sync and block-select. */
const editorPlugins: Plugin[] = [
  keymap({ Enter: inlineChoiceInteractionDescriptor.enterCommand }),
  keymap(baseKeymap),
  ...inlineChoiceInteractionDescriptor.pluginFactories.map(factory => factory()),
  nodeAttrsSyncPlugin,
  blockSelectPlugin
];

// Editable-attribute allowlist for the panel, sourced from the interaction's
// attribute-panel metadata (`editableAttributes`), keyed by node type. Attributes
// outside a node type's list are rendered disabled. Node types without an entry
// stay fully editable.
const EDITABLE_ATTRS = Object.fromEntries(
  Object.values(inlineChoiceInteractionDescriptor.attributePanelMetadata ?? {}).map(metadata => [
    metadata.nodeTypeName,
    metadata.editableAttributes ?? []
  ])
);

/** Import ITEM006.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem006 = (): ProseMirrorNode =>
  importItemFromString(sourceXML, schema, {
    assetBasePath: '/qti/kennisnet',
    transforms: [roundtripInteractions, roundtripItemBody]
  });

/**
 * Export a ProseMirror doc to the complete editor-origin QTI assessment item
 * (item-body wrapped with response/outcome declarations + response processing),
 * parsed as an XML `Document`. This is the editor's "save" output.
 */
export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
  new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

/** Mount the ITEM006 editor into `container`, optionally wiring the attributes panel. */
export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl, { editableAttrs: EDITABLE_ATTRS })]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem006(), schema, plugins }),
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
  excludeStories: ['schema', 'importItem006', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem006: StoryObj = {
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

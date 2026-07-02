/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   ITEM001.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripChoice          (hoist correct-response/score onto interactions)
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
import { roundtripChoice, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import { exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { constrainedHome, constrainedShiftHome, constrainedEnd, constrainedShiftEnd } from '@citolab/prose-qti/components/shared';
import sourceXML from '@qti-editor/example-items/ITEM001.xml?raw';

import '@citolab/prose-qti/components/choice/register.js';
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-choice/register.js';
import { attributesPanelPlugin } from '../../qti-prosemirror-item/src/components/attributes-panel-plugin';

import 'prosemirror-view/style/prosemirror.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...choiceInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

const baseNodes = { ...nodes, paragraph: { ...nodes.paragraph, group: 'block richtext' }, ...qtiNodes };

/** The editor schema used for the ITEM001 roundtrip. */
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

/** Minimal plugin set: enter/base keymaps, node-attrs sync (applies correct-response clicks) and block-select. */
const editorPlugins: Plugin[] = [
  keymap({
    Enter: choiceInteractionDescriptor.enterCommand,
    Home: constrainedHome,
    'Shift-Home': constrainedShiftHome,
    End: constrainedEnd,
    'Shift-End': constrainedShiftEnd,
  }),
  keymap(baseKeymap),
  nodeAttrsSyncPlugin,
  blockSelectPlugin
];

// Editable-attribute allowlist for the panel, sourced from the interaction's
// attribute-panel metadata (`editableAttributes`), keyed by node type. Attributes
// outside a node type's list (e.g. the interaction's `correctResponse`/`maxChoices`,
// or a simple choice's `identifier`) are rendered disabled. Node types without an
// entry stay fully editable.
const EDITABLE_ATTRS = Object.fromEntries(
  Object.values(choiceInteractionDescriptor.attributePanelMetadata ?? {}).map(metadata => [
    metadata.nodeTypeName,
    metadata.editableAttributes ?? []
  ])
);

/** Import ITEM001.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem001 = (): ProseMirrorNode =>
  importItemFromString(sourceXML, schema, {
    assetBasePath: '/qti/kennisnet',
    transforms: [roundtripChoice, roundtripItemBody]
  });

/**
 * Export a ProseMirror doc to the complete editor-origin QTI assessment item
 * (item-body wrapped with response/outcome declarations + response processing),
 * parsed as an XML `Document`. This is the editor's "save" output.
 */
export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
  new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

/** Mount the ITEM001 editor into `container`, optionally wiring the attributes panel. */
export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl, { editableAttrs: EDITABLE_ATTRS })]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem001(), schema, plugins }),
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
  excludeStories: ['schema', 'importItem001', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem001: StoryObj = {
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

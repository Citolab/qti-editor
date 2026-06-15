/**
 * Pure-ProseMirror QTI roundtrip regression for ITEM002 (multi-answer choice).
 *
 *   ITEM002.xml (raw import)
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
import { roundtripChoice, roundtripItemBody, reduceToItemBody } from '@qti-editor/qti3-item-import';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';
import { buildSingleAssessmentItemXml, formatXml } from '@qti-editor/core/composer';

import { qtiTransformItem } from '@qti-components/transformers';

import { pmToRoundtripXml } from '@qti-editor/interaction-shared/pm-to-roundtrip-xml';
import { roundtripXmlToPm } from '@qti-editor/interaction-shared/roundtrip-xml-to-pm';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-plugins';
import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';
import '@qti-editor/interaction-choice/register.js';
import '@qti-editor/interaction-shared/components/qti-prompt/register.js';
import '@qti-editor/interaction-shared/components/qti-simple-choice/register.js';
import { attributesPanelPlugin } from '../src/attributes-panel-plugin';
import 'prosemirror-view/style/prosemirror.css';
import sourceXML from '../assets/qti/kennisnet/ITEM002.xml?raw';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...choiceInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

const baseNodes = { ...nodes, ...qtiNodes };

/** The editor schema used for the ITEM002 roundtrip. */
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
  keymap({ Enter: choiceInteractionDescriptor.enterCommand }),
  keymap(baseKeymap),
  nodeAttrsSyncPlugin,
  blockSelectPlugin
];

// Editable-attribute allowlist for the panel, sourced from the interaction's
// attribute-panel metadata (`editableAttributes`). Attributes outside this list
// (e.g. `correctResponse` and `maxChoices`, which are set by clicking choices)
// are rendered disabled. Node types without an entry stay fully editable.
const EDITABLE_ATTRS = {
  [choiceInteractionDescriptor.nodeTypeName]:
    choiceInteractionDescriptor.attributePanelMetadata[choiceInteractionDescriptor.nodeTypeName.toLowerCase()]
      ?.editableAttributes ?? []
};

/** Import ITEM002.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem002 = (): ProseMirrorNode => {
  // After `reduceToItemBody` the document element IS the `<qti-item-body>`, so
  // the XMLDocument can be handed straight to `roundtripXmlToPm`.
  const roundtripXml = qtiTransformItem()
    .parse(sourceXML)
    .path('/qti/kennisnet')
    .fn(roundtripChoice)
    .fn(roundtripItemBody)
    .fn(reduceToItemBody)
    .xmlDoc();
  return roundtripXmlToPm(roundtripXml, schema);
};

/** Export a ProseMirror doc back to the canonical QTI item-body XML. */
const exportItemBodyXml = (doc: ProseMirrorNode): string =>
  pmToRoundtripXml(
    doc,
    {
      identifier: doc.attrs.identifier as string,
      title: doc.attrs.title as string
    },
    schema
  );

/**
 * Export a ProseMirror doc to the complete editor-origin QTI assessment item
 * (item-body wrapped with response/outcome declarations + response processing),
 * parsed as an XML `Document`. This is the editor's "save" output.
 */
export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document => {
  const itemBodyXml = exportItemBodyXml(doc);
  const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
  const xml = formatXml(
    buildSingleAssessmentItemXml({
      identifier: doc.attrs.identifier as string,
      title: doc.attrs.title as string,
      itemBody: itemBodyDoc
    })
  );
  return new DOMParser().parseFromString(xml, 'application/xml');
};

/** Mount the ITEM002 editor into `container`, optionally wiring the attributes panel. */
export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl, { editableAttrs: EDITABLE_ATTRS })]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem002(), schema, plugins }),
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
  excludeStories: ['schema', 'importItem002', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem002: StoryObj = {
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

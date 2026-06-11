/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   ITEM001.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripChoice          (hoist correct-response/score onto interactions)
 *     → DOMParser.fromSchema     (import item-body into the PM doc)
 *     → qtiItemFromProsemirror   (export PM doc back to the editor-origin item-body)
 *     → buildSingleAssessmentItemXml (compose the complete QTI item — console.log)
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { Schema, DOMParser as PMDOMParser } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes, marks } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { roundtripChoice } from '@qti-editor/qti3-item-import';
import { qtiRubricBlockDescriptor } from '@qti-editor/qti-rubric-block';
import { buildSingleAssessmentItemXml, formatXml } from '@qti-editor/core/composer';
import { expect } from 'storybook/test';

import { qtiTransformItem } from '@qti-components/transformers';

import { qtiItemFromProsemirror, prosemirrorFromQtiItem } from '../../shared/src/index';
import { blockSelectPlugin } from '../../../extensions/prosemirror/src/block-select/block-select-plugin';
import { choiceInteractionDescriptor } from './descriptor';
import './register';
import '../../shared/src/components/qti-prompt/register';
import '../../shared/src/components/qti-simple-choice/register';
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import sourceXML from '../../../../public/qti/kennisnet/ITEM001.xml?raw';
import assertedXML from '../../../../public/qti/kennisnet/ITEM001-editor.xml?raw';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [
    ...choiceInteractionDescriptor.nodeSpecs,
    ...qtiRubricBlockDescriptor.nodeSpecs,
  ].map(({ name, spec }) => [name, spec])
);

const schema = new Schema({
  nodes: { ...nodes, ...qtiNodes },
  marks
});

/** Test/runtime hook: the editor's exported QTI is attached to the `.editor-container` element. */
export interface EditorContainer extends HTMLElement {
  __exportedXml?: string;
}

const plugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap({ Enter: choiceInteractionDescriptor.enterCommand }),
  keymap(baseKeymap),
  ...choiceInteractionDescriptor.pluginFactories.map(factory => factory()),
  blockSelectPlugin
];

const meta: Meta = {
  title: 'QTI ProseMirror/Roundtrip Regression',
};
export default meta;

// Export a ProseMirror doc back to the canonical QTI item-body XML.
const exportItemBodyXml = (doc: EditorView['state']['doc']): string =>
  qtiItemFromProsemirror(
    doc,
    { identifier: 'ITEM001', title: 'ITEM001 roundtrip' },
    schema,
  );

/**
 * Export a ProseMirror doc back to the complete editor-origin QTI assessment
 * item (item-body wrapped with response/outcome declarations + response
 * processing). This is the editor's "save" output and mirrors ITEM001-editor.xml.
 */
const exportAssessmentItemXml = (doc: EditorView['state']['doc']): string => {
  const itemBodyXml = exportItemBodyXml(doc);
  const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
  return formatXml(
    buildSingleAssessmentItemXml({
      identifier: 'ITEM001',
      title: 'ITEM001 roundtrip',
      itemBody: itemBodyDoc,
    }),
  );
};

type Story = StoryObj;

export const RoundtripItem001: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    console.log('1. Loaded QTI (source)');
    const sourceDoc = new DOMParser().parseFromString(sourceXML, 'application/xml');
    console.dirxml(sourceDoc.documentElement);

    const roundtripXml = qtiTransformItem()
      .parse(sourceXML)
      .path('/qti/kennisnet')
      .fn(roundtripChoice)
      .xmlDoc();

    console.log('2. Roundtrip XML (import)');
    console.dirxml(roundtripXml.documentElement);

    const t = document.createElement("template");
    t.innerHTML = new XMLSerializer().serializeToString(roundtripXml.documentElement);
    const roundtripHTML = t.content.firstElementChild;

    const pmDoc = PMDOMParser.fromSchema(schema).parse(roundtripHTML!);
    console.groupCollapsed('3. ProseMirror doc (JSON)');
    console.log(pmDoc.toJSON());
    console.groupEnd();

    const logExport = () => {
      if (!currentView) return;

      // 1. PM doc → canonical item-body
      const itemBodyXml = exportItemBodyXml(currentView.state.doc);
      const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
      console.log('4. Canonical item-body (export)');
      console.dirxml(itemBodyDoc.documentElement);

      // 2. item-body → PM doc again (proves the roundtrip is lossless)
      const reimported = prosemirrorFromQtiItem(itemBodyXml, schema);
      console.groupCollapsed('5. Re-imported ProseMirror doc (JSON)');
      console.log(reimported.toJSON());
      console.groupEnd();

      // 3. item-body → complete QTI assessment item (composer expands
      //    response/outcome declarations + response processing)
      const fullQtiXml = exportAssessmentItemXml(currentView.state.doc);
      const fullQtiDoc = new DOMParser().parseFromString(fullQtiXml, 'application/xml');
      console.log('6. Composed QTI assessment item');
      console.dirxml(fullQtiDoc.documentElement);
    };

    const mount = (container: HTMLElement) => {
      if (currentView) currentView.destroy();
      currentView = new EditorView(container, {
        state: EditorState.create({ doc: pmDoc, schema, plugins }),
        dispatchTransaction(tr) {
          if (!currentView) return;
          currentView.updateState(currentView.state.apply(tr));
        }
      });
      // Expose the editor's exported QTI for the regression test.
      (container as EditorContainer).__exportedXml = exportAssessmentItemXml(currentView.state.doc);
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>QTI Roundtrip: load → import → edit → export</h3>
        <div style="margin-bottom: 10px;">
          <button @click=${logExport}>Export current PM doc → console</button>
        </div>
        <div
          class="editor-container"
          ${ref(el => { if (el) mount(el as HTMLElement); })}
        ></div>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    // The story exposes its exported QTI on the editor container.
    const container = canvasElement.querySelector<EditorContainer>('.editor-container');
    const exportedXml = container?.__exportedXml;

    // Exported XML must equal the imported asserted fixture.
    expect(exportedXml).toEqualXml(assertedXML);
  },
};



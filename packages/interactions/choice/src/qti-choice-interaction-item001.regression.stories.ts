/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   /qti/kennisnet/ITEM001.xml
 *     → qtiTransformItem().load  (load XML)
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

import { qtiTransformItem } from '@qti-components/transformers';

import { blockSelectPlugin } from '../../../extensions/prosemirror/src/block-select/block-select-plugin';
import { choiceInteractionDescriptor } from './descriptor';
import { qtiItemFromProsemirror, prosemirrorFromQtiItem } from '../../shared/src/index';

// import './components/qti-choice-interaction/qti-choice-interaction';
import './register';
import '../../shared/src/components/qti-prompt/register';
import '../../shared/src/components/qti-simple-choice/register';

// import '@qti-components/theme/item.css'
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';

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

// Single source of truth for the non-QTI → data-* mirror contract.
const interactionMetadata = [choiceInteractionDescriptor.composerMetadata];

type Story = StoryObj;

interface RoundtripLoaded {
  sourceDoc: XMLDocument;
}

export const RoundtripItem001: Story = {
  render: (_args, { loaded }) => {
    const { sourceDoc } = loaded as RoundtripLoaded;
    let currentView: EditorView | null = null;

    console.log('1. Loaded QTI (source)');
    console.dirxml(sourceDoc.documentElement);

    const sourceXml = new XMLSerializer().serializeToString(sourceDoc);
    const roundtripXml = qtiTransformItem()
      .parse(sourceXml)
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

      // 1. PM doc → editor-origin item-body (data-* mirrors + markers)
      const itemBodyXml = qtiItemFromProsemirror(
        currentView.state.doc,
        { identifier: 'ITEM001', title: 'ITEM001 roundtrip' },
        schema,
        interactionMetadata,
      );
      const itemBodyDoc = new DOMParser().parseFromString(itemBodyXml, 'application/xml');
      console.log('4. Editor-origin item-body (export)');
      console.dirxml(itemBodyDoc.documentElement);

      // 2. item-body → PM doc again (proves the roundtrip is lossless)
      const reimported = prosemirrorFromQtiItem(itemBodyXml, schema, interactionMetadata);
      console.groupCollapsed('5. Re-imported ProseMirror doc (JSON)');
      console.log(reimported.toJSON());
      console.groupEnd();

      // 3. item-body → complete QTI assessment item (composer expands
      //    response/outcome declarations + response processing)
      const fullQtiXml = formatXml(
        buildSingleAssessmentItemXml({
          identifier: 'ITEM001',
          title: 'ITEM001 roundtrip',
          itemBody: itemBodyDoc,
        }),
      );
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
  loaders: [
    async (): Promise<RoundtripLoaded> => {
      const loaded = (await qtiTransformItem().load('/qti/kennisnet/ITEM001.xml', { shuffle: false })).path('/qti/kennisnet');
      return { sourceDoc: loaded.xmlDoc() };
    },
  ],
};



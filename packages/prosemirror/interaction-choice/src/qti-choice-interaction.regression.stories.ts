/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   /qti/kennisnet/ITEM001.xml
 *     → qtiTransformItem().load  (load XML)
 *     → roundtripQtiItem         (hoist correct-response/score onto interactions)
 *     → DOMParser.fromSchema     (import item-body into the PM doc)
 *     → qtiItemFromProsemirror   (export PM doc back to QTI XML — console.log)
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { Schema, DOMParser } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes, marks } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { roundtripChoice, roundtripQtiItem } from '@qti-editor/qti3-item-import';
import { qtiItemFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-item';

import { qtiTransformItem } from '@qti-components/transformers';

import { blockSelectPlugin } from '../../extensions/src/block-select/block-select-plugin';
import { choiceInteractionDescriptor } from './descriptor';

import './components/qti-choice-interaction/qti-choice-interaction';
import '../../interaction-shared/src/components/qti-prompt/qti-prompt';
import '../../interaction-shared/src/components/qti-simple-choice/qti-simple-choice';

import '@qti-components/theme/item.css'
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  choiceInteractionDescriptor.nodeSpecs.map(({ name, spec }) => [name, spec])
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

type Story = StoryObj;

export const RoundtripItem001: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const init = async (container: HTMLElement) => {
      const loaded = (await qtiTransformItem().load('/qti/kennisnet/ITEM001.xml')).path('/qti/kennisnet');
      const sourceXml = loaded.xml();

      const roundtripXml = qtiTransformItem()
          .parse(sourceXml)
          .fn(roundtripChoice)
          .xml();
      
      // roundtripQtiItem(sourceXml);

      const itemDoc = new window.DOMParser().parseFromString(roundtripXml, 'application/xml');
      const body = itemDoc.querySelector('qti-item-body');
      const tempEl = document.createElement('div');
      tempEl.innerHTML = body ? body.innerHTML : roundtripXml;
      const pmDoc = DOMParser.fromSchema(schema).parse(tempEl);

      if (currentView) currentView.destroy();
      currentView = new EditorView(container, {
        state: EditorState.create({ doc: pmDoc, schema, plugins }),
        dispatchTransaction(tr) {
          if (!currentView) return;
          currentView.updateState(currentView.state.apply(tr));
        }
      });

      logExport();
    };

    const logExport = () => {
      if (!currentView) return;
      const xml = qtiItemFromProsemirror(
        currentView.state.doc,
        { identifier: 'ITEM001', title: 'ITEM001 roundtrip' },
      );
      console.log('[Roundtrip Export]\n' + xml);
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>QTI Roundtrip: load → import → edit → export</h3>
        <div style="margin-bottom: 10px;">
          <button @click=${logExport}>Export current PM doc → console</button>
        </div>
        <div
          class="editor-container"
          ${ref(el => {
            if (el) init(el as HTMLElement);
          })}
        ></div>
        <p style="color: #666; font-size: 0.9rem;">
          Loads <code>/qti/kennisnet/ITEM001.xml</code>, runs
          <code>roundtripQtiItem</code>, imports into ProseMirror, then exports the PM doc
          back to QTI XML. See the browser console.
        </p>
      </div>
    `;
  }
};

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { DOMParser, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec,
} from '@qti-editor/interactions-qti-select-point';
import { qtiPromptNodeSpec, qtiPromptParagraphNodeSpec } from '@qti-editor/interactions-shared';

import '@qti-editor/interactions-qti-select-point';
import '@qti-editor/interactions-shared';

import { createBasePlugins } from './plugins/base.plugins.js';
import { baseMarks, baseNodes } from './schema/base.schema.js';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const schema = new Schema({
  nodes: {
    ...baseNodes,
    qtiPromptParagraph: qtiPromptParagraphNodeSpec,
    qtiPrompt: qtiPromptNodeSpec,
    imgSelectPoint: imgSelectPointNodeSpec,
    qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec,
  },
  marks: baseMarks,
});

const plugins = createBasePlugins(schema);

const meta: Meta = {
  title: 'QTI ProseMirror/Select Point Interaction Editor',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const BasicEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `
      <h1>QTI Select Point Interaction Example</h1>
      <p>Use the button to insert a select-point interaction block.</p>
      <qti-select-point-interaction
        response-identifier="RESPONSE_1"
        max-choices="0"
        min-choices="0"
        area-mappings='[{"id":"A1","shape":"circle","coords":"120,90,30","mappedValue":1,"defaultValue":0}]'
      >
        <qti-prompt><p>Mark Edinburgh on this map of the United Kingdom.</p></qti-prompt>
        <img alt="Map of the UK" width="196" height="280" />
      </qti-select-point-interaction>
    `;

    const initEditor = (container: HTMLElement) => {
      if (currentView) currentView.destroy();
      const tempEl = document.createElement('div');
      tempEl.innerHTML = initialContent;
      const doc = DOMParser.fromSchema(schema).parse(tempEl);

      currentView = new EditorView(container, {
        state: EditorState.create({ doc, schema, plugins }),
        dispatchTransaction(tr) {
          if (!currentView) return;
          currentView.updateState(currentView.state.apply(tr));
        },
      });
    };

    const handleInsert = () => {
      if (!currentView) return;
      insertSelectPointInteraction(currentView.state, currentView.dispatch);
      currentView.focus();
    };

    return html`
      <div style="max-width: 900px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>Select Point Interaction Editor</h3>
        <div style="margin-bottom: 10px;">
          <button @click=${handleInsert} style="padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Insert Select Point Interaction
          </button>
        </div>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

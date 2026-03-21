import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { DOMParser, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import { qtiTextEntryInteractionNodeSpec } from '@qti-editor/interaction-text-entry';
import '@qti-editor/interaction-text-entry';

import { createBasePlugins } from './plugins/base.plugins.js';
import { baseMarks, baseNodes } from './schema/base.schema.js';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const schema = new Schema({
  nodes: {
    ...baseNodes,
    qtiTextEntryInteraction: qtiTextEntryInteractionNodeSpec,
  },
  marks: baseMarks,
});

const plugins = [...createBasePlugins(schema)];

const meta: Meta = {
  title: 'QTI ProseMirror/Text Entry Interaction Editor',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const BasicEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `
      <h1>QTI Text Entry Interaction Example</h1>
      <p>Fill in the blank: The capital of France is <qti-text-entry-interaction response-identifier="RESPONSE_1"></qti-text-entry-interaction>.</p>
      <p>Press <strong>Cmd/Ctrl + Shift + T</strong> to insert a new text entry field.</p>
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

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>Text Entry Interaction Editor</h3>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

export const MultipleBlanks: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `
      <p>Complete the sentence:</p>
      <p>The <qti-text-entry-interaction response-identifier="RESPONSE_1"></qti-text-entry-interaction> brown <qti-text-entry-interaction response-identifier="RESPONSE_2"></qti-text-entry-interaction> jumps over the lazy <qti-text-entry-interaction response-identifier="RESPONSE_3"></qti-text-entry-interaction>.</p>
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

    return html`
      <div style="max-width: 850px; margin: 40px auto;">
        <h3>Multiple Text Entry Fields</h3>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

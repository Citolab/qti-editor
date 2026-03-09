import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { DOMParser, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import {
  insertInlineChoiceInteraction,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
} from '@qti-editor/interactions-qti-inline-choice';

import '@qti-editor/interactions-qti-inline-choice';

import { createBasePlugins } from './plugins/base.plugins.js';
import { baseMarks, baseNodes } from './schema/base.schema.js';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const schema = new Schema({
  nodes: {
    ...baseNodes,
    qtiInlineChoiceInteraction: qtiInlineChoiceInteractionNodeSpec,
    qtiInlineChoice: qtiInlineChoiceNodeSpec,
  },
  marks: baseMarks,
});

const plugins = createBasePlugins(schema);

const meta: Meta = {
  title: 'QTI ProseMirror/Inline Choice Interaction Editor',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const BasicEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `<h1>QTI Inline Choice Interaction Example</h1><p>Use Enter inside a choice to split/create another choice node.</p><qti-inline-choice-interaction response-identifier="RESPONSE" shuffle="false"><qti-inline-choice identifier="G">Gloucester</qti-inline-choice><qti-inline-choice identifier="L">Lancaster</qti-inline-choice><qti-inline-choice identifier="Y">York</qti-inline-choice></qti-inline-choice-interaction>`;

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

    const handleInsertInlineChoice = () => {
      if (!currentView) return;
      insertInlineChoiceInteraction(currentView.state, currentView.dispatch);
      currentView.focus();
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>Inline Choice Interaction Editor</h3>
        <div style="margin-bottom: 10px;">
          <button @click=${handleInsertInlineChoice} style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Insert Inline Choice Interaction
          </button>
        </div>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { DOMParser, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import {
  insertChoiceInteraction,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interactions-qti-choice';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-shared';

import '@qti-editor/interactions-qti-choice';
import '@qti-editor/interactions-shared';

import { createBasePlugins } from './plugins/base.plugins.js';
import { baseMarks, baseNodes } from './schema/base.schema.js';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const schema = new Schema({
  nodes: {
    ...baseNodes,
    qtiChoiceInteraction: qtiChoiceInteractionNodeSpec,
    qtiPromptParagraph: qtiPromptParagraphNodeSpec,
    qtiPrompt: qtiPromptNodeSpec,
    qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec,
    qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
  },
  marks: baseMarks,
});

const plugins = createBasePlugins(schema);

const meta: Meta = {
  title: 'QTI ProseMirror/Choice Interaction Editor',
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj;

export const BasicEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;
    const initialContent = `
      <h1>QTI Choice Interaction Example</h1>
      <p>Click the button below to insert a choice interaction.</p>
      <p>Position your cursor and click "Insert Choice Interaction".</p>
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

    const handleInsertChoice = () => {
      if (!currentView) return;
      insertChoiceInteraction(currentView.state, currentView.dispatch);
      currentView.focus();
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>Interactive QTI Editor</h3>
        <div style="margin-bottom: 10px;">
          <button @click=${handleInsertChoice} style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Insert Choice Interaction
          </button>
        </div>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

export const MultipleChoiceEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;
    const initialContent = `
      <qti-choice-interaction max-choices="0">
        <qti-prompt><p>Select all that apply:</p></qti-prompt>
        <qti-simple-choice identifier="A"><p>First option</p></qti-simple-choice>
        <qti-simple-choice identifier="B"><p>Second option</p></qti-simple-choice>
        <qti-simple-choice identifier="C"><p>Third option</p></qti-simple-choice>
      </qti-choice-interaction>
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
        <h3>Multiple Choice (checkboxes)</h3>
        <div class="editor-container" ${ref(el => el && initEditor(el as HTMLElement))}></div>
      </div>
    `;
  },
};

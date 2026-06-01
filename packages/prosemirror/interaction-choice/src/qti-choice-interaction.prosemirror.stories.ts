/**
 * Example: Setting up a ProseMirror editor with QTI Choice Interaction components
 *
 * This story demonstrates how to:
 * 1. Import the QTI custom elements and their ProseMirror schemas
 * 2. Compose a ProseMirror schema from base nodes and QTI node specs
 * 3. Set up plugins with base functionality
 * 4. Create an EditorView with the schema
 *
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

import { blockSelectPlugin } from '../../extensions/src/block-select/block-select-plugin';
import { choiceInteractionDescriptor } from './descriptor';
import {
  canConvertFlatListToChoiceInteraction,
  convertFlatListToChoiceInteraction
} from './components/qti-choice-interaction/commands/convert-selection-to-choice.commands';

// Import and register the custom elements (side effect)
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

// Enter binding must precede baseKeymap
const plugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap({ Enter: choiceInteractionDescriptor.enterCommand }),
  keymap({ [choiceInteractionDescriptor.keyboardShortcut]: choiceInteractionDescriptor.insertCommand }),
  keymap(baseKeymap),
  ...choiceInteractionDescriptor.pluginFactories.map(factory => factory()),
  blockSelectPlugin
];

const meta: Meta = {
  title: 'QTI ProseMirror/Choice Interaction Editor',
  tags: ['autodocs']
};
export default meta;

type Story = StoryObj;

export const BasicEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `
      <h1>QTI Choice Interaction Example</h1>
      <p>Use the buttons below to insert a choice interaction, or select the list below and convert it.</p>
      <ul>
        <li>Mercury</li>
        <li>Venus</li>
        <li>Earth</li>
      </ul>
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
          const newState = currentView.state.apply(tr);
          currentView.updateState(newState);
        }
      });
    };

    const handleInsertChoice = () => {
      if (currentView) {
        choiceInteractionDescriptor.insertCommand(currentView.state, currentView.dispatch);
        currentView.focus();
      }
    };

    const handleConvertSelection = () => {
      if (currentView) {
        convertFlatListToChoiceInteraction(currentView);
        currentView.focus();
      }
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <h3>Interactive QTI Editor</h3>
        <div style="margin-bottom: 10px;">
          <button
            @click=${handleInsertChoice}
          >
            Insert Choice Interaction
          </button>
          <button
            @click=${handleConvertSelection}
            ?disabled=${!currentView || !canConvertFlatListToChoiceInteraction(currentView)}
          >
            Convert Selection to Choices
          </button>
        </div>
        <div
          class="editor-container"
          ${ref(el => {
            if (el) initEditor(el as HTMLElement);
          })}
        ></div>
        <p style="color: #666; font-size: 0.9rem;">
          Click inside to position cursor, then use the button or press <strong>Cmd/Ctrl + Shift + C</strong> to insert
          a choice interaction.
        </p>
      </div>
    `;
  }
};

export const MultipleChoiceEditor: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const initialContent = `
      <qti-choice-interaction max-choices="0">
        <qti-prompt>
          <p>Select all that apply:</p>
        </qti-prompt>
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
        }
      });
    };

    return html`
      <div style="max-width: 850px; margin: 40px auto;">
        <h3>Multiple Choice (checkboxes)</h3>
        <div
          class="editor-container"
          ${ref(el => {
            if (el) initEditor(el as HTMLElement);
          })}
        ></div>
      </div>
    `;
  }
};

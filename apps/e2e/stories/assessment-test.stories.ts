/**
 * Assessment test roundtrip story.
 *
 *   /prosemirror/checkmate/assessment-test.json  (ProseMirror doc JSON)
 *     → schema.nodeFromJSON                      (load PM doc)
 *     → EditorView                               (render editor)
 *     → qtiTestFromProsemirror                   (export as QTI test XML — console.log)
 */

import '@qti-components/theme/item.css';
import '@qti-editor/interactions/choice';
import '@qti-editor/interactions/extended-text';
import '@qti-editor/interactions/select-point';
import '@qti-editor/interactions/shared';
import '@qti-editor/qti-item-divider/define';
import 'prosemirror-view/style/prosemirror.css';

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { EditorState, type Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { expect, waitFor } from 'storybook/test';

import { qtiTestFromProsemirror } from '@qti-editor/prosekit-integration/save-qti-test';

import { schema, plugins } from '../src/pm-setup.js';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'QTI E2E/Assessment Test',
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj;

export const Test: Story = {
  render: () => {
    let currentView: EditorView | null = null;

    const init = async (container: HTMLElement) => {
      const response = await fetch('/prosemirror/checkmate/assessment-test.json');
      const json = await response.json();
      const pmDoc = schema.nodeFromJSON(json);

      if (currentView) currentView.destroy();
      currentView = new EditorView(container, {
        state: EditorState.create({ doc: pmDoc, schema, plugins }),
        dispatchTransaction(tr: Transaction) {
          if (!currentView) return;
          currentView.updateState(currentView.state.apply(tr));
        },
      });

      container.dataset.loaded = 'true';
    };

    const logExport = () => {
      if (!currentView) return;
      const xml = qtiTestFromProsemirror(currentView.state.doc, {
        identifier: 'checkmate-test',
        title: 'Checkmate Assessment Test',
      });
      console.log('[Assessment Test Export]\n' + xml);
    };

    return html`
      <div style="max-width: 900px; margin: 40px auto; padding: 0 20px; font-family: system-ui;">
        <div style="margin-bottom: 12px;">
          <button @click=${logExport}>Export QTI test XML → console</button>
        </div>
        <div
          class="editor-container"
          style="border: 1px solid #dbe4f0; border-radius: 8px; background: #fff;"
          ${ref(el => {
            if (el) init(el as HTMLElement);
          })}
        ></div>
      </div>
    `;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const editor = canvasElement.querySelector<HTMLElement>('.editor-container');
    expect(editor).not.toBeNull();

    await waitFor(() => {
      expect(editor?.dataset.loaded).toBe('true');
    });

    expect(editor?.querySelector('.ProseMirror')).not.toBeNull();
    expect(editor?.querySelectorAll('qti-choice-interaction').length).toBe(6);
    expect(editor?.querySelectorAll('qti-extended-text-interaction').length).toBe(10);
    expect(editor?.querySelectorAll('qti-item-divider').length).toBe(15);
  },
};

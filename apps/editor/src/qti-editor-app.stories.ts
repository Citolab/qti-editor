
import { html } from 'lit';

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { QtiEditorApp } from './qti-editor-app';

type Story = StoryObj<QtiEditorApp>;

const meta: Meta<QtiEditorApp> = {
  component: 'qti-editor-app',
  tags: ['autodocs']
};
export default meta;

export const Test: Story = {
  render: () => {
    return html`
      <main class="container mx-auto max-w-4xl">
        <qti-editor-app data-testid="interaction"></qti-editor-app>
      </main>
    `;
  }
};

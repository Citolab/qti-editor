import './qti-coco-editor.js';

import { html } from 'lit';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

type Story = StoryObj;

const meta: Meta = {
  title: 'QTI COCO/QtiCocoEditor',
  tags: ['autodocs'],
  component: 'qti-coco-editor',
};

export default meta;

export const Default: Story = {
  render: () => html`
    <main class="container mx-auto max-w-6xl px-6 py-6">
      <qti-coco-editor title="COCO Demo Item" identifier="coco-demo-item"></qti-coco-editor>
    </main>
  `,
};

export const WithInitialContent: Story = {
  render: () => html`
    <main class="container mx-auto max-w-6xl px-6 py-6">
      <qti-coco-editor
        title="COCO Prefilled Item"
        identifier="coco-prefilled-item"
        .value=${`
          <p>This is the COCO editor story demo.</p>
          <p>Use the toolbar to insert interactions and edit this content.</p>
        `}
      ></qti-coco-editor>
    </main>
  `,
};

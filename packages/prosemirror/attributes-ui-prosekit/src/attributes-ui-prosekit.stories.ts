import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

import '@qti-editor/prosemirror-attributes-ui-prosekit';

import type {
  AttributesEventDetail,
  AttributesMetadataResolver,
} from '@qti-editor/prosemirror-attributes-ui-prosekit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'ProseKit/Attributes UI',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Richer ProseKit-oriented attributes UI built on the same generic engine. This is the intended base for more guided attribute panels with curated choices.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

function dispatchInitialDetail(target: EventTarget, detail: AttributesEventDetail) {
  requestAnimationFrame(() => {
    target.dispatchEvent(new CustomEvent<AttributesEventDetail>('pm:attributes:update', { detail }));
  });
}

const interactionMetadataResolver: AttributesMetadataResolver = nodeType => {
  if (nodeType !== 'qtiChoiceInteraction') return null;

  return {
    editableAttributes: ['response-identifier', 'max-choices', 'shuffle', 'orientation-class'],
    fields: {
      'response-identifier': { label: 'Response Identifier' },
      'max-choices': { label: 'Max Choices', input: 'number' },
      shuffle: { label: 'Shuffle Choices', input: 'checkbox' },
      'orientation-class': {
        label: 'Orientation',
        input: 'select',
        options: [
          { value: 'qti-orientation-vertical', label: 'Vertical' },
          { value: 'qti-orientation-horizontal', label: 'Horizontal' },
        ],
      },
      'internal-id': { label: 'Internal ID', readOnly: true },
    },
  };
};

export const GuidedInteractionPanel: Story = {
  render: () => {
    const eventTarget = new EventTarget();
    let initialized = false;

    const detail: AttributesEventDetail = {
      open: true,
      activeNode: {
        type: 'qtiChoiceInteraction',
        pos: 5,
        attrs: {
          'response-identifier': 'RESPONSE',
          'max-choices': 1,
          shuffle: true,
          'orientation-class': 'qti-orientation-vertical',
          'internal-id': 'choice-001',
        },
      },
      nodes: [
        {
          type: 'qtiChoiceInteraction',
          pos: 5,
          attrs: {
            'response-identifier': 'RESPONSE',
            'max-choices': 1,
            shuffle: true,
            'orientation-class': 'qti-orientation-vertical',
            'internal-id': 'choice-001',
          },
        },
        {
          type: 'qtiPrompt',
          pos: 6,
          attrs: {
            slot: 'prompt',
          },
        },
      ],
    };

    return html`
      <div style="max-width: 420px; margin: 40px auto;">
        <prosekit-attributes-panel
          ${ref(el => {
            if (!el || initialized) return;
            initialized = true;
            el.eventTarget = eventTarget;
            el.metadataResolver = interactionMetadataResolver;
            dispatchInitialDetail(eventTarget, detail);
          })}
        ></prosekit-attributes-panel>
      </div>
    `;
  },
};

export const EmptyState: Story = {
  render: () => html`
    <div style="max-width: 420px; margin: 40px auto;">
      <prosekit-attributes-panel></prosekit-attributes-panel>
    </div>
  `,
};

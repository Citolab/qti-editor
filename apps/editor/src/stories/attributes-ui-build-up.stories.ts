import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

import '@qti-editor/prosemirror-attributes-ui-prosekit';
import '@qti-editor/ui/components/blocks/attributes-panel';

import type {
  AttributesEventDetail as ProsekitAttributesEventDetail,
  AttributesMetadataResolver as ProsekitAttributesMetadataResolver,
  ProsekitAttributesPanel,
} from '@qti-editor/prosemirror-attributes-ui-prosekit';
import type { QtiAttributesPanel } from '@qti-editor/ui/components/blocks/attributes-panel';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/Attributes UI Build-Up',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shows the intended progression from the ProseKit-oriented attributes panel to the QTI-specific wrapper.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

const prosekitMetadataResolver: ProsekitAttributesMetadataResolver = nodeType => {
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

function dispatchUpdate<T>(target: EventTarget, eventName: string, detail: T) {
  requestAnimationFrame(() => {
    target.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
  });
}

export const Progression: Story = {
  render: () => {
    const prosekitTarget = new EventTarget();
    const qtiTarget = new EventTarget();
    let prosekitReady = false;
    let qtiReady = false;

    const prosekitDetail: ProsekitAttributesEventDetail = {
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
      <div style="padding: 32px;">
        <div style="max-width: 960px; margin: 0 auto 24px; display: grid; gap: 8px;">
          <h2 style="margin: 0; font-size: 1.5rem;">Attributes UI Build-Up</h2>
          <p style="margin: 0; color: #6b7280;">
            Start with the ProseKit-oriented panel for guided attribute editing, then add QTI-specific metadata policy in the wrapper layer.
          </p>
        </div>

        <div style="display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: start;">
          <section style="display: grid; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 4px;">1. ProseKit-Oriented UI</h3>
              <p style="margin: 0; color: #6b7280;">Same engine, but with a richer panel shell and curated choices.</p>
            </div>
            <prosekit-attributes-panel
              ${ref(el => {
                if (!el || prosekitReady) return;
                prosekitReady = true;
                const panel = el as ProsekitAttributesPanel;
                panel.eventTarget = prosekitTarget;
                panel.metadataResolver = prosekitMetadataResolver;
                dispatchUpdate(prosekitTarget, 'pm:attributes:update', prosekitDetail);
              })}
            ></prosekit-attributes-panel>
          </section>

          <section style="display: grid; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 4px;">2. QTI Wrapper</h3>
              <p style="margin: 0; color: #6b7280;">Registry/app wrapper adds QTI editability rules without owning the engine.</p>
            </div>
            <qti-attributes-panel
              ${ref(el => {
                if (!el || qtiReady) return;
                qtiReady = true;
                const panel = el as QtiAttributesPanel;
                panel.eventTarget = qtiTarget;
                dispatchUpdate(qtiTarget, 'qti:attributes:update', prosekitDetail);
              })}
            ></qti-attributes-panel>
          </section>
        </div>
      </div>
    `;
  },
};

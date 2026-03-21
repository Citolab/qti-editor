import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

import '@qti-editor/prosemirror-attributes-ui';
import '@qti-editor/prosemirror-attributes-ui-prosekit';
import '../components/registry/editor/attributes/qti-attributes-panel.js';

import type {
  AttributesEventDetail as GenericAttributesEventDetail,
  AttributesMetadataResolver as GenericAttributesMetadataResolver,
  PmAttributesPanel,
} from '@qti-editor/prosemirror-attributes-ui';
import type {
  AttributesEventDetail as ProsekitAttributesEventDetail,
  AttributesMetadataResolver as ProsekitAttributesMetadataResolver,
  ProsekitAttributesPanel,
} from '@qti-editor/prosemirror-attributes-ui-prosekit';
import type { QtiAttributesPanel } from '../components/registry/editor/attributes/qti-attributes-panel.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/Attributes UI Build-Up',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shows the intended progression from the minimal generic attributes panel to the richer ProseKit-oriented panel and finally the QTI-specific registry wrapper.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

const genericMetadataResolver: GenericAttributesMetadataResolver = nodeType => {
  if (nodeType !== 'paragraph') return null;

  return {
    editableAttributes: ['data-label', 'data-points', 'data-required', 'data-size'],
    fields: {
      'data-label': { label: 'Label' },
      'data-points': { label: 'Points', input: 'number' },
      'data-required': { label: 'Required', input: 'checkbox' },
      'data-size': {
        label: 'Size',
        input: 'select',
        options: [
          { value: 's', label: 'Small' },
          { value: 'm', label: 'Medium' },
          { value: 'l', label: 'Large' },
        ],
      },
      'data-internal-id': { label: 'Internal ID', readOnly: true },
    },
  };
};

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
    const genericTarget = new EventTarget();
    const prosekitTarget = new EventTarget();
    const qtiTarget = new EventTarget();
    let genericReady = false;
    let prosekitReady = false;
    let qtiReady = false;

    const genericDetail: GenericAttributesEventDetail = {
      open: true,
      activeNode: {
        type: 'paragraph',
        pos: 8,
        attrs: {
          'data-label': 'Stem paragraph',
          'data-points': 2,
          'data-required': true,
          'data-size': 'm',
          'data-internal-id': 'PARA-01',
        },
      },
      nodes: [
        {
          type: 'paragraph',
          pos: 8,
          attrs: {
            'data-label': 'Stem paragraph',
            'data-points': 2,
            'data-required': true,
            'data-size': 'm',
            'data-internal-id': 'PARA-01',
          },
        },
      ],
    };

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
            Start with the generic field editor, opt into the richer ProseKit-oriented package when you want a more guided UI, and keep QTI metadata policy in the wrapper layer.
          </p>
        </div>

        <div style="display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); align-items: start;">
          <section style="display: grid; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 4px;">1. Generic ProseMirror</h3>
              <p style="margin: 0; color: #6b7280;">Minimal field editor driven only by the attributes event contract.</p>
            </div>
            <pm-attributes-panel
              ${ref(el => {
                if (!el || genericReady) return;
                genericReady = true;
                const panel = el as PmAttributesPanel;
                panel.eventTarget = genericTarget;
                panel.metadataResolver = genericMetadataResolver;
                dispatchUpdate(genericTarget, 'pm:attributes:update', genericDetail);
              })}
            ></pm-attributes-panel>
          </section>

          <section style="display: grid; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 4px;">2. ProseKit-Oriented UI</h3>
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
              <h3 style="margin: 0 0 4px;">3. QTI Wrapper</h3>
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

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';

import '@qti-editor/prosemirror-attributes-ui';

import type {
  AttributesEventDetail,
  AttributesMetadataResolver,
} from '@qti-editor/prosemirror-attributes-ui';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'ProseMirror/Attributes UI',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Minimal field-based attributes editor for raw ProseMirror consumers. This variant stays generic and relies only on the attributes engine event contract.',
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

const metadataResolver: AttributesMetadataResolver = nodeType => {
  if (nodeType !== 'paragraph') return null;

  return {
    editableAttributes: ['data-cy', 'data-score', 'data-required', 'data-size'],
    fields: {
      'data-cy': { label: 'Data Key' },
      'data-score': { label: 'Score', input: 'number' },
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
      'data-system-id': { label: 'System ID', readOnly: true },
    },
  };
};

export const BasicPanel: Story = {
  render: () => {
    const eventTarget = new EventTarget();
    let initialized = false;

    const detail: AttributesEventDetail = {
      open: true,
      activeNode: {
        type: 'paragraph',
        pos: 8,
        attrs: {
          'data-cy': 'paragraph-1',
          'data-score': 3,
          'data-required': true,
          'data-size': 'm',
          'data-system-id': 'SYS-001',
        },
      },
      nodes: [
        {
          type: 'paragraph',
          pos: 8,
          attrs: {
            'data-cy': 'paragraph-1',
            'data-score': 3,
            'data-required': true,
            'data-size': 'm',
            'data-system-id': 'SYS-001',
          },
        },
      ],
    };

    return html`
      <div style="max-width: 420px; margin: 40px auto;">
        <pm-attributes-panel
          ${ref(el => {
            if (!el || initialized) return;
            initialized = true;
            el.eventTarget = eventTarget;
            el.metadataResolver = metadataResolver;
            dispatchInitialDetail(eventTarget, detail);
          })}
        ></pm-attributes-panel>
      </div>
    `;
  },
};

export const NodeStack: Story = {
  render: () => {
    const eventTarget = new EventTarget();
    let initialized = false;

    const detail: AttributesEventDetail = {
      open: true,
      activeNode: {
        type: 'paragraph',
        pos: 14,
        attrs: {
          'data-cy': 'paragraph-2',
          'data-score': 1,
          'data-required': false,
          'data-size': 's',
          'data-system-id': 'SYS-002',
        },
      },
      nodes: [
        {
          type: 'paragraph',
          pos: 14,
          attrs: {
            'data-cy': 'paragraph-2',
            'data-score': 1,
            'data-required': false,
            'data-size': 's',
            'data-system-id': 'SYS-002',
          },
        },
        {
          type: 'section',
          pos: 3,
          attrs: {
            identifier: 'SEC_A',
          },
        },
      ],
    };

    return html`
      <div style="max-width: 420px; margin: 40px auto;">
        <pm-attributes-panel
          ${ref(el => {
            if (!el || initialized) return;
            initialized = true;
            el.eventTarget = eventTarget;
            el.metadataResolver = metadataResolver;
            dispatchInitialDetail(eventTarget, detail);
          })}
        ></pm-attributes-panel>
      </div>
    `;
  },
};

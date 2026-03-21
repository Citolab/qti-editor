import { html, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '../components/registry/editor/attributes/qti-attributes-panel.js';

import type { ChoiceInteractionPanelPresentation } from '../components/registry/editor/attributes/qti-attributes-panel.js';
import type { QtiAttributesPanel } from '../components/registry/editor/attributes/qti-attributes-panel.js';

const eventName = 'qti:attributes:update';

function dispatchChoiceInteractionSelection(panel: QtiAttributesPanel | null) {
  if (!panel) return;

  panel.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        nodes: [
          {
            type: 'qtiChoiceInteraction',
            pos: 12,
            attrs: {
              maxChoices: 2,
              class: 'qti-labels-suffix-period qti-orientation-vertical qti-choices-stacking-3',
              correctResponse: 'Choice A',
            },
          },
        ],
        activeNode: {
          type: 'qtiChoiceInteraction',
          pos: 12,
          attrs: {
            maxChoices: 2,
            class: 'qti-labels-suffix-period qti-orientation-vertical qti-choices-stacking-3',
            correctResponse: 'Choice A',
          },
        },
        open: true,
      },
      bubbles: true,
      composed: true,
    }),
  );
}

function renderPanel(choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null = null) {
  return html`
    <div class="max-w-xl p-6">
      <qti-attributes-panel
        ${ref((element: Element | undefined) => {
          if (!(element instanceof HTMLElement)) return nothing;
          const panel = element as QtiAttributesPanel;
          panel.choiceInteractionPresentation = choiceInteractionPresentation;
          queueMicrotask(() => dispatchChoiceInteractionSelection(panel));
          return nothing;
        })}
      ></qti-attributes-panel>
    </div>
  `;
}

const meta: Meta = {
  title: 'Registry/QTI Choice Attributes Panel',
  component: 'qti-attributes-panel',
  render: () => renderPanel(),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomPresentation: Story = {
  render: () =>
    renderPanel({
      groups: {
        labelsSuffix: {
          title: 'Marker ending',
          tooltip: 'Pick the punctuation shown after the label.',
        },
        choicesStacking: {
          title: 'Columns',
        },
      },
      options: {
        'qti-orientation-horizontal': {
          label: 'Row',
          icon: '↔',
          tooltip: 'Lay choices out in a single row when space allows.',
        },
        'qti-orientation-vertical': {
          label: 'Column',
          icon: '↕',
        },
        'qti-choices-stacking-3': {
          label: 'Three',
          icon: '3',
        },
      },
    }),
};

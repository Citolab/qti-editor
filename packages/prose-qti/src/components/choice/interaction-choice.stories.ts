import '@qti-components/theme/item.css';
import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';

import '../choice';
import '../../components/register';

export default {
  title: 'Interactions/Choice',
  parameters: {
    layout: 'fullscreen',
  },
};

const renderFixture = (content: unknown, note: string) => html`
  <style>
    .fixture-shell { min-height: 100vh; padding: 32px; background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); box-sizing: border-box; }
    .fixture-card { max-width: 960px; margin: 0 auto; padding: 28px; border: 1px solid #dbe4f0; border-radius: 20px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
    .fixture-note { margin-top: 16px; color: #475569; font: 500 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; text-transform: uppercase; }
  </style>
  <div class="fixture-shell"><div class="fixture-card">${content}<div class="fixture-note">${note}</div></div></div>
`;

export const AuthoringFixture = {
  render: () => renderFixture(html`
    <qti-choice-interaction
      response-identifier="RESPONSE_CHOICE"
      max-choices="1"
      correct-response="choice-b"
      score="2"
    >
      <qti-prompt>Which statement matches the current editor contract?</qti-prompt>
      <qti-simple-choice identifier="choice-a">Descriptors are optional documentation.</qti-simple-choice>
      <qti-simple-choice identifier="choice-b">Descriptors define the interaction source of truth.</qti-simple-choice>
      <qti-simple-choice identifier="choice-c">Apps own the canonical interaction schema.</qti-simple-choice>
    </qti-choice-interaction>
  `, 'single-select fixture with prompt and correct response'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector<HTMLElement>('qti-choice-interaction');
    expect(interaction).not.toBeNull();

    await waitFor(() => {
      expect(interaction?.shadowRoot).not.toBeNull();
    });

    const choices = interaction!.querySelectorAll<HTMLElement & { selected?: boolean }>('qti-simple-choice');

    expect(choices).toHaveLength(3);
    expect(interaction?.attachInternals).toBeDefined();
    expect(choices[0].selected).toBe(false);
    expect(choices[1].selected).toBe(true);
    expect(choices[2].selected).toBe(false);
  },
};

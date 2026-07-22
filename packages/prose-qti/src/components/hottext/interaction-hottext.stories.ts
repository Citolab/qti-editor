import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';

import '../../components/register';

export default {
  title: 'Interactions/Hottext',
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
    <qti-hottext-interaction
      response-identifier="RESPONSE_HOTTEXT"
      max-choices="2"
      correct-response="hottext-b,hottext-c"
      score="2"
    >
      Contract tests should protect
      <qti-hottext identifier="hottext-a">implementation trivia</qti-hottext>,
      <qti-hottext identifier="hottext-b">public descriptors</qti-hottext>,
      and
      <qti-hottext identifier="hottext-c">runtime assembly rules</qti-hottext>
      from drifting apart.
    </qti-hottext-interaction>
  `, 'block hottext fixture with multiple selected phrases'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-hottext-interaction');
    expect(interaction).not.toBeNull();
    await waitFor(() => {
      expect(interaction?.shadowRoot).not.toBeNull();
    });
    const hotTexts = canvasElement.querySelectorAll('qti-hottext');
    expect(hotTexts).toHaveLength(3);
  },
};

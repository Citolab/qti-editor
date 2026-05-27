import '@qti-components/theme/item.css';
import '@qti-editor/interaction-order';
import '@qti-editor/interaction-shared';
import { html } from 'lit';

export default {
  title: 'Interactions/Order',
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
    <qti-order-interaction
      response-identifier="RESPONSE_ORDER"
      correct-response="choice-b,choice-c,choice-a"
      shuffle="true"
      score="2"
    >
      <qti-prompt>The following F1 drivers finished on the podium in the first ever Grand Prix of Bahrain. Can you rearrange them into the correct finishing order?</qti-prompt>
      <qti-simple-choice identifier="choice-a">Rubens</qti-simple-choice>
      <qti-simple-choice identifier="choice-b">Jenson</qti-simple-choice>
      <qti-simple-choice identifier="choice-c">Michael</qti-simple-choice>
    </qti-order-interaction>
  `, 'ordering fixture with persisted canonical sequence'),
};

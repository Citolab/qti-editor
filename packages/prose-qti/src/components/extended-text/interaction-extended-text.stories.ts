import { html } from 'lit';

import '../extended-text';
import '../../components/register';

export default {
  title: 'Interactions/Extended Text',
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
    <qti-extended-text-interaction
      response-identifier="RESPONSE_EXTENDED"
      expected-lines="6"
      expected-length="280"
      placeholder-text="Explain how descriptor contracts prevent accidental schema drift."
      score="5"
    >
      <qti-prompt>Explain why the interaction descriptor should be the source of truth.</qti-prompt>
    </qti-extended-text-interaction>
  `, 'essay-style fixture'),
};

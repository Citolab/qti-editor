import { html } from 'lit';

import '../associate';
import '../../components/register';

import '@qti-components/theme/item.css';

export default {
  title: 'Interactions/Associate',
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
    <qti-associate-interaction
      response-identifier="RESPONSE_ASSOCIATE"
      max-associations="2"
      correct-response="choice-a choice-c,choice-b choice-d"
      score="2"
    >
      <qti-prompt>Associate each contract promise with the right responsibility.</qti-prompt>
      <qti-simple-associable-choice identifier="choice-a">Node specs</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="choice-b">Plugin factories</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="choice-c">Descriptor registry</qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="choice-d">Runtime extension assembly</qti-simple-associable-choice>
    </qti-associate-interaction>
  `, 'single-set association fixture with four associable choices'),
};

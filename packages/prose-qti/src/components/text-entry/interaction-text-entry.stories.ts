import '@citolab/prose-qti/components/text-entry';
import { html } from 'lit';

export default {
  title: 'Interactions/Text Entry',
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
    <p style="font-size: 18px; line-height: 1.7; color: #0f172a;">
      The reserved package prefix is
      <qti-text-entry-interaction
        response-identifier="RESPONSE_TEXT_ENTRY"
        correct-response="@qti-editor"
        case-sensitive="true"
        placeholder-text="@qti-editor"
        class="qti-input-width-8"
        score="1"
      ></qti-text-entry-interaction>
      for reusable workspace modules.
    </p>
  `, 'inline text-entry fixture with placeholder and case-sensitive answer'),
};

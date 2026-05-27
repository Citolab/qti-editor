import '@qti-components/theme/item.css';
import '@qti-editor/interaction-gap-match';
import '@qti-editor/interaction-shared';
import { html } from 'lit';

export default {
  title: 'Interactions/Gap Match',
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
    <qti-gap-match-interaction
      response-identifier="RESPONSE_GAP_MATCH"
      correct-response='[["gap-text-a","gap-a"],["gap-text-b","gap-b"]]'
      score="2"
    >
      <qti-prompt>Place each label into the correct authoring placeholder.</qti-prompt>
      <qti-gap-text identifier="gap-text-a">descriptor</qti-gap-text>
      <qti-gap-text identifier="gap-text-b">runtime adapter</qti-gap-text>
      <p>
        The
        <qti-gap identifier="gap-a"></qti-gap>
        defines contract ownership, while the
        <qti-gap identifier="gap-b"></qti-gap>
        consumes that contract without copying it.
      </p>
    </qti-gap-match-interaction>
  `, 'drag-and-place fixture with two gap texts and two gaps'),
};

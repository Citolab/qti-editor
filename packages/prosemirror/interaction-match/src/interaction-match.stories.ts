import '@qti-components/theme/item.css';
import '@qti-editor/interaction-match';
import '@qti-editor/interaction-shared';
import { html } from 'lit';

export default {
  title: 'Interactions/Match',
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
    <qti-match-interaction
      response-identifier="RESPONSE_MATCH"
      correct-response='[["source-a","target-a"],["source-b","target-b"],["source-c","target-b"],["source-d","target-c"]]'
      score="3"
    >
      <qti-prompt>Match the following characters to the Shakespeare play they appeared in:</qti-prompt>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="source-a">Capulet</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="source-b">Demetrius</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="source-c">Lysander</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="source-d">Prospero</qti-simple-associable-choice>
      </qti-simple-match-set>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="target-a">Romeo and Juliet</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="target-b">A Midsummer Night's Dream</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="target-c">The Tempest</qti-simple-associable-choice>
      </qti-simple-match-set>
    </qti-match-interaction>
  `, 'two-set matching fixture with persisted associations'),
};

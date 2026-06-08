import '@qti-components/theme/item.css';
import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { QtiInlineChoiceInteraction, QtiInlineChoice } from '@qti-editor/interaction-inline-choice';

if (!customElements.get('qti-inline-choice-interaction')) {
  customElements.define('qti-inline-choice-interaction', QtiInlineChoiceInteraction);
}
if (!customElements.get('qti-inline-choice')) {
  customElements.define('qti-inline-choice', QtiInlineChoice);
}

export default {
  title: 'Interactions/Inline Choice',
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
      The migration layer should preserve
      <qti-inline-choice-interaction
        response-identifier="RESPONSE_INLINE"
        correct-response="choice-b"
        score="1"
      >
        <qti-inline-choice identifier="choice-a">only visible DOM</qti-inline-choice>
        <qti-inline-choice identifier="choice-b">authoring intent</qti-inline-choice>
        <qti-inline-choice identifier="choice-c">only XML output</qti-inline-choice>
      </qti-inline-choice-interaction>
      when legacy content is upgraded.
    </p>
  `, 'inline dropdown fixture embedded in surrounding text'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-inline-choice-interaction');
    expect(interaction).not.toBeNull();

    const trigger = interaction!.shadowRoot?.querySelector<HTMLButtonElement>('button[part="trigger"]');
    const menu = interaction!.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
    const choices = interaction!.querySelectorAll<HTMLElement & { selected?: boolean }>('qti-inline-choice');

    expect(trigger?.textContent).toContain('authoring intent');
    expect(choices).toHaveLength(3);
    expect(choices[0].selected).toBe(false);
    expect(choices[1].selected).toBe(true);
    expect(choices[2].selected).toBe(false);
    expect(menu).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(trigger!);

    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector<HTMLElement>('[part="menu"]')).not.toBeNull();
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    await userEvent.click(trigger!);

    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector<HTMLElement>('[part="menu"]')).toBeNull();
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });
  },
};

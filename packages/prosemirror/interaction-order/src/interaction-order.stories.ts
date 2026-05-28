import '@qti-components/theme/item.css';
import '@qti-editor/interaction-order';
import '@qti-editor/interaction-shared';
import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';

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
      correct-response='["choice-b","choice-c","choice-a"]'
      score="2"
    >
      <qti-prompt>The following F1 drivers finished on the podium in the first ever Grand Prix of Bahrain. Can you rearrange them into the correct finishing order?</qti-prompt>
      <qti-simple-choice identifier="choice-a">Rubens</qti-simple-choice>
      <qti-simple-choice identifier="choice-b">Jenson</qti-simple-choice>
      <qti-simple-choice identifier="choice-c">Michael</qti-simple-choice>
    </qti-order-interaction>
  `, 'ordering fixture with persisted canonical sequence'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-order-interaction');
    expect(interaction).not.toBeNull();

    const choices = interaction!.querySelectorAll<HTMLElement>('qti-simple-choice');
    const slots = interaction!.shadowRoot?.querySelectorAll<HTMLElement>('.preview-drops .order-slot');
    expect(choices.length).toBe(3);
    expect(slots?.length).toBe(3);

    // Click the interaction to open the order panel
    await userEvent.click(interaction!);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).not.toBeNull();
    });

    const getChips = () => interaction!.shadowRoot?.querySelectorAll('.association-chip') ?? [];

    expect(interaction!.shadowRoot?.querySelector('.associations-panel-title')?.textContent?.trim()).toBe('Correct Response');
    
    // The correct-response is JSON array ["choice-b","choice-c","choice-a"] so we should see 3 chips
    expect(getChips().length).toBe(3);

    const chips = Array.from(getChips());
    const chipTexts = chips.map(chip => chip.textContent?.replace(/×/g, '').trim());
    
    // Check that chips contain the expected position and label (allow flexible spacing around arrow)
    expect(chipTexts.some(text => text.includes('1') && text.includes('Jenson'))).toBe(true);
    expect(chipTexts.some(text => text.includes('2') && text.includes('Michael'))).toBe(true);
    expect(chipTexts.some(text => text.includes('3') && text.includes('Rubens'))).toBe(true);

    // Test interaction: select a choice and place it in a slot
    await userEvent.click(canvasElement.ownerDocument.body);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).toBeNull();
    });

    // Select choice-a (Rubens)
    await userEvent.click(choices[0]);

    // Click first slot to place it
    await userEvent.click(slots![0]);

    // Re-open panel to verify the change
    await userEvent.click(interaction!);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).not.toBeNull();
    });

    // Now Rubens should be in position 1
    const updatedChips = Array.from(getChips());
    expect(updatedChips.some(chip => {
      const text = chip.textContent?.replace(/×/g, '').trim();
      return text?.includes('1') && text?.includes('Rubens');
    })).toBe(true);

    await userEvent.click(canvasElement.ownerDocument.body);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).toBeNull();
    });
  },
};

export const MultipleChoices = {
  render: () => renderFixture(html`
    <qti-order-interaction
      response-identifier="RESPONSE_MULTI"
      correct-response='["CHOICE_3aaa9ae7-1ad9-474f-b191-9c9fc2b0bc6c","CHOICE_734eb96f-be85-4405-b1fb-b565360c0973","CHOICE_42549122-c98d-43d6-a6ca-2cacc686b737"]'
      score="2"
    >
      <qti-prompt>Order these painters by birth year:</qti-prompt>
      <qti-simple-choice identifier="CHOICE_3aaa9ae7-1ad9-474f-b191-9c9fc2b0bc6c">Rubens (1577)</qti-simple-choice>
      <qti-simple-choice identifier="CHOICE_734eb96f-be85-4405-b1fb-b565360c0973">Velázquez (1599)</qti-simple-choice>
      <qti-simple-choice identifier="CHOICE_42549122-c98d-43d6-a6ca-2cacc686b737">Rembrandt (1606)</qti-simple-choice>
    </qti-order-interaction>
  `, 'multiple choices with JSON array correct-response'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-order-interaction');
    expect(interaction).not.toBeNull();

    // Open the order panel
    await userEvent.click(interaction!);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).not.toBeNull();
    });

    const getChips = () => interaction!.shadowRoot?.querySelectorAll('.association-chip') ?? [];

    // Should show 3 ordered chips
    expect(getChips().length).toBe(3);

    const chips = Array.from(getChips());
    const chipTexts = chips.map(chip => chip.textContent?.replace(/×/g, '').trim());
    
    // Verify the order is preserved from the JSON array
    expect(chipTexts.some(text => text?.includes('1') && text?.includes('Rubens'))).toBe(true);
    expect(chipTexts.some(text => text?.includes('2') && text?.includes('Velázquez'))).toBe(true);
    expect(chipTexts.some(text => text?.includes('3') && text?.includes('Rembrandt'))).toBe(true);

    await userEvent.click(canvasElement.ownerDocument.body);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).toBeNull();
    });
  },
};


import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';

import '../../components/register';

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
      correct-response='["source-a target-a","source-b target-b","source-c target-b","source-d target-c"]'
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
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-match-interaction');
    expect(interaction).not.toBeNull();

    await userEvent.click(interaction!);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).not.toBeNull();
    });

    const getChips = () => interaction!.shadowRoot?.querySelectorAll('.association-chip') ?? [];

    expect(interaction!.shadowRoot?.querySelector('.associations-panel-title')?.textContent?.trim()).toBe('Correct Response');
    expect(getChips().length).toBe(4);

    const removeButtons = interaction!.shadowRoot?.querySelectorAll<HTMLButtonElement>('button[aria-label="Remove"]');
    await userEvent.click(removeButtons![0]);

    await waitFor(() => {
      expect(getChips().length).toBe(3);
    });

    const sourceChoice = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="source-a"]');
    const targetChoice = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="target-a"]');

    await userEvent.click(sourceChoice!);

    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector('.pending-indicator')?.textContent).toContain('Capulet');
    });

    await userEvent.click(targetChoice!);

    await waitFor(() => {
      expect(getChips().length).toBe(4);
    });

    expect(Array.from(getChips()).some((chip) => chip.textContent?.includes('Capulet') && chip.textContent?.includes('Romeo and Juliet'))).toBe(true);

    await userEvent.click(canvasElement.ownerDocument.body);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).toBeNull();
    });
  },
};

export const MultipleToOneAssociations = {
  render: () => renderFixture(html`
    <qti-match-interaction
      response-identifier="RESPONSE_MULTIPLE"
      score="2"
    >
      <qti-prompt>Match items to their category (multiple items can belong to the same category):</qti-prompt>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="apple">Apple</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="carrot">Carrot</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="banana">Banana</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="broccoli">Broccoli</qti-simple-associable-choice>
      </qti-simple-match-set>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="fruit">Fruit</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="vegetable">Vegetable</qti-simple-associable-choice>
      </qti-simple-match-set>
    </qti-match-interaction>
  `, 'multiple sources to same target'),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const interaction = canvasElement.querySelector('qti-match-interaction');
    expect(interaction).not.toBeNull();

    let eventCount = 0;
    let lastEventDetail: any = null;
    
    interaction!.addEventListener('match-association-change', (e: Event) => {
      eventCount++;
      lastEventDetail = (e as CustomEvent).detail;
    });

    await userEvent.click(interaction!);

    await waitFor(() => {
      expect(interaction?.shadowRoot?.querySelector('.associations-panel')).not.toBeNull();
    });

    const getChips = () => interaction!.shadowRoot?.querySelectorAll('.association-chip') ?? [];

    // Initially no associations
    expect(getChips().length).toBe(0);

    // Create first association: apple → fruit
    const apple = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="apple"]');
    const fruit = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="fruit"]');
    
    await userEvent.click(apple!);
    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector('.pending-indicator')?.textContent).toContain('Apple');
    });
    
    await userEvent.click(fruit!);
    await waitFor(() => {
      expect(getChips().length).toBe(1);
    });
    
    // Verify event was emitted
    expect(eventCount).toBe(1);
    expect(lastEventDetail.associations).toEqual([['apple', 'fruit']]);

    // Create second association: banana → fruit (same target)
    const banana = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="banana"]');
    
    await userEvent.click(banana!);
    await userEvent.click(fruit!);
    
    await waitFor(() => {
      expect(getChips().length).toBe(2);
    });
    
    // Verify event was emitted again
    expect(eventCount).toBe(2);
    expect(lastEventDetail.associations).toHaveLength(2);
    expect(lastEventDetail.associations).toContainEqual(['apple', 'fruit']);
    expect(lastEventDetail.associations).toContainEqual(['banana', 'fruit']);

    // Create third association: carrot → vegetable (different target)
    const carrot = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="carrot"]');
    const vegetable = interaction!.querySelector<HTMLElement>('qti-simple-associable-choice[identifier="vegetable"]');
    
    await userEvent.click(carrot!);
    await userEvent.click(vegetable!);
    
    await waitFor(() => {
      expect(getChips().length).toBe(3);
    });

    // Verify all chips display correctly
    const chips = Array.from(getChips());
    const chipTexts = chips.map(chip => chip.textContent?.replace(/×/g, '').trim());
    
    // Check that chips contain the expected labels (allow flexible spacing around arrow)
    expect(chipTexts.some(text => text?.includes('Apple') && text?.includes('Fruit'))).toBe(true);
    expect(chipTexts.some(text => text?.includes('Banana') && text?.includes('Fruit'))).toBe(true);
    expect(chipTexts.some(text => text?.includes('Carrot') && text?.includes('Vegetable'))).toBe(true);

    // Remove one association from the multiple-to-one group
    const removeButtons = interaction!.shadowRoot?.querySelectorAll<HTMLButtonElement>('button[aria-label="Remove"]');
    const appleChipIndex = chips.findIndex(chip => chip.textContent?.includes('Apple'));
    
    await userEvent.click(removeButtons![appleChipIndex]);
    
    await waitFor(() => {
      expect(getChips().length).toBe(2);
    });
    
    // Verify event reflects the removal
    expect(lastEventDetail.associations).toHaveLength(2);
    expect(lastEventDetail.associations).not.toContainEqual(['apple', 'fruit']);
    expect(lastEventDetail.associations).toContainEqual(['banana', 'fruit']);
    expect(lastEventDetail.associations).toContainEqual(['carrot', 'vegetable']);
  },
};

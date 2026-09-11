/**
 * Pure-ProseMirror QTI roundtrip regression.
 *
 *   ITEM001.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripChoice          (hoist correct-response/score onto interactions)
 *     → roundtripXmlToPm   (import item-body + doc attrs into the PM doc)
 *     → pmToRoundtripXml   (export PM doc back to the editor-origin item-body)
 *     → buildSingleAssessmentItemXml (compose the complete QTI assessment item)
 *
 * The import/export pipeline is exported so the regression test can drive it
 * directly (without rendering); the story is a thin visual wrapper around it.
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { expect, waitFor } from 'storybook/test';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { roundtripChoice, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';

import { createRegressionEditor } from './prosemirror-base';
import sourceXML from './fixtures/ITEM001.xml?raw';

import '@citolab/prose-qti/components/choice/register.js';

import 'prosemirror-view/style/prosemirror.css';
// The same stylesheets the shipping editors load (see apps/*/src/style.css).
// Without the item theme the interaction controls compute to 0x0, so they are
// invisible to real pointer events — see finding #10 in docs/testing-findings.md.
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
// Opt-in companion to the decorator plugins the two affordance stories below install.
import '@citolab/prose-qti/decorations.css';
import './kennisnet.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const editor = createRegressionEditor({
  descriptor: choiceInteractionDescriptor,
  sourceXML,
  transforms: () => [roundtripChoice, roundtripItemBody]
});

export const { schema, exportAssessmentItemDoc, mountEditor } = editor;

/** Import ITEM001.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem001 = editor.importItem;

const meta: Meta = {
  title: 'QTI Kennisnet/Regression',
  // Captured by the VRT project (VRT=1, `just screenshots`). One story, one committed baseline in
  // apps/e2e/stories/__vrt__ — the editor's counterpart to the runtime's kennisnet baselines, so the
  // same ITEM fixture can be eyeballed side by side across the two repos.
  tags: ['vrt'],
  // These exports are the reusable import/export pipeline (consumed by the
  // regression test), not stories.
  excludeStories: ['schema', 'importItem001', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem001: StoryObj = {
  /*
   * This story is about the roundtrip, not the affordances — but it shares the file, and therefore
   * the stylesheet, with the two that are. Park the pointer so its capture cannot pick up a hover
   * state left behind by whichever story ran before it.
   */
  play: async ({ canvasElement }) => {
    await hoverForReal(awayFromInteraction(canvasElement));
  },
  render: () => {
    let panelEl: HTMLElement | null = null;
    return html`
      <div class="regression-layout">
        <aside
          class="regression-panel"
          ${ref(el => {
            if (el) panelEl = el as HTMLElement;
          })}
        ></aside>
        <div
          class="regression-item editor-container"
          ${ref(el => {
            if (el) mountEditor(el as HTMLElement, { panelEl: panelEl ?? undefined });
          })}
        ></div>
      </div>
    `;
  }
};

/**
 * The editor affordances, in their two states.
 *
 * Two stories rather than one because the affordance set is deliberately staged: hover shows the
 * boundary and what is inside it, clicking into the interaction replaces the boundary with a ring
 * and adds the settings pill. One capture could only ever show one of those, and the pair is the
 * design.
 *
 * The capture runs after `play`, so whatever `play` leaves on screen is what lands on disk — which
 * is why these stories end in a hover / a click rather than asserting and cleaning up.
 */
/**
 * Move the real pointer onto `el`, and leave it there.
 *
 * `userEvent.hover` from `storybook/test` is testing-library's synthetic pointer events: they fire
 * the DOM events but do not move the browser's actual cursor, so CSS `:hover` never matches and a
 * capture taken afterwards is simply the idle state — measured, before this existed. Vitest's
 * browser locator drives the Playwright mouse, which does.
 *
 * Imported dynamically because these story files are also served by plain `pnpm storybook`, where
 * `vitest/browser` does not resolve at all. Outside a Vitest run the synthetic fallback is the best
 * available and is only ever used for eyeballing, never for a capture.
 */
async function hoverForReal(el: HTMLElement): Promise<void> {
  try {
    const { page } = await import('vitest/browser');
    await page.elementLocator(el).hover();
  } catch {
    /*
     * Not a Vitest browser run — plain `pnpm storybook`, where `vitest/browser` does not resolve and
     * there is no controllable pointer. Nothing is being captured there, so this is a no-op rather
     * than a failure. A hover that silently fails to land inside a Vitest run is caught by the
     * assertions in the `play` functions below, which is where that mistake actually matters.
     */
  }
}

/**
 * Somewhere in the item that is deliberately not the interaction, for parking the pointer.
 *
 * `hover()` aims at an element's centre, and the container's centre happens to land on a choice row
 * — so "outside the interaction" has to be an element that really is outside it. The item's
 * illustration sits in the neighbouring layout column.
 */
function awayFromInteraction(canvasElement: HTMLElement): HTMLElement {
  return (
    canvasElement.querySelector<HTMLElement>('.regression-item img') ??
    canvasElement.querySelector<HTMLElement>('.regression-item')!
  );
}

function renderWithDecorations() {
  return html`
    <div class="regression-layout">
      <div
        class="regression-item editor-container"
        ${ref(el => {
          if (el) mountEditor(el as HTMLElement, { decorations: true });
        })}
      ></div>
    </div>
  `;
}

/**
 * Hovered: only the hovered row's × appears. The interaction itself paints nothing on hover — no
 * boundary tint, no per-choice outline — and, absent a click, no pill and no `+` either.
 */
export const DecorationsHovered: StoryObj = {
  render: renderWithDecorations,
  play: async ({ canvasElement }) => {
    const choice = canvasElement.querySelector<HTMLElement>('qti-choice-interaction qti-simple-choice');
    if (!choice) throw new Error('no qti-simple-choice to hover');

    await hoverForReal(choice);

    // Assert the hover actually landed: the row's × is the one thing hover reveals. A capture is a
    // silent test — if the pointer never arrived, the screenshot is simply the idle state.
    const remove = choice.nextElementSibling as HTMLElement | null;
    await expect(remove?.classList.contains('qti-decoration--remove')).toBe(true);
    // Polled: the reveal is a 150ms opacity transition, so the first frame still reads 0.
    await waitFor(() => expect(getComputedStyle(remove!).opacity).toBe('1'));

    // And that hover alone paints nothing on the block.
    const interaction = choice.closest('qti-choice-interaction')!;
    await expect(getComputedStyle(interaction).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await expect(getComputedStyle(choice).outlineStyle).toBe('none');
    await expect(interaction.nextElementSibling?.classList.contains('qti-decoration--actions') ?? false).toBe(false);
  }
};

/**
 * Clicked into: the gray wash, the action pill — select, settings, copy, delete — and the `+` under
 * the last choice. No ring: the wash is the whole "active" signal.
 *
 * The pointer is parked outside the interaction afterwards so no row's × is in the capture; that is
 * the hovered story's business.
 */
export const DecorationsActive: StoryObj = {
  render: renderWithDecorations,
  play: async ({ canvasElement }) => {
    const choice = canvasElement.querySelector<HTMLElement>('qti-choice-interaction qti-simple-choice');
    if (!choice) throw new Error('no qti-simple-choice to click into');

    const { page } = await import('vitest/browser');
    await page.elementLocator(choice).click();

    /*
     * Park the pointer clear of the interaction. Two reasons, both about what the baseline records:
     * the ring's rule deliberately suppresses the hover tint, so a pointer left inside would
     * capture the two states fighting rather than the active one — and a pointer over any choice
     * row reveals that row's ×, which is the hovered story's business, not this one's.
     */
    await hoverForReal(awayFromInteraction(canvasElement));

    // The wash is the pill's own condition read off the DOM, so asserting the pill asserts both.
    const interaction = choice.closest('qti-choice-interaction')!;
    const pill = interaction.nextElementSibling;
    await expect(pill?.classList.contains('qti-decoration--actions')).toBe(true);
    await expect(pill!.querySelectorAll('.qti-decoration__action').length).toBe(4);
    await expect(interaction.querySelector('.qti-decoration--add')).not.toBeNull();

    // Painted at all, not which gray — the colour is a token, and the capture below pins it.
    await expect(getComputedStyle(interaction).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await expect(getComputedStyle(interaction).outlineStyle).toBe('none');
  }
};

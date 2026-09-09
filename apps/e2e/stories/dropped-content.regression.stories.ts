/**
 * What an editor loses when the item uses something its schema does not model.
 *
 * The sixteen regression stories each pair one fixture with the one interaction it needs, so they
 * only ever show the case where editor and item agree. This one is the disagreement — the case every
 * shipping editor is actually in, because the QTI standard is larger than any schema built from a
 * list of descriptors.
 *
 * It needs no new fixture. ITEM015 is the gap-match item; imported into an editor that knows only
 * `qti-choice-interaction`, its interaction is content the schema cannot hold. That is the same
 * situation as `apps/qti-example-editor` opening a real item with ten descriptors registered, and
 * the same situation the full editor is in when someone imports an item using an interaction nobody
 * has written a descriptor for yet.
 *
 * ## Two stories, because one proves nothing
 *
 * `GapMatchInAChoiceOnlyEditor` is the loss; `GapMatchInItsOwnEditor` is the same fixture through the
 * same pipeline in an editor that models it. Flip between them and the missing interaction is
 * obvious — the draggable words fall out of the sentence and lie loose in the prose. Looking at the
 * first one alone, nothing tells you anything is wrong, which is exactly the complaint that started
 * this work.
 *
 * ## There is no notice on screen here, on purpose
 *
 * There used to be. `@citolab/prose-extensions/schema-gaps` ships the scan and no renderer — saying
 * the news is the consumer's job, and the shape of that answer differs per consumer, so there is no
 * longer a shipping component for a story to show. `apps/qti-example-editor` has its own; so does
 * `qti-editor-full-assessment`, through React and i18next. Rendering one *here* would mean either
 * reaching into an app this story is not part of, or building a mock-up and then asserting against
 * it — a test of itself.
 *
 * So this pair now shows the loss in the document, which is the part that needs seeing: flip between
 * the two stories and the draggable words fall out of the sentence. What the scan *reports* about
 * that loss — the tag name, the count, the author's own words, and the Dutch `getMessage` override
 * (`dutchRecoveryMessage`) — is asserted in `dropped-content.regression.browser.test.ts`, against
 * the data rather than against markup.
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { expect } from 'storybook/test';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { gapMatchInteractionDescriptor } from '@citolab/prose-qti/components/gap-match';
import { roundtripGapMatch, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';

import { createRegressionEditor } from './prosemirror-base';
import sourceXML from './fixtures/ITEM015.xml?raw';

import '@citolab/prose-qti/components/choice/register.js';
import '@citolab/prose-qti/components/gap-match/register.js';

import 'prosemirror-view/style/prosemirror.css';
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './kennisnet.css';
import './dropped-content.css';

import type { RegressionEditor } from './prosemirror-base';
import type { SchemaGapMessageResolver } from '@citolab/prose-extensions/schema-gaps';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

/**
 * The change messages, in Dutch.
 *
 * Dispatches on `kind`, which is the point of it being a declared field: no reading of optional data
 * fields to work out which case this is. Returning `undefined` for a kind keeps the built-in English,
 * which is why a host can translate the cases it cares about and leave the rest — and why this stays
 * a `switch` over the union rather than an `if`, so a second kind arrives as a compiler complaint
 * here rather than as silent English in the notice.
 */
export const dutchRecoveryMessage: SchemaGapMessageResolver = change => {
  switch (change.kind) {
    case 'unrepresentable-element':
      return `<${change.nodeType}> kan hier niet worden weergegeven; de inhoud is bewaard.`;
    default:
      return undefined;
  }
};

// gap-match's associable choices reference the qtiMedia node group; the same stub item015's own
// story uses, so the two schemas below differ in exactly one thing — the interaction.
const qtiMediaStub = {
  group: 'block qtiMedia',
  atom: true,
  selectable: true,
  parseDOM: [{ tag: 'qti-media-stub' }],
  toDOM: () => ['qti-media-stub'] as const,
};

/** An editor that knows only choice interactions, handed the gap-match item. */
const strangerEditor = createRegressionEditor({
  descriptor: choiceInteractionDescriptor,
  sourceXML,
  transforms: () => [roundtripGapMatch, roundtripItemBody],
  extraNodes: { qtiMediaStub }
});

/** The same item and the same pipeline, in an editor that models it. The control. */
const nativeEditor = createRegressionEditor({
  descriptor: gapMatchInteractionDescriptor,
  sourceXML,
  transforms: () => [roundtripGapMatch, roundtripItemBody],
  extraNodes: { qtiMediaStub }
});

export const importAsStranger = strangerEditor.importItem;
export const findStrangerGaps = strangerEditor.findImportGaps;
export const exportAsStranger = strangerEditor.exportAssessmentItemDoc;
export const mountStrangerEditor = strangerEditor.mountEditor;

export const findNativeGaps = nativeEditor.findImportGaps;

const meta: Meta = {
  title: 'QTI Kennisnet/Dropped content',
  // Not VRT-tagged. These are worth looking at, but a committed baseline is one more thing to
  // re-bless on every unrelated change, and the assertions below already pin what matters.
  excludeStories: [
    'importAsStranger',
    'findStrangerGaps',
    'exportAsStranger',
    'mountStrangerEditor',
    'findNativeGaps',
    'dutchRecoveryMessage'
  ]
};
export default meta;

/** The editor and its attributes panel, laid out as the minimal editor lays them out. */
function renderEditor(editor: RegressionEditor) {
  let panelEl: HTMLElement | null = null;
  return html`
    <div class="regression-layout">
      <aside
        class="regression-panel"
        ${ref(el => {
          if (el) panelEl = el as HTMLElement;
        })}
      ></aside>
      <div class="dropped-content-pane">
        <div
          class="regression-item editor-container"
          ${ref(el => {
            if (el) editor.mountEditor(el as HTMLElement, { panelEl: panelEl ?? undefined });
          })}
        ></div>
      </div>
    </div>
  `;
}

/**
 * ITEM015 in an editor that has no gap-match node.
 *
 * The interaction is gone: `basisch` and `zuur` were its draggable options and now sit as loose text,
 * and the sentence they belonged in has two holes where the gaps were. Nothing on screen says so,
 * which is the point of the story — the loss is silent, and a consumer that does not render the scan
 * result ships exactly this.
 */
export const GapMatchInAChoiceOnlyEditor: StoryObj = {
  render: () => renderEditor(strangerEditor),
  play: async ({ canvasElement }) => {
    // The interaction is absent from the editor.
    await expect(canvasElement.querySelector('qti-gap-match-interaction')).toBeNull();

    // Its options survive as loose prose — this is what "unwrapped, not refused" looks like to an
    // author, and why the excerpt in the report quotes their words rather than a type name.
    await expect(canvasElement.textContent).toContain('basisch');

    // And the item around the hole still rendered, so the loss is bounded rather than total.
    await expect(canvasElement.querySelector('.editor-container')?.textContent?.trim().length ?? 0)
      .toBeGreaterThan(0);
  }
};

/**
 * The control: the same fixture, the same transforms, an editor that models the interaction.
 *
 * Worth having next to the story above for the same reason the test file has it — a difference that
 * shows up either way is not a difference.
 */
export const GapMatchInItsOwnEditor: StoryObj = {
  render: () => renderEditor(nativeEditor),
  play: async ({ canvasElement }) => {
    // The interaction is present, so there was nothing to report in the first place.
    await expect(canvasElement.querySelector('qti-gap-match-interaction')).not.toBeNull();
  }
};

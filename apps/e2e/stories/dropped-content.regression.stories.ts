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
 * situation as `apps/qti-prosemirror-item` opening a real item with ten descriptors registered, and
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
 * The notice above the editor is `renderSchemaGapNotice` from `@citolab/prose-qti/schema-recovery` —
 * the shipping component, not a mock-up, so what is on screen here is what a host sees. It is the
 * package's rather than either app's precisely so that this story can show it without reaching into
 * an app it is not part of.
 *
 * ## In Dutch, on purpose
 *
 * Not decoration. Every word of this feature is replaceable from outside — see
 * `docs/compatibility-messages.md` — and a seam nobody has exercised is a seam that works until the
 * day someone needs it. The Kennisnet items are Dutch, their authors are Dutch, so this is also
 * simply the truer picture of what the notice looks like in use.
 *
 * Both seams appear here, and they are different:
 *
 *   - `DUTCH_NOTICE_MESSAGES` replaces the notice's own sentences, which is what shows on screen.
 *   - `dutchRecoveryMessage` replaces the `message` on each change, which is what a host logs,
 *     forwards or renders its own way. The notice deliberately does NOT display it — it renders from
 *     the facts (`kind`, `nodeType`, `data.excerpt`) — so that override is asserted in the test file
 *     rather than visible in the story.
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { expect } from 'storybook/test';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { gapMatchInteractionDescriptor } from '@citolab/prose-qti/components/gap-match';
import { roundtripGapMatch, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import {
  renderSchemaGapNotice,
  SCHEMA_GAP_NOTICE_CLASS,
} from '@citolab/prose-qti/schema-recovery/notice';

import { createRegressionEditor } from './prosemirror-base';
import sourceXML from './fixtures/ITEM015.xml?raw';

import '@citolab/prose-qti/components/choice/register.js';
import '@citolab/prose-qti/components/gap-match/register.js';

import 'prosemirror-view/style/prosemirror.css';
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import '@citolab/prose-qti/schema-recovery/notice.css';
import './kennisnet.css';
import './dropped-content.css';

import type { RegressionEditor } from './prosemirror-base';
import type { SchemaGapNoticeMessages } from '@citolab/prose-qti/schema-recovery/notice';
import type { RecoveryMessageResolver } from '@citolab/prose-qti/schema-recovery';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

/**
 * The notice, in Dutch.
 *
 * `heading` is a function of the count rather than a template, because Dutch and English disagree
 * about how the number changes the sentence and a placeholder would settle that on the translator's
 * behalf. The quotation marks are the Dutch pair („…”), which is also the quickest way to see at a
 * glance that the override took effect rather than being appended to the English.
 */
export const DUTCH_NOTICE_MESSAGES: SchemaGapNoticeMessages = {
  heading: count => (count === 1
    ? 'Deze editor kan 1 element in dit item niet weergeven. De inhoud is bewaard, het element zelf niet.'
    : `Deze editor kan ${count} elementen in dit item niet weergeven. Hun inhoud is bewaard, de elementen zelf niet.`),
  occurrences: count => ` (${count}×)`,
  quote: excerpt => ` — „${excerpt}”`,
};

/**
 * The change messages, in Dutch.
 *
 * Dispatches on `kind`, which is the point of it being a declared field: no reading of optional data
 * fields to work out which case this is. Returning `undefined` for a kind keeps the built-in English,
 * which is why a host can translate the two cases it cares about and leave the rest.
 */
export const dutchRecoveryMessage: RecoveryMessageResolver = change => {
  switch (change.kind) {
    case 'unrepresentable-element':
      return `<${change.nodeType}> kan hier niet worden weergegeven; de inhoud is bewaard.`;
    case 'unwrapped-node':
      return `Het element «${change.nodeType}» is verwijderd; de inhoud eronder is bewaard.`;
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
    'DUTCH_NOTICE_MESSAGES',
    'dutchRecoveryMessage'
  ]
};
export default meta;

/** Editor with the Dutch import notice above it, exactly as the minimal editor lays it out. */
function renderWithNotice(editor: RegressionEditor) {
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
          role="status"
          hidden
          ${ref(el => {
            if (!el) return;
            renderSchemaGapNotice(
              el as HTMLElement,
              editor.findImportGaps({ getMessage: dutchRecoveryMessage }),
              { messages: DUTCH_NOTICE_MESSAGES },
            );
          })}
        ></div>
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
 * and the sentence they belonged in has two holes where the gaps were. Without the notice, nothing on
 * screen would say so — which is the whole reason the notice exists.
 */
export const GapMatchInAChoiceOnlyEditor: StoryObj = {
  render: () => renderWithNotice(strangerEditor),
  play: async ({ canvasElement }) => {
    const notice = canvasElement.querySelector<HTMLElement>(`.${SCHEMA_GAP_NOTICE_CLASS}`);

    // The notice is showing, and it names the element that was dropped.
    await expect(notice).not.toBeNull();
    await expect(notice!.hidden).toBe(false);
    await expect(notice!.textContent).toContain('<qti-gap-match-interaction>');

    // In Dutch, and the English is replaced rather than added to.
    await expect(notice!.textContent).toContain('Deze editor kan');
    await expect(notice!.textContent).toContain('niet weergeven');
    await expect(notice!.textContent).not.toContain('no equivalent');

    // The author's own words come through the translation untouched — they are their content, not
    // ours to phrase. („…” rather than “…” because the wrapping is the part we translated.)
    await expect(notice!.textContent).toContain('„basisch');

    // The interaction really is absent from the editor — the notice is not describing a phantom.
    await expect(canvasElement.querySelector('qti-gap-match-interaction')).toBeNull();
  }
};

/**
 * The control: the same fixture, the same transforms, an editor that models the interaction.
 *
 * Nothing is reported and the notice stays hidden. Worth having next to the story above for the same
 * reason the test file has it — a warning that fires either way is not a warning.
 */
export const GapMatchInItsOwnEditor: StoryObj = {
  render: () => renderWithNotice(nativeEditor),
  play: async ({ canvasElement }) => {
    const notice = canvasElement.querySelector<HTMLElement>(`.${SCHEMA_GAP_NOTICE_CLASS}`);

    await expect(notice!.hidden).toBe(true);
    await expect(notice!.textContent).toBe('');

    // The interaction is present, so there was nothing to report.
    await expect(canvasElement.querySelector('qti-gap-match-interaction')).not.toBeNull();
  }
};

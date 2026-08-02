/**
 * Pure-ProseMirror QTI roundtrip regression for ITEM003 (text entry).
 *
 *   ITEM003.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripTextEntry        (hoist correct-response/score onto interactions)
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
import { textEntryInteractionDescriptor } from '@citolab/prose-qti/components/text-entry';
import { roundtripTextEntry, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';

import { createRegressionEditor } from './prosemirror-base';
import sourceXML from './fixtures/ITEM003.xml?raw';

import '@citolab/prose-qti/components/text-entry/register.js';

import 'prosemirror-view/style/prosemirror.css';
// The same stylesheets the shipping editors load (see apps/*/src/style.css).
// Without the item theme the interaction controls compute to 0x0, so they are
// invisible to real pointer events — see finding #10 in docs/testing-findings.md.
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './kennisnet.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const editor = createRegressionEditor({
  descriptor: textEntryInteractionDescriptor,
  sourceXML,
  transforms: () => [roundtripTextEntry, roundtripItemBody]
});

export const { schema, exportAssessmentItemDoc, mountEditor } = editor;

/** Import ITEM003.xml into a ProseMirror document (raw QTI → roundtrip-xml → PM doc). */
export const importItem003 = editor.importItem;

const meta: Meta = {
  title: 'QTI Kennisnet/Regression',
  // Captured by the VRT project (VRT=1, `just screenshots`). One story, one committed baseline in
  // apps/e2e/stories/__vrt__ — the editor's counterpart to the runtime's kennisnet baselines, so the
  // same ITEM fixture can be eyeballed side by side across the two repos.
  tags: ['vrt'],
  // These exports are the reusable import/export pipeline (consumed by the
  // regression test), not stories.
  excludeStories: ['schema', 'importItem003', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem003: StoryObj = {
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

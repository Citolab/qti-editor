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
  // These exports are the reusable import/export pipeline (consumed by the
  // regression test), not stories.
  excludeStories: ['schema', 'importItem001', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem001: StoryObj = {
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

/**
 * Pure-ProseMirror QTI roundtrip regressions for the hotspot interaction.
 *
 *   Q10-*.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripInteractions     (hoist correct-response/score onto interactions)
 *     → roundtripXmlToPm   (import item-body + doc attrs into the PM doc)
 *     → pmToRoundtripXml   (export PM doc back to the editor-origin item-body)
 *     → buildSingleAssessmentItemXml (compose the complete QTI assessment item)
 *
 * The Kennisnet set has no hotspot item, so these are aligned with qti-components' conformance
 * stories instead: `qti-conformance/advanced/Q10 - Hotspot Interaction`. Each fixture is a
 * byte-identical copy of the one under `public/assets/qti-conformance/Advanced/Q10-hotspot/`, with
 * the images under `public/qti/conformance/Q10-hotspot/images`:
 *
 *   Q10-hotspot-interaction-single.xml    Q10-L2-D4  max-choices 1, four circles
 *   Q10-hotspot-interaction-multiple.xml  Q10-L2-D1/D2  max-choices 0, three correct
 *   Q10-hotspot-interaction-shapes.xml    Q10-L2-D3  polygons and a circle, min-choices 1
 *   Q10-hotspot-sv-1.xml                  Q10-L2-D101  four hotspot interactions in one item
 *
 * sv-1's `div.row` / `div.span6` layout and its `span.underline` do not come through: the regression
 * schema's plain body nodes model no `class`. The interactions, their classes and their answer keys
 * do.
 *
 * The import/export pipelines are exported so the regression test can drive them directly (without
 * rendering); the stories are thin visual wrappers around them. Not tagged `vrt`: there is no
 * committed baseline for them, and one has to be made on the machine the existing baselines come
 * from.
 *
 * No ProseKit imports.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { hotspotInteractionDescriptor } from '@citolab/prose-qti/components/hotspot';
import { roundtripInteractions, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';

import { createRegressionEditor } from './prosemirror-base';
import singleXML from './fixtures/Q10-hotspot-interaction-single.xml?raw';
import multipleXML from './fixtures/Q10-hotspot-interaction-multiple.xml?raw';
import shapesXML from './fixtures/Q10-hotspot-interaction-shapes.xml?raw';
import sv1XML from './fixtures/Q10-hotspot-sv-1.xml?raw';

import '@citolab/prose-qti/components/hotspot/register.js';

import 'prosemirror-view/style/prosemirror.css';
// The same stylesheets the shipping editors load (see apps/*/src/style.css).
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
// For the shared regression layout (`.regression-layout` / `.regression-item`) and its width.
import './kennisnet.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { RegressionEditor } from './prosemirror-base';

const hotspotEditor = (sourceXML: string): RegressionEditor =>
  createRegressionEditor({
    descriptor: hotspotInteractionDescriptor,
    sourceXML,
    transforms: () => [roundtripInteractions, roundtripItemBody],
    assetBasePath: '/qti/conformance/Q10-hotspot'
  });

export const q10Single = hotspotEditor(singleXML);
export const q10Multiple = hotspotEditor(multipleXML);
export const q10Shapes = hotspotEditor(shapesXML);
export const q10Sv1 = hotspotEditor(sv1XML);

export const { schema, exportAssessmentItemDoc, mountEditor } = q10Single;

/** Import the Q10 single-cardinality item into a ProseMirror document. */
export const importQ10Single = q10Single.importItem;

const meta: Meta = {
  title: 'QTI Conformance/Regression',
  // These exports are the reusable import/export pipelines (consumed by the
  // regression test), not stories.
  excludeStories: [
    'schema',
    'importQ10Single',
    'exportAssessmentItemDoc',
    'mountEditor',
    'q10Single',
    'q10Multiple',
    'q10Shapes',
    'q10Sv1'
  ]
};
export default meta;

const roundtripStory = (editor: RegressionEditor): StoryObj => ({
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
            if (el) editor.mountEditor(el as HTMLElement, { panelEl: panelEl ?? undefined });
          })}
        ></div>
      </div>
    `;
  }
});

export const RoundtripQ10Single = roundtripStory(q10Single);
export const RoundtripQ10Multiple = roundtripStory(q10Multiple);
export const RoundtripQ10Shapes = roundtripStory(q10Shapes);
export const RoundtripQ10Sv1 = roundtripStory(q10Sv1);

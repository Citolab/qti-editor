/**
 * Pure-ProseMirror QTI roundtrip regression for ITEM009 (match — directedPair multiple).
 *
 *   ITEM009.xml (raw import)
 *     → qtiTransformItem().parse  (parse XML)
 *     → roundtripMatch            (hoist correct-response/score onto interactions)
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
import { Schema, type Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { qtiBasicMarks, qtiBasicNodes } from '@citolab/prose-qti';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { roundtripMatch, roundtripItemBody } from '@citolab/prose-qti/qti3-item-import';
import { ensureInteractionPrompts, exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import { blockSelectPlugin } from '@citolab/prose-extensions/prosemirror';
import { matchInteractionDescriptor } from '@citolab/prose-qti/components/match';

import sourceXML from './fixtures/ITEM009.xml?raw';
import '@citolab/prose-qti/components/match/register.js';
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import { attributesPanelPlugin } from '../../qti-prosemirror-item/src/components/attributes-panel-plugin';

import 'prosemirror-view/style/prosemirror.css';
// The same stylesheets the shipping editors load (see apps/*/src/style.css).
// Without the item theme the interaction controls compute to 0x0, so they are
// invisible to real pointer events — see finding #10 in docs/testing-findings.md.
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './kennisnet.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const qtiNodes = Object.fromEntries(
  [...matchInteractionDescriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [
    name,
    spec
  ])
);

// match's qti-simple-associable-choice content references the qtiMedia node
// group. We don't render real media in regression tests; stub it so the
// schema compiles.
const qtiMediaStub = {
  group: 'block qtiMedia',
  atom: true,
  selectable: true,
  parseDOM: [{ tag: 'qti-media-stub' }],
  toDOM: () => ['qti-media-stub'] as const,
};

const baseNodes = {
  ...qtiBasicNodes,
  paragraph: { ...qtiBasicNodes.paragraph, group: 'block richtext' },
  qtiMediaStub,
  ...qtiNodes,
};

export const schema = new Schema({
  nodes: {
    ...baseNodes,
    doc: {
      ...baseNodes.doc,
      attrs: {
        identifier: {},
        title: {}
      }
    }
  },
  marks: qtiBasicMarks
});

const editorPlugins: Plugin[] = [keymap(baseKeymap), blockSelectPlugin];

export const importItem009 = (): ProseMirrorNode =>
  importItemFromString(sourceXML, schema, {
    assetBasePath: '/qti/kennisnet',
    transforms: [roundtripMatch, roundtripItemBody, ensureInteractionPrompts(schema)]
  });

export const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
  new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

export const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
  const plugins = options.panelEl
    ? [...editorPlugins, attributesPanelPlugin(options.panelEl)]
    : editorPlugins;

  const view = new EditorView(container, {
    state: EditorState.create({ doc: importItem009(), schema, plugins }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
};

const meta: Meta = {
  title: 'QTI Kennisnet/Regression',
  excludeStories: ['schema', 'importItem009', 'exportAssessmentItemDoc', 'mountEditor']
};
export default meta;

export const RoundtripItem009: StoryObj = {
  render: () => {
    let panelEl: HTMLElement | null = null;
    return html`
      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <aside
          ${ref(el => {
            if (el) panelEl = el as HTMLElement;
          })}
        ></aside>
        <div
          class="editor-container"
          style="flex: 1 1 auto; min-width: 0;"
          ${ref(el => {
            if (el) mountEditor(el as HTMLElement, { panelEl: panelEl ?? undefined });
          })}
        ></div>
      </div>
    `;
  }
};

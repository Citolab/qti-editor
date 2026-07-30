/**
 * Shared ProseMirror setup for the Kennisnet regression stories.
 *
 * Every regression story is the same editor with exactly one interaction plugged into it. This
 * module owns the half that must never differ per item — the basic QTI schema, the item-level
 * scaffolding (layout divs, rubric block, doc attrs) and the plugin stack — and knows about no
 * interaction in particular. The story supplies its own descriptor, its own roundtrip transforms and
 * its own fixture.
 *
 * This exists because the setup HAD drifted: only ITEM001/002 put `qtiLayoutDiv` in their schema, so
 * the other 15 stories silently dropped every `qti-layout-row` / `qti-layout-col*` wrapper on import.
 * The wrappers vanished from the editor DOM, which is why the theme's
 * `@media (width <= 767px) { [class*='qti-layout-col'] { width: 100% } }` rule appeared to "not work"
 * in the editor while working fine in qti-components — there was simply nothing for it to match.
 *
 * Deliberately NOT aggregated here: interaction descriptors. One story = the basic schema + one
 * interaction extension.
 */

import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from 'prosemirror-model';
import { EditorState, type Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { qtiBasicMarks, qtiBasicNodes } from '@citolab/prose-qti';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';
import {
  constrainedEnd,
  constrainedHome,
  constrainedShiftEnd,
  constrainedShiftHome
} from '@citolab/prose-qti/components/shared';
import { exportItemXml, importItemFromString } from '@citolab/prose-qti/item-roundtrip';

// Relative rather than by package specifier: `@qti-editor/prosemirror-item` has no tsconfig path
// mapping and is not linked into node_modules, so the specifier form does not resolve. The story
// files reach into this app the same way — `import/no-relative-packages` is simply switched off for
// `*.stories.ts` in eslint.config, and this module is not a story file.
/* eslint-disable-next-line import/no-relative-packages */
import { attributesPanelPlugin } from '../../qti-prosemirror-item/src/components/attributes-panel-plugin';
/* eslint-disable-next-line import/no-relative-packages */
import { divLockPlugin, qtiLayoutDivNodeSpec } from '../../qti-prosemirror-item/src/components/qti-layout-div';

/*
 * Shared child custom elements.
 *
 * Each interaction's own `register.js` defines ONLY the interaction element — `qti-simple-choice`,
 * `qti-simple-associable-choice`, `qti-gap` &co ship their own. Leaving those to the stories had the
 * same outcome as the schema drift above: only ITEM001/002 registered their children, so e.g.
 * `qti-simple-associable-choice` never upgraded in the match items and rendered without a shadow
 * root. They are shared furniture, so the base owns them; `customElements.define` is global and each
 * register guards with `customElements.get`, so importing them once here is exactly equivalent to
 * every story doing it, minus the drift.
 *
 * The interaction's own register stays in the story — one story, one interaction.
 */
import '@citolab/prose-qti/components/shared/components/qti-prompt/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-choice/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-associable-choice/register.js';
import '@citolab/prose-qti/components/shared/components/qti-simple-match-set/register.js';
import '@citolab/prose-qti/components/shared/components/qti-gap/register.js';
import '@citolab/prose-qti/components/shared/components/qti-gap-text/register.js';
import '@citolab/prose-qti/components/shared/components/qti-fake-drag/register.js';

/*
 * Editor-only half of the Kennisnet brand. The runtime half (kennisnet.css) is imported per story
 * and kept byte-identical with qti-components; this one sets --qti-edit-* variables, which only
 * mean anything in the editor, so it is deliberately not in that shared file.
 */
import './kennisnet-edit.css';

import type { InteractionDescriptor } from '@citolab/prose-qti/interfaces';
import type { RoundtripTransform } from '@citolab/prose-qti/item-roundtrip';

/** Where the fixtures' relative `src` attributes are rebased to. */
const ASSET_BASE_PATH = '/qti/kennisnet';

export interface RegressionEditorOptions {
  /** The single interaction this item is built around. */
  descriptor: InteractionDescriptor;
  /** Raw ITEMnnn.xml, imported with `?raw`. */
  sourceXML: string;
  /**
   * Import-side roundtrip transforms for this item. Receives the built schema because some
   * transforms need it (`ensureInteractionPrompts`).
   */
  transforms: (schema: Schema) => RoundtripTransform[];
  /**
   * Extra node specs on top of the base, for the rare item whose interaction references a node group
   * nobody owns yet (ITEM017's media stub). Prefer fixing the descriptor over reaching for this.
   */
  extraNodes?: Record<string, NodeSpec>;
}

export interface RegressionEditor {
  /** The editor schema used for this item's roundtrip. */
  schema: Schema;
  /** Import ITEMnnn.xml into a ProseMirror document (raw QTI -> roundtrip-xml -> PM doc). */
  importItem: () => ProseMirrorNode;
  /**
   * Export a ProseMirror doc to the complete editor-origin QTI assessment item (item-body wrapped
   * with response/outcome declarations + response processing), parsed as an XML `Document`. This is
   * the editor's "save" output.
   */
  exportAssessmentItemDoc: (doc: ProseMirrorNode) => Document;
  /** Mount the editor into `container`, optionally wiring the attributes panel. */
  mountEditor: (container: HTMLElement, options?: { panelEl?: HTMLElement }) => EditorView;
}

export function createRegressionEditor({
  descriptor,
  sourceXML,
  transforms,
  extraNodes
}: RegressionEditorOptions): RegressionEditor {
  // The rubric block is item furniture rather than an interaction, so it belongs to the base; every
  // Kennisnet item carries one.
  const contributedNodes = Object.fromEntries(
    [...descriptor.nodeSpecs, ...qtiRubricBlockDescriptor.nodeSpecs].map(({ name, spec }) => [name, spec])
  );

  const baseNodes = {
    ...qtiBasicNodes,
    paragraph: { ...qtiBasicNodes.paragraph, group: 'block richtext' },
    // Keeps <div class="qti-layout-row"> / <div class="qti-layout-colN"> alive across the roundtrip.
    qtiLayoutDiv: { ...qtiLayoutDivNodeSpec, content: 'block+', group: 'block' },
    ...extraNodes,
    ...contributedNodes
  };

  const schema = new Schema({
    nodes: {
      ...baseNodes,
      doc: {
        ...baseNodes.doc,
        // identifier/title are always supplied from the item-body on import.
        attrs: {
          identifier: {},
          title: {}
        }
      }
    },
    marks: qtiBasicMarks
  });

  const editorPlugins: Plugin[] = [
    history(),
    keymap({
      // Only some interactions extend Enter (e.g. "append a new choice").
      ...(descriptor.enterCommand ? { Enter: descriptor.enterCommand } : {}),
      Home: constrainedHome,
      'Shift-Home': constrainedShiftHome,
      End: constrainedEnd,
      'Shift-End': constrainedShiftEnd,
      'Mod-z': undo,
      'Mod-y': redo,
      'Shift-Mod-z': redo
    }),
    keymap(baseKeymap),
    ...(descriptor.pluginFactories ?? []).map(factory => factory()),
    nodeAttrsSyncPlugin,
    blockSelectPlugin,
    divLockPlugin
  ];

  // Editable-attribute allowlist for the panel, sourced from the interaction's attribute-panel
  // metadata (`editableAttributes`), keyed by node type. Attributes outside a node type's list (e.g.
  // the interaction's `correctResponse`/`maxChoices`, or a simple choice's `identifier`) are rendered
  // disabled. Node types without an entry stay fully editable.
  const editableAttrs = Object.fromEntries(
    Object.values(descriptor.attributePanelMetadata ?? {}).map(metadata => [
      metadata.nodeTypeName,
      metadata.editableAttributes ?? []
    ])
  );

  const importItem = (): ProseMirrorNode =>
    importItemFromString(sourceXML, schema, {
      assetBasePath: ASSET_BASE_PATH,
      transforms: transforms(schema)
    });

  const exportAssessmentItemDoc = (doc: ProseMirrorNode): Document =>
    new DOMParser().parseFromString(exportItemXml(doc, schema), 'application/xml');

  const mountEditor = (container: HTMLElement, options: { panelEl?: HTMLElement } = {}): EditorView => {
    const plugins = options.panelEl
      ? [...editorPlugins, attributesPanelPlugin(options.panelEl, { editableAttrs })]
      : editorPlugins;

    const view = new EditorView(container, {
      state: EditorState.create({ doc: importItem(), schema, plugins }),
      dispatchTransaction(tr) {
        view.updateState(view.state.apply(tr));
      }
    });
    return view;
  };

  return { schema, importItem, exportAssessmentItemDoc, mountEditor };
}

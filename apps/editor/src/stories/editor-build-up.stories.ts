import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { Schema, DOMParser as ProseMirrorDomParser } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import '@qti-editor/interaction-choice';
import '@qti-editor/interaction-shared';
import '../components/registry/editor/attributes/qti-attributes-panel.js';

import {
  qtiChoiceInteractionNodeSpec,
  insertChoiceInteraction,
} from '@qti-editor/interaction-choice';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@qti-editor/prosemirror';
import {
  collectSelectionNodesWithSchemaAttrs,
  type AttributesEventDetail,
} from '@qti-editor/prosemirror-attributes';

import type { NodeSpec } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'Docs/Editor Build-Up',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cookbook-style editor assembly examples that show how to grow from bare ProseMirror to interactions, then add generic editor utilities and an attributes panel.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

const baseNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
};

const baseMarks = {
  strong: {
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }],
    toDOM: () => ['strong', 0] as const,
  },
  em: {
    parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
    toDOM: () => ['em', 0] as const,
  },
};

const interactionNodes: Record<string, NodeSpec> = {
  qtiChoiceInteraction: qtiChoiceInteractionNodeSpec,
  qtiPromptParagraph: qtiPromptParagraphNodeSpec,
  qtiPrompt: qtiPromptNodeSpec,
  qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
};

function createSchema(withInteractions = false) {
  return new Schema({
    nodes: {
      ...baseNodes,
      ...(withInteractions ? interactionNodes : {}),
    },
    marks: baseMarks,
  });
}

function createDocument(schema: Schema, initialContent: string) {
  const temp = document.createElement('div');
  temp.innerHTML = initialContent;
  return ProseMirrorDomParser.fromSchema(schema).parse(temp);
}

function publishAttributesUpdate(eventTarget: EventTarget, state: EditorState) {
  const nodes = collectSelectionNodesWithSchemaAttrs(
    state,
    node => Object.keys(node.type.spec?.attrs ?? {}).length > 0,
  );
  const detail: AttributesEventDetail = {
    nodes,
    activeNode: nodes[0] ?? null,
    open: Boolean(nodes[0]),
  };

  eventTarget.dispatchEvent(new CustomEvent<AttributesEventDetail>('qti:attributes:update', { detail }));
}

function mountEditor(options: {
  host: HTMLElement;
  schema: Schema;
  initialContent: string;
  plugins?: Plugin[];
  onStateChange?: (state: EditorState, view: EditorView) => void;
}) {
  const view = new EditorView(options.host, {
    state: EditorState.create({
      schema: options.schema,
      doc: createDocument(options.schema, options.initialContent),
      plugins: [history(), keymap(baseKeymap), ...(options.plugins ?? [])],
    }),
    dispatchTransaction(transaction) {
      const nextState = view.state.apply(transaction);
      view.updateState(nextState);
      options.onStateChange?.(nextState, view);
    },
  });

  options.onStateChange?.(view.state, view);
  return view;
}

function renderEditorCard(args: {
  title: string;
  description: string;
  mount: (host: HTMLElement) => EditorView | null;
  actions?: (view: EditorView | null) => unknown;
  aside?: unknown;
}) {
  let mounted = false;
  let currentView: EditorView | null = null;

  return html`
    <div style="display:grid; gap: 12px;">
      <div>
        <h3 style="margin:0 0 4px;">${args.title}</h3>
        <p style="margin:0; color:#6b7280;">${args.description}</p>
      </div>
      ${typeof args.actions === 'function'
        ? html`<div>${args.actions(currentView)}</div>`
        : null}
      <div style="display:grid; gap: 16px; grid-template-columns: minmax(0, 1fr) ${args.aside ? '320px' : ''};">
        <div
          style="min-height: 220px; border: 1px solid #d1d5db; border-radius: 12px; background: white; padding: 16px;"
          ${ref(el => {
            if (!el || mounted) return;
            mounted = true;
            currentView = args.mount(el as HTMLElement);
          })}
        ></div>
        ${args.aside ? html`<div>${args.aside}</div>` : null}
      </div>
    </div>
  `;
}

export const BareProseMirror: Story = {
  render: () => {
    const schema = createSchema(false);

    return html`
      <div style="max-width: 960px; margin: 40px auto; padding: 0 20px;">
        ${renderEditorCard({
          title: '1. Bare ProseMirror',
          description:
            'Start with a tiny schema, default history/keymap plugins, and no QTI-specific behavior.',
          mount: host =>
            mountEditor({
              host,
              schema,
              initialContent: `
                <p>This is the smallest editor surface: paragraphs and marks only.</p>
                <p>Use this when you are still shaping the document model.</p>
              `,
            }),
        })}
      </div>
    `;
  },
};

export const AddInteractions: Story = {
  render: () => {
    const schema = createSchema(true);
    let view: EditorView | null = null;

    return html`
      <div style="max-width: 960px; margin: 40px auto; padding: 0 20px;">
        ${renderEditorCard({
          title: '2. Add QTI Interactions',
          description:
            'Extend the schema with interaction nodes and add authoring commands, while still staying in raw ProseMirror.',
          actions: () =>
            html`
              <button
                style="border: 0; border-radius: 999px; background: #111827; color: white; padding: 8px 14px; cursor: pointer;"
                @click=${() => {
                  if (!view) return;
                  insertChoiceInteraction(view.state, view.dispatch);
                  view.focus();
                }}
              >
                Insert Choice Interaction
              </button>
            `,
          mount: host => {
            view = mountEditor({
              host,
              schema,
              initialContent: `
                <p>Now the editor understands QTI interaction nodes.</p>
                <p>Use the button to insert a choice interaction at the cursor.</p>
              `,
            });
            return view;
          },
        })}
      </div>
    `;
  },
};

export const AddUtilitiesAndAttributes: Story = {
  render: () => {
    const schema = createSchema(true);
    const attributesEventTarget = new EventTarget();

    return html`
      <div style="max-width: 1100px; margin: 40px auto; padding: 0 20px;">
        ${renderEditorCard({
          title: '3. Add Block Select, Attr Sync, and Attributes UI',
          description:
            'Add generic editor-engine utilities from the ProseMirror layer and then attach the attributes panel as a separate UI consumer.',
          actions: currentView =>
            html`
              <button
                style="border: 0; border-radius: 999px; background: #2563eb; color: white; padding: 8px 14px; cursor: pointer;"
                @click=${() => {
                  if (!currentView) return;
                  insertChoiceInteraction(currentView.state, currentView.dispatch);
                  currentView.focus();
                }}
              >
                Insert Choice Interaction
              </button>
            `,
          mount: host =>
            mountEditor({
              host,
              schema,
              initialContent: `
                <qti-choice-interaction response-identifier="RESPONSE" max-choices="1" shuffle="true">
                  <qti-prompt><p>Select the correct answer.</p></qti-prompt>
                  <qti-simple-choice identifier="A"><p>Option A</p></qti-simple-choice>
                  <qti-simple-choice identifier="B"><p>Option B</p></qti-simple-choice>
                </qti-choice-interaction>
              `,
              plugins: [blockSelectPlugin, nodeAttrsSyncPlugin],
              onStateChange: (state, view) => {
                publishAttributesUpdate(attributesEventTarget, state);
                const panel = document.querySelector('qti-attributes-panel');
                if (panel) {
                  (panel as any).editorView = view;
                }
              },
            }),
          aside: html`
            <qti-attributes-panel
              ${ref(el => {
                if (!el) return;
                (el as any).eventTarget = attributesEventTarget;
              })}
            ></qti-attributes-panel>
          `,
        })}
      </div>
    `;
  },
};

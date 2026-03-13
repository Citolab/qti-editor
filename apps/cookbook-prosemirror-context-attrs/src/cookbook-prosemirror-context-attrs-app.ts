import './components/ui/qti-attributes-panel.js';
import './components/ui/qti-code-panel.js';
import './components/ui/qti-composer.js';
import './components/ui/qti-composer-metadata-form.js';

import { provide } from '@lit/context';
import { html, LitElement, type PropertyValues } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { customElement } from 'lit/decorators.js';
import { buildAssessmentItemXml, formatXml } from '@qti-editor/core/composer';
import { itemContext, itemContextVariables, type ItemContext } from '@qti-editor/core/item-context';
import {
  insertChoiceInteraction,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interactions-qti-choice';
import {
  insertExtendedTextInteraction,
  qtiExtendedTextInteractionNodeSpec,
} from '@qti-editor/interactions-qti-extended-text';
import {
  insertInlineChoiceInteraction,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
  qtiInlineChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-qti-inline-choice';
import {
  insertMatchInteraction,
  qtiMatchInteractionNodeSpec,
} from '@qti-editor/interactions-qti-match';
import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec,
} from '@qti-editor/interactions-qti-select-point';
import {
  insertTextEntryInteraction,
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interactions-qti-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
} from '@qti-editor/interactions-shared';
import { blockSelectPlugin } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-node-attrs-sync';
import { baseKeymap, toggleMark, wrapIn } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Dropdown, MenuItem, menuBar } from 'prosemirror-menu';
import { DOMParser as PMDOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import type { SidePanelEventDetail, SidePanelNodeDetail } from '@qti-editor/core/attributes';
import type { QtiCodeUpdateDetail } from '@qti-editor/core/code';
import type { MarkType, NodeSpec } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

type InsertAction = {
  id: string;
  label: string;
  command: Command;
};

const cookbookBaseNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
};

const cookbookQtiNodes: Record<string, NodeSpec> = {
  qtiChoiceInteraction: qtiChoiceInteractionNodeSpec,
  qtiPromptParagraph: qtiPromptParagraphNodeSpec,
  qtiPrompt: qtiPromptNodeSpec,
  imgSelectPoint: imgSelectPointNodeSpec,
  qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec,
  qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
  qtiInlineChoiceInteraction: qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceParagraph: qtiInlineChoiceParagraphNodeSpec,
  qtiInlineChoice: qtiInlineChoiceNodeSpec,
  qtiTextEntryInteraction: qtiTextEntryInteractionNodeSpec,
  qtiMatchInteraction: qtiMatchInteractionNodeSpec,
  qtiSimpleMatchSet: qtiSimpleMatchSetNodeSpec,
  qtiSimpleAssociableChoice: qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraph: qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiExtendedTextInteraction: qtiExtendedTextInteractionNodeSpec,
};

function createCookbookInsertActions(): InsertAction[] {
  return [
    { id: 'choice', label: 'Choice Interaction', command: insertChoiceInteraction },
    { id: 'inline-choice', label: 'Inline Choice', command: insertInlineChoiceInteraction },
    { id: 'text-entry', label: 'Text Entry', command: insertTextEntryInteraction },
    { id: 'select-point', label: 'Select Point', command: insertSelectPointInteraction },
    { id: 'match', label: 'Match Interaction', command: insertMatchInteraction },
    { id: 'extended-text', label: 'Extended Text', command: insertExtendedTextInteraction },
  ];
}

function collectSelectionNodesWithSchemaAttrs(state: EditorState): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { selection } = state;
  const { $from } = selection;
  const selectedNode = (selection as EditorState['selection'] & { node?: any }).node;

  if (selectedNode && Object.keys(selectedNode.type.spec.attrs ?? {}).length > 0) {
    nodes.push({
      type: selectedNode.type.name,
      attrs: selectedNode.attrs,
      pos: selection.from,
    });
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (Object.keys(node.type.spec.attrs ?? {}).length === 0) continue;
    const pos = $from.before(depth);
    if (nodes.some(existing => existing.pos === pos && existing.type === node.type.name)) continue;
    nodes.push({
      type: node.type.name,
      attrs: node.attrs,
      pos,
    });
  }

  return nodes;
}

function markIsActive(state: EditorState, markType: MarkType): boolean {
  const { from, to, empty } = state.selection;
  if (empty) {
    return !!markType.isInSet(state.storedMarks || state.selection.$from.marks());
  }
  return state.doc.rangeHasMark(from, to, markType);
}

const listNodes: Record<string, NodeSpec> = {
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { order: { default: 1 } },
    parseDOM: [
      {
        tag: 'ol',
        getAttrs: dom => ({ order: Number((dom as HTMLOListElement).getAttribute('start') || 1) }),
      },
    ],
    toDOM: node => ['ol', node.attrs.order === 1 ? {} : { start: node.attrs.order }, 0],
  },
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0],
  },
  list_item: {
    content: 'paragraph block*',
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  },
};

@customElement('cookbook-prosemirror-context-attrs-app')
export class CookbookProsemirrorContextAttrsApp extends LitElement {
  private editorView: EditorView | null = null;
  private readonly editorHostRef: Ref<HTMLDivElement> = createRef();
  private readonly attrsPanelRef = createRef<any>();
  private readonly codePanelRef = createRef<any>();
  private readonly attributesEventTarget = new EventTarget();
  private readonly codeEventTarget = new EventTarget();

  @provide({ context: itemContext })
  public itemState: ItemContext = {
    variables: itemContextVariables,
  };

  override createRenderRoot() {
    return this;
  }

  override firstUpdated() {
    if (!this.editorHostRef.value) return;

    const schema = new Schema({
      nodes: {
        ...cookbookBaseNodes,
        ...listNodes,
        ...cookbookQtiNodes,
      },
      marks: {
        strong: {
          parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }],
          toDOM: () => ['strong', 0],
        },
        em: {
          parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
          toDOM: () => ['em', 0],
        },
      },
    });

    const formatItems = [
      new MenuItem({
        label: 'Bold',
        title: 'Toggle bold',
        run: toggleMark(schema.marks.strong),
        active: state => markIsActive(state, schema.marks.strong),
      }),
      new MenuItem({
        label: 'Italic',
        title: 'Toggle italic',
        run: toggleMark(schema.marks.em),
        active: state => markIsActive(state, schema.marks.em),
      }),
      new MenuItem({
        label: 'Ordered List',
        title: 'Wrap in ordered list',
        run: wrapIn(schema.nodes.ordered_list),
        enable: state => wrapIn(schema.nodes.ordered_list)(state),
      }),
      new MenuItem({
        label: 'Unordered List',
        title: 'Wrap in unordered list',
        run: wrapIn(schema.nodes.bullet_list),
        enable: state => wrapIn(schema.nodes.bullet_list)(state),
      }),
    ];

    const insertItems = createCookbookInsertActions().map(
      item =>
        new MenuItem({
          label: item.label,
          title: item.label,
          run: item.command,
        })
    );

    const insertDropdown = new Dropdown(insertItems, {
      label: 'Insert',
      title: 'Insert interaction',
    });

    const initialDom = document.createElement('div');
    initialDom.innerHTML = '<p></p>';

    const state = EditorState.create({
      schema,
      doc: PMDOMParser.fromSchema(schema).parse(initialDom),
      plugins: [
        menuBar({ content: [[insertDropdown], formatItems], floating: false }),
        history(),
        blockSelectPlugin,
        nodeAttrsSyncPlugin,
        keymap(baseKeymap),
      ],
    });

    this.editorView = new EditorView(this.editorHostRef.value, {
      state,
      dispatchTransaction: tr => {
        if (!this.editorView) return;
        const nextState = this.editorView.state.apply(tr);
        this.editorView.updateState(nextState);
        this.publishAttributes(nextState);
        this.publishCode(nextState);
        this.publishItemContext(nextState);
      },
    });

    this.publishAttributes(this.editorView.state);
    this.publishCode(this.editorView.state);
    this.publishItemContext(this.editorView.state);
  }

  override updated(_changedProperties: PropertyValues) {
    if (this.attrsPanelRef.value) {
      this.attrsPanelRef.value.eventTarget = this.attributesEventTarget;
      this.attrsPanelRef.value.editorView = this.editorView;
    }

    if (this.codePanelRef.value) {
      this.codePanelRef.value.eventTarget = this.codeEventTarget;
      this.codePanelRef.value.mode = 'xml';
    }
  }

  override disconnectedCallback() {
    this.editorView?.destroy();
    this.editorView = null;
    super.disconnectedCallback();
  }

  private onMetadataChange(event: Event) {
    const detail = (event as CustomEvent<{ title: string; identifier: string }>).detail;
    this.itemState = {
      ...this.itemState,
      title: detail.title,
      identifier: detail.identifier,
    };
    this.requestUpdate();
    if (this.editorView) {
      this.publishCode(this.editorView.state);
    }
  }

  private publishAttributes(state: EditorState) {
    const nodes = collectSelectionNodesWithSchemaAttrs(state);
    const detail: SidePanelEventDetail = {
      nodes,
      activeNode: nodes[0] ?? null,
      open: Boolean(nodes[0]),
    };
    this.attributesEventTarget.dispatchEvent(new CustomEvent('qti:attributes:update', { detail }));
  }

  private publishItemContext(state: EditorState) {
    const serializer = DOMSerializer.fromSchema(state.schema);
    const fragment = serializer.serializeFragment(state.doc.content);
    const div = document.createElement('div');
    div.appendChild(fragment);
    const parsed = new DOMParser().parseFromString(
      `<qti-item-body>${div.innerHTML}</qti-item-body>`,
      'application/xml'
    );

    this.itemState = {
      ...this.itemState,
      itemBody: parsed,
    };
    this.requestUpdate();
  }

  private publishCode(state: EditorState) {
    const serializer = DOMSerializer.fromSchema(state.schema);
    const fragment = serializer.serializeFragment(state.doc.content);
    const div = document.createElement('div');
    div.appendChild(fragment);

    const parsed = new DOMParser().parseFromString(
      `<qti-item-body>${div.innerHTML}</qti-item-body>`,
      'application/xml'
    );

    const xml = formatXml(
      buildAssessmentItemXml({
        identifier: this.itemState.identifier,
        title: this.itemState.title,
        itemBody: parsed,
      })
    );

    const detail: QtiCodeUpdateDetail = {
      json: state.doc.toJSON(),
      html: div.innerHTML,
      xml,
      timestamp: Date.now(),
    };

    this.codeEventTarget.dispatchEvent(new CustomEvent('qti:code:update', { detail }));
  }

  override render() {
    return html`
      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="min-w-0 space-y-4">
          <h1 class="text-xl font-semibold">Cookbook: ProseMirror + Context + Attributes</h1>
          <p class="text-sm text-base-content/70">
            Pure ProseMirror editor, registry components for metadata/composer/attributes/code,
            and core QTI composer context.
          </p>
          <div class="card border border-base-300/50 bg-base-100 p-4">
            <div ${ref(this.editorHostRef)} class="min-h-80"></div>
          </div>
          <qti-code-panel ${ref(this.codePanelRef)} class="block w-full"></qti-code-panel>
          <qti-composer class="block w-full"></qti-composer>
        </div>

        <div class="min-w-0 space-y-4">
          <qti-composer-metadata-form
            .title=${this.itemState.title ?? ''}
            .identifier=${this.itemState.identifier ?? ''}
            @metadata-change=${this.onMetadataChange}
          ></qti-composer-metadata-form>
          <qti-attributes-panel ${ref(this.attrsPanelRef)}></qti-attributes-panel>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cookbook-prosemirror-context-attrs-app': CookbookProsemirrorContextAttrsApp;
  }
}

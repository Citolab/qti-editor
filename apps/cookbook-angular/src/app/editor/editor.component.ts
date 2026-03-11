import '../components/qti-attributes-panel.js';
import '../components/qti-code-panel.js';
import '../components/qti-composer-metadata-form.js';

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
} from '@angular/core';
import { buildAssessmentItemXml, formatXml } from '@qti-editor/core/composer';
import {
  insertChoiceInteraction,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interactions-qti-choice';
import {
  insertInlineChoiceInteraction,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
  qtiInlineChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-qti-inline-choice';
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
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
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

import type { ElementRef, OnDestroy } from '@angular/core';
import type { SidePanelEventDetail, SidePanelNodeDetail } from '@qti-editor/core/attributes';
import type { QtiCodeUpdateDetail } from '@qti-editor/core/code';
import type { MarkType, NodeSpec } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

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
    toDOM: node => ['ol', node.attrs['order'] === 1 ? {} : { start: node.attrs['order'] }, 0],
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

const qtiNodes: Record<string, NodeSpec> = {
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
};

function markIsActive(state: EditorState, markType: MarkType): boolean {
  const { from, to, empty } = state.selection;
  if (empty) return !!markType.isInSet(state.storedMarks || state.selection.$from.marks());
  return state.doc.rangeHasMark(from, to, markType);
}

function collectSelectionNodes(state: EditorState): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { selection } = state;
  const { $from } = selection;
  const selectedNode = (selection as EditorState['selection'] & { node?: any }).node;

  if (selectedNode && Object.keys(selectedNode.type.spec.attrs ?? {}).length > 0) {
    nodes.push({ type: selectedNode.type.name, attrs: selectedNode.attrs, pos: selection.from });
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (Object.keys(node.type.spec.attrs ?? {}).length === 0) continue;
    const pos = $from.before(depth);
    if (nodes.some(n => n.pos === pos && n.type === node.type.name)) continue;
    nodes.push({ type: node.type.name, attrs: node.attrs, pos });
  }

  return nodes;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Page header -->
    <div class="flex items-center justify-between py-4 border-b border-base-300 mb-6">
      <span class="text-sm font-semibold text-base-content/70 uppercase tracking-wide">QTI Editor</span>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-primary">Opslaan</button>
      </div>
    </div>

    <!-- Two-column layout -->
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] items-start">

      <!-- Main column -->
      <div class="space-y-4">
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div #editorHost></div>
        </div>
        <qti-code-panel #codePanel class="block"></qti-code-panel>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <qti-attributes-panel #attrsPanel class="block"></qti-attributes-panel>
      </div>
    </div>
  `,
})
export class EditorComponent implements OnDestroy {
  // Using a setter instead of ngAfterViewInit so the editor re-mounts
  // reliably after every HMR cycle (Angular may not re-fire ngAfterViewInit).
  private _editorHostEl: HTMLDivElement | null = null;

  @ViewChild('editorHost')
  set editorHostRef(ref: ElementRef<HTMLDivElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    if (el === this._editorHostEl) return;
    this._editorHostEl = el;
    this.editorView?.destroy();
    this.editorView = null;
    if (el) {
      // queueMicrotask defers until all @ViewChild setters have fired for this cycle
      queueMicrotask(() => {
        if (this._editorHostEl !== el) return;
        this.createEditor(el);
        this.initPanels();
      });
    }
  }

  @ViewChild('attrsPanel') private attrsPanel?: ElementRef;
  @ViewChild('codePanel') private codePanel?: ElementRef;
  @ViewChild('metadataForm') private metadataForm?: ElementRef;

  private editorView: EditorView | null = null;
  private readonly attributesEventTarget = new EventTarget();
  private readonly codeEventTarget = new EventTarget();
  private metadataChangeListener: ((e: Event) => void) | null = null;

  private itemTitle = '';
  private itemIdentifier = '';

  ngOnDestroy() {
    this.editorView?.destroy();
    this.editorView = null;
  }

  private createEditor(el: HTMLDivElement) {
    const schema = new Schema({
      nodes: { ...baseNodes, ...listNodes, ...qtiNodes },
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
        run: toggleMark(schema.marks['strong']),
        active: state => markIsActive(state, schema.marks['strong']),
      }),
      new MenuItem({
        label: 'Italic',
        title: 'Toggle italic',
        run: toggleMark(schema.marks['em']),
        active: state => markIsActive(state, schema.marks['em']),
      }),
      new MenuItem({
        label: 'Ordered List',
        title: 'Wrap in ordered list',
        run: wrapIn(schema.nodes['ordered_list']),
        enable: state => !!wrapIn(schema.nodes['ordered_list'])(state),
      }),
      new MenuItem({
        label: 'Unordered List',
        title: 'Wrap in unordered list',
        run: wrapIn(schema.nodes['bullet_list']),
        enable: state => !!wrapIn(schema.nodes['bullet_list'])(state),
      }),
    ];

    const insertActions: { label: string; command: Command }[] = [
      { label: 'Choice Interaction', command: insertChoiceInteraction },
      { label: 'Inline Choice', command: insertInlineChoiceInteraction },
      { label: 'Text Entry', command: insertTextEntryInteraction },
      { label: 'Select Point', command: insertSelectPointInteraction },
    ];

    const insertItems = insertActions.map(
      ({ label, command }) =>
        new MenuItem({ label, title: label, run: command }),
    );

    const insertDropdown = new Dropdown(insertItems, { label: 'Insert', title: 'Insert interaction' });

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

    this.editorView = new EditorView(el, {
      state,
      dispatchTransaction: tr => {
        if (!this.editorView) return;
        const nextState = this.editorView.state.apply(tr);
        this.editorView.updateState(nextState);
        this.publishAttributes(nextState);
        this.publishCode(nextState);
      },
    });

    this.publishAttributes(this.editorView.state);
    this.publishCode(this.editorView.state);
  }

  private initPanels() {
    if (this.attrsPanel) {
      this.attrsPanel.nativeElement.eventTarget = this.attributesEventTarget;
      this.attrsPanel.nativeElement.editorView = this.editorView;
    }

    if (this.codePanel) {
      this.codePanel.nativeElement.eventTarget = this.codeEventTarget;
      this.codePanel.nativeElement.mode = 'xml';
    }

    if (this.metadataForm) {
      // Remove previous listener before re-adding (handles HMR re-init)
      if (this.metadataChangeListener) {
        this.metadataForm.nativeElement.removeEventListener('metadata-change', this.metadataChangeListener);
      }
      this.metadataChangeListener = (e: Event) => {
        const { title, identifier } = (e as CustomEvent<{ title: string; identifier: string }>).detail;
        this.itemTitle = title;
        this.itemIdentifier = identifier;
        if (this.editorView) this.publishCode(this.editorView.state);
      };
      this.metadataForm.nativeElement.addEventListener('metadata-change', this.metadataChangeListener);
    }
  }

  private publishAttributes(state: EditorState) {
    const nodes = collectSelectionNodes(state);
    const detail: SidePanelEventDetail = {
      nodes,
      activeNode: nodes[0] ?? null,
      open: Boolean(nodes[0]),
    };
    this.attributesEventTarget.dispatchEvent(new CustomEvent('qti:attributes:update', { detail }));
  }

  private publishCode(state: EditorState) {
    const serializer = DOMSerializer.fromSchema(state.schema);
    const fragment = serializer.serializeFragment(state.doc.content);
    const div = document.createElement('div');
    div.appendChild(fragment);

    const parsed = new DOMParser().parseFromString(
      `<qti-item-body>${div.innerHTML}</qti-item-body>`,
      'application/xml',
    );

    const xml = formatXml(
      buildAssessmentItemXml({
        identifier: this.itemIdentifier,
        title: this.itemTitle,
        itemBody: parsed,
      }),
    );

    const detail: QtiCodeUpdateDetail = {
      json: state.doc.toJSON(),
      html: div.innerHTML,
      xml,
      timestamp: Date.now(),
    };

    this.codeEventTarget.dispatchEvent(new CustomEvent('qti:code:update', { detail }));
  }
}

import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import '@citolab/prose-qti-ui/components/attributes-panel';
import './blocks/code-panel/index.js';
import './blocks/preview-panel/index.js';
import './blocks/toolbar/index.js';
import './blocks/items-gutter/index.js';
import './blocks/items-navigator/index.js';


import './blocks/slash-menu/index.js';
import { provide, ContextProvider } from '@lit/context';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { LitElement, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { itemContext, itemContextVariables, type ItemContext, type PerItemMetadata } from '@citolab/prose-qti/integration/item-context';
import {
  blockSelectExtension,
  defineSemanticPasteExtension,
  nodeAttrsSyncExtension,
} from '@citolab/prose-extensions/prosekit-extensions';
import { createEditor, union, type Editor } from 'prosekit/core';
import { definePlaceholder } from 'prosekit/extensions/placeholder';
import { qtiEditorEventsExtension } from '@citolab/prose-qti/integration/events';
import { editorContext } from '@citolab/prose-qti-ui/editor-context';
import { notifyQtiI18nChanged, translateQti } from '@citolab/prose-qti/components/shared';
import {
  clearRecoverySites,
  findSchemaViolation,
  focusRecoverySite,
  listRecoverySites,
  salvageJsonDocument,
  setRecoverySites,
} from '@citolab/prose-qti/schema-recovery';

import { defineLocalStorageDocPersistenceExtension } from '../extensions/local-storage-doc-persistence-extension/extension.js';
import { readPersistedStateFromLocalStorage } from '../extensions/local-storage-doc-persistence-extension/index.js';
import {
  buildCompatibilityReport,
  buildUnreadableDocumentReport,
  readPersistedDoc,
  salvageReportSource,
  schemaGapReportSource,
  stampSchemaVersion,
  type CompatibilityReportSource,
} from '../lib/compatibility/index.js';
import { publishCompatibilityReport } from '../lib/compatibility/report-channel.js';
import { onRecoveryRequest, publishRecoveryMarkers } from '../lib/compatibility/recovery-channel.js';
import { registerLitEditorTableHandle } from './blocks/table-handle/index.js';
import { registerLitEditorDropIndicator } from './blocks/drop-indicator/index.js';
import { registerLitEditorBlockHandle } from './blocks/block-handle/index.js';
import { qtiCodePanelExtension } from './blocks/code-panel/index.js';
import { defineBasicExtension } from '../extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../extensions/qti-interactions-extension.js';
import { defineLockedHeaderExtension, LOCKED_HEADER_DEFAULT_CONTENT, ensureLockedHeader } from '../extensions/locked-header-extension.js';
import { defineItemDividerExtension } from '../extensions/item-divider-extension.js';
import { defineRecoveryMarkerExtension } from '../extensions/recovery-marker-extension.js';
import { defineSlashMenuGuardExtension } from '../extensions/slash-menu-guard-extension.js';
import { exportItem, exportJson, exportPackage, exportRoundtripXml, pickJsonFile } from '../lib/exportXml.js';
import {
  clearAutoSaveDoc,
  getActiveStorageScope,
  getAutoSaveKey,
  quarantineAutoSaveDoc,
} from '../lib/fileStore.js';
import { importRoundtripXml, openXmlFilePicker } from '../lib/importXml.js';

import type { CompatibilityReport } from '@citolab/prose-qti/interfaces';
import type { RecoverySite } from '@citolab/prose-qti/schema-recovery';
import type { NodeJSON } from 'prosekit/core';

function slugifyTitle(title: string): string {
  return title.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getLockedHeadingTitle(doc: any): string {
  const heading = doc?.childCount > 0 ? doc.child(0) : undefined;
  if (heading?.type?.name !== 'heading' || heading.attrs?.level !== 1) return '';
  return heading.textContent.trim();
}

const VOID_HTML_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link',
  'source', 'area', 'col', 'embed', 'param', 'track', 'wbr',
];

function toXmlCompatibleFragment(html: string): string {
  const voidTagPattern = new RegExp(`<(${VOID_HTML_TAGS.join('|')})(\\s[^<>]*?)?>`, 'gi');
  return html
    .replace(/&nbsp;/g, '&#160;') // XML doesn't define &nbsp;
    .replace(voidTagPattern, match => {
      if (match.endsWith('/>')) return match;
      return `${match.slice(0, -1)} />`;
    });
}

export class QtiEditorApp extends LitElement {
  @property({ type: String, reflect: true })
  override lang = 'en';

  @state()
  private _activeView: 'editor' | 'player' = 'editor';

  private editor: Editor;
  private editorRef: Ref<HTMLDivElement>;
  private composerEventTarget = new EventTarget();
  private _pendingCompatibilityReport: CompatibilityReport | undefined;
  private _pendingRecoverySites: readonly RecoverySite[] | undefined;
  private _stopListeningForRecoveryRequests: (() => void) | undefined;

  // ── Toolbar handoff ─────────────────────────────────────────────────────
  private _editorMounted = false;
  private _currentItemIndex = 0;
  private _itemCount = 1;
  private _docIdentifierAutogenerated = true;
  private readonly _docUuid = crypto.randomUUID();
  private _lockedHeadingTitle = '';

  private _trackCurrentItem = () => {
    const view = (this.editor as any).view;
    if (!view?.state) return;

    const { doc, selection } = view.state;
    const cursorPos = selection.from;
    const itemPositions: number[] = [1];

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'qtiItemDivider') {
        itemPositions.push(pos + node.nodeSize);
      }
    });

    let newIndex = 0;
    for (let i = itemPositions.length - 1; i >= 0; i--) {
      if (cursorPos >= itemPositions[i]) {
        newIndex = i;
        break;
      }
    }

    const changed = this._currentItemIndex !== newIndex || this._itemCount !== itemPositions.length;
    this._currentItemIndex = newIndex;
    this._itemCount = itemPositions.length;
    if (changed) this.requestUpdate();
  };

  /**
   * Listens for attribute-panel edits on the doc node. When the user types in the
   * panel's `title` field and the identifier is still auto-generated, regenerate
   * the slugged identifier. Any explicit edit to `identifier` switches off the
   * auto-generate flag for the rest of the session.
   */
  private onPanelAttributesChange = (event: Event) => {
    const detail = (event as CustomEvent<{ attrs: Record<string, unknown>; pos: number }>).detail;
    if (!detail || detail.pos !== -1) return; // doc node only

    const view = (this.editor as any).view;
    if (!view?.state) return;

    if ('identifier' in detail.attrs) {
      this._docIdentifierAutogenerated = false;
      return;
    }

    if (!('title' in detail.attrs) || !this._docIdentifierAutogenerated) return;
    const nextTitle = (detail.attrs.title as string) ?? '';
    const slug = slugifyTitle(nextTitle);
    const nextIdentifier = slug ? `${slug}-${this._docUuid}` : '';
    const currentIdentifier = (view.state.doc.attrs.identifier as string) ?? '';
    if (nextIdentifier === currentIdentifier) return;
    view.dispatch(view.state.tr.setDocAttribute('identifier', nextIdentifier));
  };

  private onViewChange = (event: Event) => {
    const detail = (event as CustomEvent<{ view: 'editor' | 'player' }>).detail;
    if (!detail) return;
    this._activeView = detail.view;
  };

  private _recomputeItems = () => {
    // editor.view is a throwing getter while the editor isn't mounted yet —
    // this listener can fire synchronously from a plugin view() during mount.
    let doc: any;
    try {
      doc = this.editor.view.state.doc;
    } catch {
      return;
    }

    const items: PerItemMetadata[] = [{
      title: (doc.attrs.title as string) ?? '',
      identifier: (doc.attrs.identifier as string) ?? '',
    }];
    doc.descendants((node: any) => {
      if (node.type.name === 'qtiItemDivider') {
        items.push({
          title: (node.attrs.title as string) ?? '',
          identifier: (node.attrs.identifier as string) ?? '',
        });
      }
    });

    const lockedHeadingTitle = getLockedHeadingTitle(doc);
    const sameLength = (this.itemContext.items?.length ?? 0) === items.length;
    const itemsUnchanged = sameLength && items.every((item, i) => {
      const prev = this.itemContext.items?.[i];
      return prev?.title === item.title && prev?.identifier === item.identifier;
    });
    if (itemsUnchanged && this._lockedHeadingTitle === lockedHeadingTitle) return;

    this._lockedHeadingTitle = lockedHeadingTitle;
    if (!itemsUnchanged) {
      this.itemContext = { ...this.itemContext, items };
    }
    this.dispatchEvent(new CustomEvent('qti:metadata:change', {
      detail: {
        title: items[0].title ?? '',
        identifier: items[0].identifier ?? '',
        lockedHeadingTitle,
      },
      bubbles: true,
      composed: true,
    }));
  };

  @provide({ context: itemContext })
  itemContext: ItemContext = {
    lang: 'en',
    variables: itemContextVariables,
    items: [{ identifier: '', title: '' }],
  };

  constructor() {
    super();
    const editorDocStorageKey = getAutoSaveKey();

    const extension = union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      defineItemDividerExtension(),
      defineLockedHeaderExtension(),
      defineRecoveryMarkerExtension(),
      defineSemanticPasteExtension(),
      defineSlashMenuGuardExtension(),
      // The placeholder extension is used to mark certain nodes (e.g. interaction content)
      // so the slash menu guard can detect them and suppress the menu when the cursor is inside.
      definePlaceholder({
        placeholder: (state) => {
          const $pos = state.selection.$anchor;
          for (let d = $pos.depth; d > 0; d--) {
            const placeholder = $pos.node(d).type.spec.placeholder;
            if (placeholder) return placeholder;
          }
          return translateQti('editor.placeholder', { target: this });
        }
      }),
      defineLocalStorageDocPersistenceExtension({ storageKey: editorDocStorageKey }),
      blockSelectExtension,
      nodeAttrsSyncExtension,
      qtiEditorEventsExtension({
        emitSelectionChanges: false,
        eventTarget: this.composerEventTarget,
      }),
      qtiCodePanelExtension({
        eventTarget: this.composerEventTarget,
      }),
    );

    const restoredState = readPersistedStateFromLocalStorage(editorDocStorageKey);
    const restoredContent = ensureLockedHeader(restoredState.doc);
    try {
      this.editor = createEditor({ extension, defaultContent: restoredContent });

      /*
       * Ask explicitly whether the document is actually legal.
       *
       * `createEditor` throws on an attribute the schema rejects, but it does NOT check structure —
       * neither it nor `EditorState.create` calls `Node.check()`. A node that changed from block to
       * inline therefore loads without complaint and only misbehaves later. Treat that as the load
       * failure it is, rather than editing a document the schema does not accept.
       */
      const violation = findSchemaViolation(this.editor.schema, restoredContent);
      if (violation) throw new Error(`${violation.stage}: ${violation.message}`);

      const compat = restoredState.compatibility;
      if (compat && compat.sourceVersion < compat.targetVersion) {
        this._pendingCompatibilityReport = buildCompatibilityReport([{
          id: 'startup-load',
          label: 'Loaded document',
          result: compat,
        }]);
      }
    } catch (error) {
      /*
       * Recover what is loadable rather than opening empty.
       *
       * A document usually fails over one node type the schema no longer has, and everything else in
       * it is still perfectly good — so salvage unwraps what it cannot represent and keeps the rest,
       * the way ProseMirror's DOM parser already does for HTML. The original is copied aside first,
       * because salvage is lossy by definition and the pre-salvage document is the only thing a
       * future migration step could be run against.
       */
      const scope = getActiveStorageScope();
      const reason = error instanceof Error ? error.message : String(error);
      const quarantined = quarantineAutoSaveDoc(scope, reason);

      // An editor built on the default content is the cheapest way to get at the schema, which
      // salvage needs and which is unavailable if createEditor threw.
      const probe = createEditor({ extension, defaultContent: LOCKED_HEADER_DEFAULT_CONTENT });
      const salvage = salvageJsonDocument(probe.schema, restoredContent);
      const recovered = ensureLockedHeader(salvage.document as NodeJSON);

      if (quarantined && !findSchemaViolation(probe.schema, recovered)) {
        this.editor = createEditor({ extension, defaultContent: recovered });
        window.localStorage.setItem(
          editorDocStorageKey,
          JSON.stringify(stampSchemaVersion(recovered)),
        );
        this._pendingCompatibilityReport = buildCompatibilityReport([
          salvageReportSource({ id: 'startup-salvage', label: 'Recovered document', outcome: salvage }),
        ]);
        /*
         * Hold the sites until the document is mounted.
         *
         * They are child-index paths into the salvaged document, and turning them into positions
         * needs the document to exist — which it does not until `updated()` mounts the editor. Note
         * `recovered` is `ensureLockedHeader`'s output, not salvage's: if the locked header had to be
         * re-imposed, every top-level index moved, and `resolveRecoverySites` is what notices (each
         * site carries the node type it expects and is discarded when it no longer matches).
         */
        this._pendingRecoverySites = salvage.sites;
      } else {
        // Nothing could be recovered — or the copy aside failed, in which case clearing would be a
        // deletion. Leave the document where it is and start clean.
        if (quarantined) clearAutoSaveDoc(scope);
        this.editor = probe;
      }
    }
    this.editorRef = createRef<HTMLDivElement>();

    // Provider for editor context - pass editor directly (ProseKit elements handle unmounted state)
    new ContextProvider(this, {
      context: editorContext,
      initialValue: this.editor,
    });

    // Register block-handle components
    registerLitEditorBlockHandle();
    registerLitEditorDropIndicator();
    registerLitEditorTableHandle()

    this.composerEventTarget.addEventListener('qti:content:change', event => {
      const detail = (event as CustomEvent<{ html?: string }>).detail;
      const xmlCompatibleHtml = toXmlCompatibleFragment(detail?.html ?? '');
      const parsed = new DOMParser().parseFromString(
        '<qti-item-body>' + xmlCompatibleHtml + '</qti-item-body>',
        'application/xml',
      );
      this.itemContext = {
        ...this.itemContext,
        lang: this.itemContext.lang,
        itemBody: parsed,
      };
      this._recomputeItems();
    });
  }

  override createRenderRoot() {
    return this;
  }

  override disconnectedCallback() {
    document.removeEventListener('selectionchange', this._trackCurrentItem);
    this._stopListeningForRecoveryRequests?.();
    this._stopListeningForRecoveryRequests = undefined;
    // Child menus and navigators clean up listeners from editor.view during
    // their own disconnection. Unmount after that custom-element reaction has
    // completed so cleanup never observes a destroyed view.
    setTimeout(() => {
      if (this.isConnected) return;
      this.editor.unmount();
      this._editorMounted = false;
    }, 0);
    super.disconnectedCallback();
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('lang')) {
      this.itemContext = {
        ...this.itemContext,
        lang: this.lang,
      };
      notifyQtiI18nChanged();
    }

    if (this.editorRef.value && !this._editorMounted) {
      this.editor.mount(this.editorRef.value);
      this._editorMounted = true;
      document.addEventListener('selectionchange', this._trackCurrentItem);
      const view = (this.editor as any).view;
      if (view?.state?.doc.attrs.identifier) this._docIdentifierAutogenerated = false;
      this._recomputeItems();
      this.requestUpdate(); // Re-render to pass editor.view to attributes panel
      // Defer past React's useEffect registration window.
      // updated() runs synchronously during React's DOM commit; useEffect
      // listeners aren't attached until after that commit completes.
      const pendingReport = this._pendingCompatibilityReport;
      this._pendingCompatibilityReport = undefined;
      this._markRecoverySites();
      this._listenForRecoveryRequests();
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('qti:editor:ready', {
          detail: { editor: this.editor },
          bubbles: true,
        }));
        if (pendingReport) publishCompatibilityReport(pendingReport);
      }, 0);
    }
  }

  /**
   * Marks the places salvage removed content from, and says which marks landed.
   *
   * Only the sites that resolved are announced. A site is discarded when the document no longer
   * matches what it expected — `ensureLockedHeader` re-imposing the locked prefix moves every
   * top-level index — and the notice must not offer "show me" for a marker that is not there.
   */
  private _markRecoverySites(): void {
    const sites = this._pendingRecoverySites;
    this._pendingRecoverySites = undefined;
    if (!sites?.length) return;
    this._markRecoverySitesNow(sites);
  }

  /** Marks these sites and no others, announcing the ones that resolved. */
  private _markRecoverySitesNow(sites: readonly RecoverySite[]): void {
    const view = this.editor.view;
    if (sites.length) setRecoverySites(sites)(view.state, view.dispatch);
    else clearRecoverySites()(view.state, view.dispatch);
    publishRecoveryMarkers(listRecoverySites(view.state).map(site => site.id));
  }

  /** The editor's half of the notice conversation: take me there, or clear them away. */
  private _listenForRecoveryRequests(): void {
    this._stopListeningForRecoveryRequests?.();
    this._stopListeningForRecoveryRequests = onRecoveryRequest(request => {
      const view = this.editor.view;
      if (request.type === 'clear') {
        clearRecoverySites()(view.state, view.dispatch);
        return;
      }
      if (focusRecoverySite(request.id)(view.state, view.dispatch)) view.focus();
    });
  }

  exportItem(fileName: string = 'item'): void {
    exportItem({
      node: this.editor.view.state.doc,
      lang: this.lang,
      items: this.itemContext.items,
      fileName,
    });
  }

  async exportPackage(fileName: string = 'item'): Promise<void> {
    await exportPackage({
      node: this.editor.view.state.doc,
      lang: this.lang,
      items: this.itemContext.items,
      fileName,
    });
  }


  exportJson(fileName: string = 'item'): void {
    exportJson(this.editor.view.state.doc, fileName);
  }

  /**
   * Imports a ProseMirror JSON document through the same pipeline a restored one goes through.
   *
   * It used to call `schema.nodeFromJSON` and show an alert when that threw, which meant a document
   * written before a schema change could be restored from localStorage but not imported from a file —
   * the same content, two verdicts. Now it is migrated, checked, salvaged if need be, and reported.
   */
  async importJson(): Promise<void> {
    let fileName = '';
    try {
      const picked = await pickJsonFile();
      fileName = picked.fileName;

      const migrated = readPersistedDoc(picked.value);
      if (!migrated.doc) throw new Error('The file does not contain a ProseMirror document.');

      const sources: CompatibilityReportSource[] = [];
      if (migrated.compatibility && migrated.compatibility.sourceVersion < migrated.compatibility.targetVersion) {
        sources.push({ id: 'import-json', label: fileName, result: migrated.compatibility });
      }
      this._applyImportedDoc(ensureLockedHeader(migrated.doc), { label: fileName, sources });
    } catch (error) {
      this._reportImportFailure(fileName || 'JSON', error);
    }
  }

  exportRoundtripXml(fileName: string = 'item'): void {
    exportRoundtripXml(this.editor.view.state.doc, fileName);
  }

  async importRoundtripXml(): Promise<void> {
    try {
      const imported = await importRoundtripXml();
      this._applyImportedDoc(ensureLockedHeader(imported.doc.toJSON()), {
        label: 'XML',
        sources: imported.gaps.changes.length
          ? [schemaGapReportSource({ id: 'import-roundtrip-xml', outcome: imported.gaps })]
          : [],
      });
    } catch (error) {
      this._reportImportFailure('XML', error);
    }
  }

  async importXml(): Promise<void> {
    try {
      const result = await openXmlFilePicker();
      this._applyImportedDoc(ensureLockedHeader(result.json), {
        label: result.metadata?.title,
        // The QTI standard is larger than any editor's schema, so an imported item routinely uses
        // elements this one cannot hold. That is normal — and it is still content the author put
        // there, so it gets said out loud rather than dropped on the floor.
        sources: result.gaps.changes.length
          ? [schemaGapReportSource({
            id: 'import-qti-xml',
            label: result.metadata?.title,
            outcome: result.gaps,
          })]
          : [],
      });

      // Update metadata if present
      if (result.metadata) {
        if (result.metadata.identifier) this._docIdentifierAutogenerated = false;
        const view = (this.editor as any).view;
        if (view?.state) {
          const tr = view.state.tr;
          if (result.metadata.title) tr.setDocAttribute('title', result.metadata.title);
          if (result.metadata.identifier) tr.setDocAttribute('identifier', result.metadata.identifier);
          view.dispatch(tr);
        }
        this._recomputeItems();
      }
    } catch (error) {
      this._reportImportFailure('QTI XML', error);
    }
  }

  /**
   * Puts an imported document in the editor, salvaging it first if the schema will not take it.
   *
   * Shared by all three import paths because they had drifted into three different answers to the
   * same question. Salvage runs here rather than in each importer for the same reason it runs on
   * startup: an import that fails whole over one unsupported node is worse for the user than one
   * that lands with a list of what it could not keep.
   */
  private _applyImportedDoc(
    doc: NodeJSON,
    context: { label?: string; sources: CompatibilityReportSource[] },
  ): void {
    const sources = [...context.sources];
    let content = doc;
    let sites: readonly RecoverySite[] = [];

    if (findSchemaViolation(this.editor.schema, content)) {
      const salvage = salvageJsonDocument(this.editor.schema, content);
      const recovered = ensureLockedHeader(salvage.document as NodeJSON);
      const stillBroken = findSchemaViolation(this.editor.schema, recovered);
      if (stillBroken) throw new Error(`${stillBroken.stage}: ${stillBroken.message}`);

      content = recovered;
      sites = salvage.sites;
      sources.push(salvageReportSource({ id: 'import-salvage', label: context.label, outcome: salvage }));
    }

    this.editor.setContent(content);

    // Write the imported doc to localStorage immediately so saveFile() reads
    // the correct content without waiting for the persistence plugin's debounce.
    localStorage.setItem(getAutoSaveKey(), JSON.stringify(stampSchemaVersion(content)));

    // Notify the React layer (dirty state, auto-save status) that content changed.
    document.dispatchEvent(new CustomEvent('qti:content:change', { bubbles: true }));

    // Always set, even when empty: an import replaces the document, so markers left over from the
    // previous one would point into content that is no longer there.
    this._markRecoverySitesNow(sites);
    if (sources.length) publishCompatibilityReport(buildCompatibilityReport(sources));
  }

  /**
   * Reports an import that could not be completed at all.
   *
   * Through the notice rather than `alert()`, which is where these used to go: an alert says
   * "Failed to import JSON file", blocks the page, and leaves nothing behind to read twice.
   */
  private _reportImportFailure(label: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    // A cancelled file picker is not a failure; nothing was asked for and nothing happened.
    if (reason === 'No file selected') return;
    console.error(`Failed to import ${label}:`, error);
    publishCompatibilityReport(buildUnreadableDocumentReport({
      id: 'import-failed',
      label,
      reason,
    }));
  }

  override render() {
    // Only render components that need the editor after it's mounted
    const editorComponents = this._editorMounted ? html`
      <lit-editor-toolbar
        .editor=${this.editor}
        .activeView=${this._activeView}
        class="block w-full shrink-0"
        @qti:view:change=${this.onViewChange}
      ></lit-editor-toolbar>
    ` : html`<div class="block w-full shrink-0" style="padding-left: 1rem; padding-right: 1rem; height: 40px;"></div>`;

    const editorPaneStyle = this._activeView === 'editor' ? '' : 'display: none;';
    const playerPaneStyle = this._activeView === 'player' ? '' : 'display: none;';

    return html`
      ${editorComponents}
      <div class="flex flex-1 min-h-0 gap-4 p-4 overflow-hidden">
        <div class="editor-card relative flex min-w-0 flex-1 flex-col rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden" style=${editorPaneStyle}>
          ${this._editorMounted ? html`<qti-items-gutter .editor=${this.editor}></qti-items-gutter>` : ''}
          <div class="relative flex-1 min-h-0 overflow-auto" style="padding-left: 3rem;">
            <div ${ref(this.editorRef)} class="card min-h-full w-full max-w-none px-6 py-6 prose" style="padding-left: 1rem;"></div>
            <lit-editor-block-handle></lit-editor-block-handle>
            <lit-editor-drop-indicator></lit-editor-drop-indicator>
            <lit-editor-table-handle></lit-editor-table-handle>
          </div>
          ${this._editorMounted ? html`<qti-slash-menu .editor=${this.editor} style="display: contents;"></qti-slash-menu>` : ''}
        </div>
        ${this._editorMounted ? html`<qti-preview-panel
          class="relative flex min-w-0 flex-1 flex-col rounded-md border border-solid border-gray-200 bg-white text-black shadow-sm overflow-hidden"
          style=${playerPaneStyle}
          .active=${this._activeView === 'player'}
          .editor=${this.editor}
        ></qti-preview-panel>` : ''}
        ${this._activeView === 'editor' ? html`<div class="w-80 shrink-0 overflow-y-auto">
          ${this._editorMounted ? html`<qti-attributes-panel
            class="block w-full sticky top-0"
            @qti:attributes:change=${this.onPanelAttributesChange}
          ></qti-attributes-panel>` : ''}
          ${this._editorMounted ? html`<qti-items-navigator
            .editor=${this.editor}
            class="block w-full mt-5"
          ></qti-items-navigator>` : ''}
        </div>` : ''}
      </div>
    `;
  }
}

// Register and initialize
customElements.define('qti-editor-app', QtiEditorApp);

declare global {
  interface HTMLElementTagNameMap {
    'qti-editor-app': QtiEditorApp;
  }
}

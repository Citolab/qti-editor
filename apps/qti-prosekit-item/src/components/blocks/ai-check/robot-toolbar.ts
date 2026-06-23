import { ContextConsumer } from '@lit/context';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import { parseHtmlToDoc, serializeDocToHtml } from '@citolab/prose-ai';
import { editorContext } from '@citolab/prose-qti/integration/editor-context';
import { html, LitElement, nothing, type PropertyDeclaration } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { defineUpdateHandler, type Editor } from 'prosekit/core';
import { Slice } from 'prosekit/pm/model';

import { aiSettings, ensureConfigured } from '../../../ai/settings';
import { streamFromOpenAI } from '../../../ai/client';
import { AI_PROMPTS, type AiPrompt } from '../../../ai/prompts';
import { commitRecorder, type AiExtension } from '../../../extensions/ai-extension';

class LitAiCheckToolbar extends LitElement {
  static override properties = {
    openMenu: { state: true, attribute: false } satisfies PropertyDeclaration<boolean>,
    running: { state: true, attribute: false } satisfies PropertyDeclaration<boolean>,
  };

  private openMenu = false;
  private running = false;

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  private removeUpdateExtension?: VoidFunction;
  private robotButtonRef: Ref<HTMLButtonElement> = createRef<HTMLButtonElement>();
  private menuRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();
  private cleanupAutoUpdate?: () => void;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.attachEditorListener();
  }

  override disconnectedCallback() {
    this.detachEditorListener();
    this.stopAutoUpdate();
    super.disconnectedCallback();
  }

  override updated() {
    this.attachEditorListener();
    const menuEl = this.menuRef.value;
    const anchor = this.robotButtonRef.value;
    if (!menuEl || !anchor) return;
    const isOpen = menuEl.matches(':popover-open');
    if (this.openMenu && !isOpen) {
      menuEl.showPopover();
      this.startAutoUpdate(anchor, menuEl);
    } else if (!this.openMenu && isOpen) {
      menuEl.hidePopover();
      this.stopAutoUpdate();
    }
  }

  private attachEditorListener() {
    if (this.removeUpdateExtension) return;
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor) return;
    this.removeUpdateExtension = editor.use(
      defineUpdateHandler(() => this.requestUpdate())
    );
  }

  private detachEditorListener() {
    this.removeUpdateExtension?.();
    this.removeUpdateExtension = undefined;
  }

  private startAutoUpdate(anchor: HTMLElement, menuEl: HTMLElement) {
    this.stopAutoUpdate();
    this.cleanupAutoUpdate = autoUpdate(anchor, menuEl, async () => {
      const { x, y } = await computePosition(anchor, menuEl, {
        strategy: 'fixed',
        placement: 'bottom-start',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      });
      Object.assign(menuEl.style, { left: `${x}px`, top: `${y}px` });
    });
  }

  private stopAutoUpdate() {
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = undefined;
  }

  private onToggleMenu = (event: ToggleEvent) => {
    if (event.newState === 'closed' && this.openMenu) {
      this.openMenu = false;
    }
  };

  private toggleMenu = () => {
    this.openMenu = !this.openMenu;
  };

  private async runPrompt(prompt: AiPrompt) {
    if (this.running) return;
    const editor = this.editorConsumer.value as Editor<AiExtension> | undefined;
    if (!editor) return;
    if (!ensureConfigured()) return;

    this.openMenu = false;
    this.running = true;
    const view = editor.view;
    const from = 0;
    const to = view.state.doc.content.size;

    const originalHtml = serializeDocToHtml(editor);

    const controller = new AbortController();

    try {
      let htmlBuffer = '';
      await streamFromOpenAI({
        endpoint: aiSettings.getEndpoint(),
        apiKey: aiSettings.getApiKey(),
        model: aiSettings.getModel(),
        prompt: `${prompt.instruction}\n\n---\n${originalHtml}`,
        write: (chunk: string) => {
          htmlBuffer += chunk;
        },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      commitRecorder.init(view.state.doc);

      // Parse as a full doc node, then use the resulting closed fragment
      // (openStart=0, openEnd=0) to replace the editor's content.
      const parsed = parseHtmlToDoc(editor, htmlBuffer);
      const slice = new Slice(parsed.content, 0, 0);
      const tr = view.state.tr.replace(from, to, slice);
      view.dispatch(tr);

      const commit = commitRecorder.commit();
      if (commit) {
        editor.commands.addAiDiff(commit);
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.error('AI check failed:', error);
      }
      commitRecorder.init(view.state.doc);
    } finally {
      this.running = false;
    }
  }

  override render() {
    const checkPrompts = AI_PROMPTS.filter(p => p.category === 'check');
    return html`
      <button
        ${ref(this.robotButtonRef)}
        type="button"
        @click=${this.toggleMenu}
        ?disabled=${this.running}
        title="AI Review — scan the whole document"
        class="flex items-center justify-center rounded-md p-2 min-w-9 min-h-9 text-gray-900 hover:bg-gray-100 disabled:opacity-50"
      >
        ${this.running
          ? html`<div class="i-lucide-loader-circle size-5 block animate-spin"></div>`
          : html`<div class="i-lucide-bot size-5 block"></div>`}
        <span class="sr-only">AI Review</span>
      </button>

      <div
        ${ref(this.menuRef)}
        popover="auto"
        @toggle=${this.onToggleMenu}
        class="ai-check-toolbar-menu flex flex-col min-w-44 rounded-md border border-gray-200 bg-white p-1 shadow"
        style="position: fixed; margin: 0;"
      >
        ${checkPrompts.map(
          prompt => html`
            <button
              type="button"
              @click=${() => this.runPrompt(prompt)}
              class="text-left px-3 py-1 text-sm rounded hover:bg-gray-100"
            >
              ${prompt.label}
            </button>
          `
        )}
        ${checkPrompts.length === 0 ? html`<div class="text-xs text-gray-400 px-2 py-1">No prompts</div>` : nothing}
      </div>
    `;
  }
}

export function registerLitAiCheckToolbar() {
  if (customElements.get('lit-ai-check-toolbar')) return;
  customElements.define('lit-ai-check-toolbar', LitAiCheckToolbar);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ai-check-toolbar': LitAiCheckToolbar;
  }
}

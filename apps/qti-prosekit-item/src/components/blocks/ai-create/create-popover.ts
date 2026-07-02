import { ContextConsumer } from '@lit/context';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type ReferenceElement,
} from '@floating-ui/dom';
import {
  parseHtmlToDoc,
  parseHtmlToSlice,
  serializeRangeToHtml,
} from '@citolab/prose-ai';
import { editorContext } from '@citolab/prose-qti-ui/editor-context';
import { html, LitElement, nothing, type PropertyDeclaration } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { Selection as PmSelection } from 'prosekit/pm/state';

import { aiSettings, ensureConfigured } from '../../../ai/settings';
import { streamFromOpenAI } from '../../../ai/client';

import type { Editor } from 'prosekit/core';
import type { AiCreateRequestDetail, AiPrompt } from '../../../ai/prompts';

interface CreateState {
  from: number;
  to: number;
  prompt: AiPrompt;
  html: string;
  streaming: boolean;
  controller: AbortController;
}

function rangeReference(editor: Editor, from: number, to: number): ReferenceElement {
  return {
    getBoundingClientRect: () => {
      const fromCoords = editor.view.coordsAtPos(from);
      const toCoords = editor.view.coordsAtPos(to);
      const left = Math.min(fromCoords.left, toCoords.left);
      const right = Math.max(fromCoords.right, toCoords.right);
      const top = Math.min(fromCoords.top, toCoords.top);
      const bottom = Math.max(fromCoords.bottom, toCoords.bottom);
      return new DOMRect(left, top, right - left, bottom - top);
    },
    contextElement: editor.view.dom,
  };
}

class LitAiCreateResult extends LitElement {
  static override properties = {
    state: { state: true, attribute: false } satisfies PropertyDeclaration<CreateState | null>,
  };

  private state: CreateState | null = null;
  private popoverRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  private cleanupAutoUpdate?: () => void;
  private requestListener?: (event: Event) => void;
  private currentReference?: ReferenceElement;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.requestListener = (event: Event) => {
      const detail = (event as CustomEvent<AiCreateRequestDetail>).detail;
      void this.start(detail);
    };
    document.addEventListener('ai-create-request', this.requestListener);
  }

  override disconnectedCallback() {
    if (this.requestListener) {
      document.removeEventListener('ai-create-request', this.requestListener);
    }
    this.requestListener = undefined;
    this.stopAutoUpdate();
    this.state?.controller.abort();
    super.disconnectedCallback();
  }

  override updated() {
    const el = this.popoverRef.value;
    if (!el) return;
    const open = this.state !== null;
    const isOpen = el.matches(':popover-open');
    if (open && !isOpen) {
      el.showPopover();
      this.startAutoUpdate(el);
    } else if (!open && isOpen) {
      el.hidePopover();
      this.stopAutoUpdate();
    } else if (open) {
      this.startAutoUpdate(el);
    }
  }

  private startAutoUpdate(floatingEl: HTMLElement) {
    this.stopAutoUpdate();
    const reference = this.currentReference;
    if (!reference) return;
    this.cleanupAutoUpdate = autoUpdate(reference, floatingEl, async () => {
      const { x, y } = await computePosition(reference, floatingEl, {
        strategy: 'fixed',
        placement: 'bottom-start',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
      });
      Object.assign(floatingEl.style, { left: `${x}px`, top: `${y}px` });
    });
  }

  private stopAutoUpdate() {
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = undefined;
  }

  private async start(detail: AiCreateRequestDetail) {
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor) return;
    if (!ensureConfigured()) return;

    this.state?.controller.abort();

    this.currentReference = rangeReference(editor, detail.from, detail.to);
    const controller = new AbortController();
    this.state = {
      from: detail.from,
      to: detail.to,
      prompt: detail.prompt,
      html: '',
      streaming: true,
      controller,
    };

    const originalHtml = serializeRangeToHtml(editor, detail.from, detail.to);

    const fullInstruction =
      'You will receive one or more HTML elements. Return the exact same ' +
      'elements, in the same order, with the same tag names. Do not invent ' +
      'or add any element that was not in the input — no titles, no ' +
      'headings, no wrappers. Only rewrite the text inside each element. ' +
      'If the input is a single <p>, the output must be a single <p>.\n\n' +
      `Operation to apply to the text inside each element:\n${detail.prompt.instruction}`;

    try {
      await streamFromOpenAI({
        endpoint: aiSettings.getEndpoint(),
        apiKey: aiSettings.getApiKey(),
        model: aiSettings.getModel(),
        prompt: `${fullInstruction}\n\n---\n${originalHtml}`,
        write: (chunk: string) => {
          if (this.state && this.state.controller === controller) {
            this.state = { ...this.state, html: this.state.html + chunk };
          }
        },
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.error('AI create failed:', error);
      }
    } finally {
      if (this.state && this.state.controller === controller) {
        this.state = { ...this.state, streaming: false };
      }
    }
  }

  private replace = () => {
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor || !this.state) return;
    const { from, to } = this.state;
    const $from = editor.view.state.doc.resolve(from);
    const slice = parseHtmlToSlice(editor, this.state.html, $from);
    const tr = editor.view.state.tr.replaceRange(from, to, slice);
    tr.setSelection(PmSelection.near(tr.doc.resolve(from)));
    editor.view.dispatch(tr);
    this.close();
  };

  private addBelow = () => {
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor || !this.state) return;
    const { to } = this.state;
    const parsed = parseHtmlToDoc(editor, this.state.html);
    const $to = editor.view.state.doc.resolve(to);
    const insertPos = $to.after(1);
    const tr = editor.view.state.tr.insert(insertPos, parsed.content);
    tr.setSelection(PmSelection.near(tr.doc.resolve(insertPos)));
    editor.view.dispatch(tr);
    this.close();
  };

  private cancel = () => {
    this.state?.controller.abort();
    this.close();
  };

  private tryAgain = () => {
    if (!this.state) return;
    void this.start({
      from: this.state.from,
      to: this.state.to,
      prompt: this.state.prompt,
    });
  };

  private close() {
    this.state?.controller.abort();
    this.state = null;
    this.currentReference = undefined;
  }

  override render() {
    const s = this.state;
    return html`
      <div
        ${ref(this.popoverRef)}
        popover="manual"
        class="ai-create-popover flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
        style="position: fixed; width: 32rem; max-width: 90vw;"
      >
        ${s
          ? html`
              <div class="text-xs uppercase tracking-wide text-gray-500">
                ${s.prompt.label}${s.streaming ? ' · generating…' : ''}
              </div>
              <div
                class="ai-create-preview max-h-64 overflow-auto rounded border border-gray-200 p-2 text-sm"
                .innerHTML=${s.html || (s.streaming ? '<em class="text-gray-400">…</em>' : '')}
              ></div>
              <div class="flex gap-2 justify-end">
                <button
                  type="button"
                  @click=${this.cancel}
                  class="px-3 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click=${this.tryAgain}
                  ?disabled=${s.streaming}
                  class="px-3 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  Try again
                </button>
                <button
                  type="button"
                  @click=${this.addBelow}
                  ?disabled=${s.streaming || !s.html}
                  class="px-3 py-1 rounded text-sm bg-gray-900 text-white hover:bg-gray-900/90 disabled:opacity-50"
                >
                  Add below
                </button>
                <button
                  type="button"
                  @click=${this.replace}
                  ?disabled=${s.streaming || !s.html}
                  class="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Replace
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

export function registerLitAiCreateResult() {
  if (customElements.get('lit-ai-create-result')) return;
  customElements.define('lit-ai-create-result', LitAiCreateResult);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ai-create-result': LitAiCreateResult;
  }
}

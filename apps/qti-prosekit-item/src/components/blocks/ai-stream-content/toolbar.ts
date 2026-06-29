import { ContextConsumer } from '@lit/context';
import { streamContent } from '@citolab/prose-ai';
import { editorContext } from '@citolab/prose-qti-ui/editor-context';
import { html, LitElement, nothing } from 'lit';
import type { Editor } from 'prosekit/core';

import { aiSettings, DEFAULT_MODEL } from '../../../ai/settings';
import { streamFromOpenAI } from '../../../ai/client';

export class LitAiStreamContentToolbar extends LitElement {
  static override properties = {
    apiKey: { state: true },
    model: { state: true },
    endpoint: { state: true },
    prompt: { state: true },
    streaming: { state: true },
  };

  private apiKey = '';
  private model = DEFAULT_MODEL;
  private endpoint = '';
  private prompt = 'Write a short article about prosemirror.';
  private streaming = false;
  private abortController: AbortController | null = null;

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.apiKey = aiSettings.getApiKey();
    this.model = aiSettings.getModel();
    this.endpoint = aiSettings.getEndpoint();
    this.classList.add('contents');
  }

  private onApiKeyInput = (event: Event): void => {
    this.apiKey = (event.target as HTMLInputElement).value;
    aiSettings.setApiKey(this.apiKey);
  };

  private onModelInput = (event: Event): void => {
    this.model = (event.target as HTMLInputElement).value;
    aiSettings.setModel(this.model);
  };

  private onEndpointInput = (event: Event): void => {
    this.endpoint = (event.target as HTMLInputElement).value;
    aiSettings.setEndpoint(this.endpoint);
  };

  private onPromptInput = (event: Event): void => {
    this.prompt = (event.target as HTMLInputElement).value;
  };

  private onSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor || !this.apiKey || !this.endpoint || !this.prompt || this.streaming) return;

    const controller = new AbortController();
    this.abortController = controller;
    this.streaming = true;

    const { from, to } = editor.view.state.selection;
    try {
      await streamContent(editor.view, {
        from,
        to,
        signal: controller.signal,
        onStream: write =>
          streamFromOpenAI({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            model: this.model || DEFAULT_MODEL,
            prompt: this.prompt,
            write,
            signal: controller.signal,
          }),
      });
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.error('streamContent failed:', error);
      }
    } finally {
      if (this.abortController === controller) this.abortController = null;
      this.streaming = false;
    }
  };

  private onStop = (): void => {
    this.abortController?.abort();
  };

  override render() {
    const editor = this.editorConsumer.value as Editor | undefined;
    if (!editor) return nothing;

    const inputCls = 'px-2 py-1 rounded border border-gray-300 bg-transparent text-sm';

    return html`
      <form @submit=${this.onSubmit} class="flex flex-col items-stretch gap-2 p-3">
        <input
          type="url"
          autocomplete="off"
          spellcheck="false"
          placeholder="API endpoint URL (stored in localStorage)"
          .value=${this.endpoint}
          @input=${this.onEndpointInput}
          class="${inputCls} w-full"
        />
        <input
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="API key (stored in localStorage)"
          .value=${this.apiKey}
          @input=${this.onApiKeyInput}
          class="${inputCls} w-full"
        />
        <div class="flex gap-2 items-center w-full">
          <input
            type="text"
            spellcheck="false"
            placeholder="Model (default: ${DEFAULT_MODEL})"
            .value=${this.model}
            @input=${this.onModelInput}
            class="${inputCls} w-40 shrink-0"
          />
          <input
            type="text"
            placeholder="Prompt the AI…"
            .value=${this.prompt}
            @input=${this.onPromptInput}
            class="${inputCls} flex-1"
          />
          ${this.streaming
            ? html`<button
                type="button"
                @click=${this.onStop}
                class="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Stop
              </button>`
            : html`<button
                type="submit"
                ?disabled=${!this.apiKey || !this.endpoint || !this.prompt}
                class="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate
              </button>`}
        </div>
      </form>
    `;
  }
}

export function registerLitAiStreamContentToolbar(): void {
  if (customElements.get('lit-ai-stream-content-toolbar')) return;
  customElements.define('lit-ai-stream-content-toolbar', LitAiStreamContentToolbar);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ai-stream-content-toolbar': LitAiStreamContentToolbar;
  }
}

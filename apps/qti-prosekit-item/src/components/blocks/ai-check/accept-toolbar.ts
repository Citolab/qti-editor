import { ContextConsumer } from '@lit/context';
import { aiDiffPluginKey } from '@citolab/prose-ai';
import { editorContext } from '@citolab/prose-qti-ui/editor-context';
import { html, LitElement, nothing } from 'lit';
import { defineUpdateHandler, type Editor } from 'prosekit/core';

import type { AiExtension } from '../../../extensions/ai-extension';

class LitAiCheckAcceptToolbar extends LitElement {
  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  private removeUpdateExtension?: VoidFunction;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.attachEditorListener();
  }

  override disconnectedCallback() {
    this.detachEditorListener();
    super.disconnectedCallback();
  }

  override updated() {
    this.attachEditorListener();
  }

  private attachEditorListener() {
    this.detachEditorListener();
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

  override render() {
    const editor = this.editorConsumer.value as Editor<AiExtension> | undefined;
    if (!editor) return nothing;

    const diffs = aiDiffPluginKey.getState(editor.state)?.diffs ?? [];
    const remaining = diffs.reduce(
      (n, d) => n + d.fragments.filter(f => f.fromB <= f.toB).length,
      0
    );
    if (remaining === 0) return nothing;

    const label = `${remaining} AI suggestion${remaining === 1 ? '' : 's'}:`;

    return html`
      <div
        data-testid="ai-check-accept-toolbar"
        class="sticky bottom-2 mx-auto mt-2 flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow"
        style="max-width: max-content;"
      >
        <span class="text-sm text-gray-600">${label}</span>
        <button
          type="button"
          @click=${() => editor.commands.acceptAiDiff()}
          class="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
        >
          Accept all
        </button>
        <button
          type="button"
          @click=${() => editor.commands.rejectAiDiff()}
          class="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
        >
          Reject all
        </button>
      </div>
    `;
  }
}

export function registerLitAiCheckAcceptToolbar() {
  if (customElements.get('lit-ai-check-accept-toolbar')) return;
  customElements.define('lit-ai-check-accept-toolbar', LitAiCheckAcceptToolbar);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ai-check-accept-toolbar': LitAiCheckAcceptToolbar;
  }
}

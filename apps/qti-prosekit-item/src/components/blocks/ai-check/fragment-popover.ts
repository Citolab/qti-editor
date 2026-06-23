import { ContextConsumer } from '@lit/context';
import {
  AI_DIFF_CHANGE_INDEX_ATTR,
  AI_DIFF_ID_ATTR,
  aiDiffPluginKey,
} from '@citolab/prose-ai';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type ReferenceElement,
} from '@floating-ui/dom';
import { editorContext } from '@citolab/prose-qti/integration/editor-context';
import { html, LitElement, nothing, type PropertyDeclaration } from 'lit';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';
import { defineUpdateHandler, type Editor } from 'prosekit/core';

import type { AiExtension } from '../../../extensions/ai-extension';

interface PopoverState {
  diffId: string;
  changeIndex: number;
  reference: ReferenceElement;
}

class LitAiCheckFragmentPopover extends LitElement {
  static override properties = {
    state: { state: true, attribute: false } satisfies PropertyDeclaration<PopoverState | null>,
  };

  private state: PopoverState | null = null;
  private popoverRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();

  private editorConsumer = new ContextConsumer(this, {
    context: editorContext,
    subscribe: true,
  });

  private removeUpdateExtension?: VoidFunction;
  private clickHandler?: (event: MouseEvent) => void;
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
    const reference = this.state?.reference;
    if (!reference) return;
    this.cleanupAutoUpdate = autoUpdate(reference, floatingEl, async () => {
      const { x, y } = await computePosition(reference, floatingEl, {
        strategy: 'fixed',
        placement: 'top',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      });
      Object.assign(floatingEl.style, { left: `${x}px`, top: `${y}px` });
    });
  }

  private stopAutoUpdate() {
    this.cleanupAutoUpdate?.();
    this.cleanupAutoUpdate = undefined;
  }

  private attachEditorListener() {
    const editor = this.editorConsumer.value as Editor<AiExtension> | undefined;
    if (!editor) return;

    if (!this.clickHandler) {
      this.clickHandler = (event: MouseEvent) => this.handleEditorClick(event);
      document.addEventListener('click', this.clickHandler, true);
    }

    if (!this.removeUpdateExtension) {
      this.removeUpdateExtension = editor.use(
        defineUpdateHandler(view => {
          if (this.state) {
            const diffs = aiDiffPluginKey.getState(view.state)?.diffs ?? [];
            const stillActive = diffs.some(
              d =>
                d.id === this.state!.diffId &&
                d.fragments.some(f => f.index === this.state!.changeIndex)
            );
            if (!stillActive) this.state = null;
          }
          this.requestUpdate();
        })
      );
    }
  }

  private detachEditorListener() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
    }
    this.clickHandler = undefined;
    this.removeUpdateExtension?.();
    this.removeUpdateExtension = undefined;
  }

  private handleEditorClick(event: MouseEvent) {
    const raw = event.target as Node | null;
    if (!raw) return;
    const startEl =
      raw.nodeType === 1 ? (raw as Element) : (raw.parentElement as Element | null);
    if (!startEl) return;
    const target = startEl.closest(`[${AI_DIFF_CHANGE_INDEX_ATTR}]`) as HTMLElement | null;
    if (!target) return;

    const diffId = target.getAttribute(AI_DIFF_ID_ATTR);
    const changeIndexAttr = target.getAttribute(AI_DIFF_CHANGE_INDEX_ATTR);
    if (!diffId || changeIndexAttr === null) return;

    event.stopPropagation();
    event.preventDefault();
    this.state = {
      diffId,
      changeIndex: Number(changeIndexAttr),
      reference: target,
    };
  }

  private onToggle = (event: ToggleEvent) => {
    if (event.newState === 'closed' && this.state) {
      this.state = null;
    }
  };

  private accept = () => {
    const editor = this.editorConsumer.value as Editor<AiExtension> | undefined;
    if (!editor || !this.state) return;
    editor.commands.acceptAiDiffFragment(this.state.diffId, this.state.changeIndex);
    this.state = null;
  };

  private reject = () => {
    const editor = this.editorConsumer.value as Editor<AiExtension> | undefined;
    if (!editor || !this.state) return;
    editor.commands.rejectAiDiffFragment(this.state.diffId, this.state.changeIndex);
    this.state = null;
  };

  override render() {
    return html`
      <div
        ${ref(this.popoverRef)}
        popover="auto"
        @toggle=${this.onToggle}
        style="position: fixed;"
        class="ai-check-fragment-popover flex gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 shadow"
      >
        ${this.state
          ? html`
              <button
                type="button"
                @click=${this.accept}
                class="px-2 py-0.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
              >
                Accept
              </button>
              <button
                type="button"
                @click=${this.reject}
                class="px-2 py-0.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              >
                Reject
              </button>
            `
          : nothing}
      </div>
    `;
  }
}

export function registerLitAiCheckFragmentPopover() {
  if (customElements.get('lit-ai-check-fragment-popover')) return;
  customElements.define('lit-ai-check-fragment-popover', LitAiCheckFragmentPopover);
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-ai-check-fragment-popover': LitAiCheckFragmentPopover;
  }
}

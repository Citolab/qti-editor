/**
 * QTI Composer Editor Example
 *
 * This file demonstrates how to provide item context and use
 * the QtiComposer component in a Lit application.
 *
 * The composer accepts an `eventTarget` property. When set, it listens
 * for `qti:content:change` events (emitted by `qtiEditorEventsExtension`)
 * and automatically converts the HTML to XML-compatible format, parses it,
 * and updates `itemContext.itemBody`.
 */

import '@qti-editor/ui/components/blocks/composer';

import { provide } from '@lit/context';
import { createRef, ref } from 'lit/directives/ref.js';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { itemContext, type ItemContext } from '@qti-editor/qti-editor-kit/item-context';

import type { QtiComposer } from '@qti-editor/ui/components/blocks/composer';

/**
 * Example provider component that wraps the QtiComposer.
 * In a real application, you would provide the itemContext from
 * your editor state or data layer and pass an eventTarget from
 * the editor events extension.
 */
@customElement('qti-composer-provider')
export class QtiComposerProvider extends LitElement {
  @provide({ context: itemContext })
  @state()
  public itemCtx: ItemContext = {
    identifier: 'example-item',
    title: 'Example Assessment Item',
    variables: [],
    itemBody: undefined,
  };

  private composerRef = createRef<QtiComposer>();

  /**
   * Set this to the same EventTarget passed to `qtiEditorEventsExtension`.
   * The composer will listen for `qti:content:change` and update itemBody automatically.
   */
  public editorEventsTarget: EventTarget | null = null;

  override createRenderRoot() {
    return this;
  }

  public updateItemContext(ctx: Partial<ItemContext>) {
    this.itemCtx = { ...this.itemCtx, ...ctx };
  }

  override updated() {
    if (this.composerRef.value && this.editorEventsTarget) {
      this.composerRef.value.eventTarget = this.editorEventsTarget;
    }
  }

  override render() {
    return html`
      <div class="qti-composer-wrapper">
        <qti-composer ${ref(this.composerRef)}></qti-composer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer-provider': QtiComposerProvider;
  }
}

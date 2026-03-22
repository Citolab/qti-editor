/**
 * QTI Composer Editor Example
 *
 * This file demonstrates how to provide item context and use
 * the QtiComposer component in a Lit application.
 */

import '@qti-editor/ui/components/blocks/composer';

import { provide } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { itemContext, type ItemContext } from '@qti-editor/qti-editor-kit/item-context';

/**
 * Example provider component that wraps the QtiComposer.
 * In a real application, you would provide the itemContext from
 * your editor state or data layer.
 */
@customElement('qti-composer-provider')
export class QtiComposerProvider extends LitElement {
  /**
   * The item context to provide to child components.
   * Update this when your item data changes.
   */
  @provide({ context: itemContext })
  @state()
  public itemCtx: ItemContext = {
    identifier: 'example-item',
    title: 'Example Assessment Item',
    variables: [],
    itemBody: undefined,
  };

  override createRenderRoot() {
    return this;
  }

  /**
   * Updates the item context. Call this when your item data changes.
   */
  public updateItemContext(ctx: Partial<ItemContext>) {
    this.itemCtx = { ...this.itemCtx, ...ctx };
  }

  override render() {
    return html`
      <div class="qti-composer-wrapper">
        <qti-composer></qti-composer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer-provider': QtiComposerProvider;
  }
}

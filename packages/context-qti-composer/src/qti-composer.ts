import { consume } from '@lit/context';
import { itemContext, type ItemContext } from '@qti-editor/context-qti-assessment-item';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { formatXml } from './utils';
import { buildAssessmentItemXml } from './qti-from-item-context';

@customElement('qti-composer')
export class QtiComposer extends LitElement {
  @consume({ context: itemContext, subscribe: true })
  @state()
  public itemContext?: ItemContext;
  #formattedXml: string = '';

  override createRenderRoot() {
    return this;
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has('itemContext')) {
      const detail = buildAssessmentItemXml(this.itemContext);
      this.#formattedXml = formatXml(detail);
    }
  }

  override render() {
    return html`
      <h3 class="text-sm font-semibold mb-2">Composer XML</h3>
      <section class="card border border-base-300/50 bg-base-100 p-4">
        <pre class="m-0 max-h-80 overflow-auto text-xs">${this.#formattedXml}</pre>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer': QtiComposer;
  }
}

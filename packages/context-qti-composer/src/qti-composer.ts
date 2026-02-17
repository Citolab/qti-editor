import { consume } from '@lit/context';
import { itemContext, type ItemContext } from '@qti-editor/context-qti-assessment-item';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('qti-composer')
export class QtiComposer extends LitElement {
  @consume({ context: itemContext, subscribe: true })
  public itemContext?: ItemContext;

  override createRenderRoot() {
    return this;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('itemContext')) {
      // Log or inspect the new value of itemContext
      // You can replace this with any other logic as needed
      console.log('itemContext updated:', this.itemContext);
    }
  }

  formatXml(xml: string): string {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    let pad = 0;

    xml = xml.replace(reg, '$1\n$2$3');
    return xml
      .split('\n')
      .map(node => {
        let indent = 0;
        if (node.match(/^<\/\w/)) pad -= 1;
        indent = pad;
        if (node.match(/^<\w[^>]*[^\/]>.*$/)) pad += 1;
        return PADDING.repeat(indent) + node;
      })
      .join('\n');
  }

  override render() {
    const detail = this.itemContext?.itemBody ? new XMLSerializer().serializeToString(this.itemContext.itemBody) : '';
    const formattedXml = this.formatXml(detail);

    return html`
      <h3 class="text-sm font-semibold mb-2">Composer XML</h3>
      <section class="card border border-base-300/50 bg-base-100 p-4">
        <pre class="m-0 max-h-80 overflow-auto text-xs">${formattedXml}</pre>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer': QtiComposer;
  }
}

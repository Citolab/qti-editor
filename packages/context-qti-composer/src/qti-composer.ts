import { consume } from '@lit/context';
import { itemContext, type ItemContext } from '@qti-editor/context-qti-assessment-item';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { buildCodeDetailFromItemContext } from './prosemirror-to-xml.js';

@customElement('qti-composer')
export class QtiComposer extends LitElement {

  @consume({ context: itemContext, subscribe: true })
  public assessmentItemContext?: ItemContext;

  override createRenderRoot() {
    return this;
  }

  override render() {
    const detail = buildCodeDetailFromItemContext(this.assessmentItemContext);
    const formattedXml = this.formatXml(detail.xml);
    return html`
      <section class="card border border-base-300/50 bg-base-100 p-4">
        <h3 class="text-sm font-semibold mb-2">Composer XML</h3>
        <pre class="m-0 max-h-80 overflow-auto text-xs">${formattedXml}</pre>
      </section>
    `;
  }

  private formatXml(xml: string): string {
    let formatted = '';
    let indent = 0;
    const indentStr = '  ';
    const parts = xml.split(/(<[^>]+>)/g).filter(part => part.trim());

    for (const part of parts) {
      if (part.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += indentStr.repeat(indent) + part + '\n';
        continue;
      }

      if (part.startsWith('<') && !part.endsWith('/>')) {
        formatted += indentStr.repeat(indent) + part + '\n';
        indent++;
        continue;
      }

      if (part.startsWith('<') && part.endsWith('/>')) {
        formatted += indentStr.repeat(indent) + part + '\n';
        continue;
      }

      formatted += indentStr.repeat(indent) + part.trim() + '\n';
    }

    return formatted.trim();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-composer': QtiComposer;
  }
}

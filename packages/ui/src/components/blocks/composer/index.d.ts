import { LitElement } from 'lit';
import { buildAssessmentItemXml, extractResponseDeclarations, formatXml, type ComposerItemContext, type ResponseDeclaration } from '@qti-editor/qti-core/composer';
import { type ItemContext } from '@qti-editor/qti-editor-kit/item-context';
export declare class QtiComposer extends LitElement {
    #private;
    itemContext?: ItemContext;
    private liveComposeEnabled;
    createRenderRoot(): this;
    willUpdate(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
}
export { buildAssessmentItemXml, extractResponseDeclarations, formatXml };
export type { ComposerItemContext, ResponseDeclaration };
declare global {
    interface HTMLElementTagNameMap {
        'qti-composer': QtiComposer;
    }
}
//# sourceMappingURL=index.d.ts.map
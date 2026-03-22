import { LitElement, type TemplateResult } from 'lit';
import { type Extension } from 'prosekit/core';
import { qtiCodePanelExtension, type QtiCodePanelOptions, type QtiCodeUpdateDetail, type QtiDocumentJson, type QtiNodeJson } from '@qti-editor/qti-editor-kit/code';
export interface CodePanelExtensionOptions extends QtiCodePanelOptions {
}
type CodeMode = 'html' | 'json' | 'xml';
export declare class QtiCodePanel extends LitElement {
    private _eventName;
    private _eventTarget;
    private _mode;
    private currentEventTarget;
    private detail;
    get eventName(): string;
    set eventName(value: string);
    get eventTarget(): EventTarget | null;
    set eventTarget(value: EventTarget | null);
    get mode(): CodeMode;
    set mode(value: CodeMode);
    private readonly onUpdateEvent;
    createRenderRoot(): this;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private updateEventListener;
    private getEventTarget;
    private renderToolbar;
    render(): TemplateResult<1>;
    private formatHtml;
}
export declare function defineExtension(options?: CodePanelExtensionOptions): Extension;
export { qtiCodePanelExtension };
export type { QtiCodePanelOptions, QtiCodeUpdateDetail, QtiDocumentJson, QtiNodeJson, };
declare global {
    interface HTMLElementTagNameMap {
        'qti-code-panel': QtiCodePanel;
    }
}
//# sourceMappingURL=index.d.ts.map
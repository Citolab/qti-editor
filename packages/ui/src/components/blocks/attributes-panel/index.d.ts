import { type TemplateResult } from 'lit';
import { type Extension } from 'prosekit/core';
import { type ChoiceInteractionClassGroupId } from '@qti-editor/interaction-choice';
import { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs, type QtiAttributesOptions, type QtiAttributesTrigger, type QtiAttributesTriggerContext, type SidePanelEventDetail, type SidePanelNodeDetail } from '@qti-editor/core/attributes';
import { ProsekitAttributesPanel } from '@qti-editor/prosemirror-attributes-ui-prosekit';
type ChoiceInteractionOptionPresentation = {
    label?: string;
    tooltip?: string;
    icon?: string;
};
type ChoiceInteractionGroupPresentation = {
    title?: string;
    tooltip?: string;
};
export interface ChoiceInteractionPanelPresentation {
    groups?: Partial<Record<ChoiceInteractionClassGroupId, ChoiceInteractionGroupPresentation>>;
    options?: Partial<Record<string, ChoiceInteractionOptionPresentation>>;
}
export interface AttributesPanelExtensionOptions extends QtiAttributesOptions {
}
export declare class QtiAttributesPanel extends ProsekitAttributesPanel {
    static styles: import("lit").CSSResultGroup[];
    choiceInteractionPresentation: ChoiceInteractionPanelPresentation | null;
    constructor();
    protected renderPanel(): TemplateResult;
    private renderFriendlyEditor;
    private renderChoiceInteractionClassEditor;
    private getSelectedGroupValue;
    private renderChoiceInteractionBooleanOption;
    private updateChoiceInteractionClass;
    private updateChoiceInteractionBoolean;
    private updateChoiceInteractionAttrs;
}
export declare function defineExtension(options?: AttributesPanelExtensionOptions): Extension;
export { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs };
export type { QtiAttributesOptions, QtiAttributesTrigger, QtiAttributesTriggerContext, SidePanelEventDetail, SidePanelNodeDetail, };
declare global {
    interface HTMLElementTagNameMap {
        'qti-attributes-panel': QtiAttributesPanel;
    }
}
//# sourceMappingURL=index.d.ts.map
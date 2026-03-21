import { customElement } from 'lit/decorators.js';

import {
  PmAttributesPanel,
  type AttributesEventDetail,
  type AttributesNodeDetail,
  type AttributesFieldMetadata,
  type AttributesMetadataResolver,
  type AttributesPanelMetadata,
} from '@qti-editor/prosemirror-attributes-ui';

export type SidePanelEventDetail = AttributesEventDetail;
export type SidePanelNodeDetail = AttributesNodeDetail;

export {
  QtiAttributesPanelBase,
  type AttributesEventDetail,
  type AttributesNodeDetail,
  type AttributesFieldMetadata,
  type AttributesMetadataResolver,
  type AttributesPanelMetadata,
};

/**
 * Compatibility wrapper around the canonical ProseMirror attributes UI.
 *
 * This keeps the historical `@qti-editor/lit` surface available while the
 * real implementation lives in `@qti-editor/prosemirror-attributes-ui`.
 */
@customElement('qti-attributes-panel-base')
class QtiAttributesPanelBase extends PmAttributesPanel {
  constructor() {
    super();
    this.eventName = 'qti:attributes:update';
    this.changeEventName = 'qti:attributes:change';
  }

  override createRenderRoot() {
    return this;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-attributes-panel-base': QtiAttributesPanelBase;
  }
}

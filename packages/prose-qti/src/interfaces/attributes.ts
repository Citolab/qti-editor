/**
 * Types for the attributes panel — unified across the PM plugin and UI layer.
 *
 * Pure TypeScript — no runtime dependencies.
 */

export interface AttributeFriendlyEditorDefinition {
  attribute: string;
  /** Discriminant used by the panel to select a custom editor component. */
  kind: string;
  config?: unknown;
}

export interface NodeAttributePanelMetadata {
  nodeTypeName: string;
  /**
   * Attributes the user may edit. Every attribute NOT listed here is shown
   * disabled (a "system attribute" — derived, computed, or otherwise managed
   * by the editor rather than by hand). The control type is inferred from the
   * attribute's runtime value type: boolean → checkbox, number → number
   * input, anything else → text input. Hosts that need richer editing for an
   * attribute supply a {@link AttributeFriendlyEditorDefinition} instead.
   */
  editableAttributes?: readonly string[];
  /** Custom editor components to render in place of the generic field list. */
  friendlyEditors?: readonly AttributeFriendlyEditorDefinition[];
}

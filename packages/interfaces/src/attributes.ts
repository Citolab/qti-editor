/**
 * Types for the attributes panel — unified across the PM plugin and UI layer.
 *
 * Pure TypeScript — no runtime dependencies.
 */

export interface AttributeFieldOption {
  value: string;
  label: string;
}

export interface AttributeFieldDefinition {
  label?: string;
  input?: 'text' | 'number' | 'checkbox' | 'select';
  options?: AttributeFieldOption[];
  readOnly?: boolean;
}

export interface AttributeFriendlyEditorDefinition {
  attribute: string;
  /** Discriminant used by the panel to select a custom editor component. */
  kind: string;
  config?: unknown;
}

export interface NodeAttributePanelMetadata {
  nodeTypeName: string;
  /** Attributes the user may edit. All others are shown as read-only. */
  editableAttributes?: readonly string[];
  /** Attributes hidden from the panel entirely. */
  hiddenAttributes?: readonly string[];
  /** Custom editor components to render in place of a plain text field. */
  friendlyEditors?: readonly AttributeFriendlyEditorDefinition[];
  /** Per-attribute field overrides (label, input type, options). */
  fields?: Record<string, AttributeFieldDefinition>;
}

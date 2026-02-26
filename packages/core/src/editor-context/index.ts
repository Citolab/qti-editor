/**
 * Editor Context
 *
 * Shared Lit context for coordinating editor state across components.
 * Provides types and context for attributes panel, code panel, and editor view.
 */

import { createContext } from '@lit/context';

/**
 * Detail for a single node in the attributes panel.
 */
export interface QtiContextNodeDetail {
  type: string;
  attrs: Record<string, unknown>;
  pos: number;
}

/**
 * State for the attributes panel.
 */
export interface QtiContextAttributesDetail {
  nodes: QtiContextNodeDetail[];
  activeNode: QtiContextNodeDetail | null;
  open: boolean;
}

/**
 * State for the code panel (JSON, HTML, XML views).
 */
export interface QtiContextCodeDetail {
  json: Record<string, unknown>;
  html: string;
  xml: string;
  timestamp: number;
}

/**
 * Minimal editor view interface for context sharing.
 */
export interface QtiContextEditorView {
  state: unknown;
  dispatch: (tr: unknown) => void;
  dom?: ParentNode | null;
}

/**
 * Combined editor context value shared across components.
 */
export interface QtiEditorContextValue {
  attributes: QtiContextAttributesDetail;
  code: QtiContextCodeDetail | null;
  editorView: QtiContextEditorView | null;
}

/**
 * Default empty attributes detail state.
 */
export const EMPTY_QTI_ATTRIBUTES_DETAIL: QtiContextAttributesDetail = {
  nodes: [],
  activeNode: null,
  open: false,
};

/**
 * Lit context for sharing QTI editor state across components.
 * Use with @provide/@consume decorators from @lit/context.
 */
export const qtiEditorContext = createContext<QtiEditorContextValue>('qti-editor/context');

/**
 * Editor Context
 *
 * Shared Lit context for coordinating editor state across components.
 * Provides types and context for attributes panel, code panel, and editor view.
 */

import { createContext } from '@lit/context';

export interface QtiContextNodeDetail {
  type: string;
  attrs: Record<string, unknown>;
  pos: number;
}

export interface QtiContextAttributesDetail {
  nodes: QtiContextNodeDetail[];
  activeNode: QtiContextNodeDetail | null;
  open: boolean;
}

export interface QtiContextCodeDetail {
  json: Record<string, unknown>;
  html: string;
  xml: string;
  timestamp: number;
}

export interface QtiContextEditorView {
  state: unknown;
  dispatch: (tr: unknown) => void;
  dom?: ParentNode | null;
}

export interface QtiEditorContextValue {
  attributes: QtiContextAttributesDetail;
  code: QtiContextCodeDetail | null;
  editorView: QtiContextEditorView | null;
}

export const EMPTY_QTI_ATTRIBUTES_DETAIL: QtiContextAttributesDetail = {
  nodes: [],
  activeNode: null,
  open: false,
};

export const qtiEditorContext = createContext<QtiEditorContextValue>('qti-editor/context');
